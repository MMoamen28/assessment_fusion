import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { resetDb, createUser, createComplaint as createDbComplaint } from "../helpers/db";
import { eventBus, type RealtimeEvent } from "@/lib/realtime/bus";
import {
  createComplaint,
  claimComplaint,
  assignComplaint,
  changeStatus,
  changePriority,
} from "@/lib/services/complaints";
import { addComment } from "@/lib/services/comments";
import { addComplainantComment } from "@/lib/services/public";
import { createSession } from "@/lib/auth/session";
import * as cookieModule from "@/lib/auth/cookie";
import { GET as getStaffEvents } from "@/app/api/events/route";
import { GET as getPublicEvents, publicStreamLimiter } from "@/app/api/public/complaints/[token]/events/route";
import { ConflictError } from "@/lib/errors";

describe("Realtime Events Integration", () => {
  let publishedEvents: RealtimeEvent[] = [];
  let unsubscribeAll: (() => void) | null = null;
  let activeToken: string | null = null;

  beforeEach(async () => {
    await resetDb();
    eventBus.reset();
    publicStreamLimiter.reset();
    publishedEvents = [];
    activeToken = null;
    vi.spyOn(cookieModule, "readSessionCookie").mockImplementation(async () => activeToken);

    unsubscribeAll = eventBus.subscribe(undefined, (event) => {
      publishedEvents.push(event);
    });
  });

  afterEach(() => {
    if (unsubscribeAll) {
      unsubscribeAll();
      unsubscribeAll = null;
    }
  });

  describe("Service Post-Commit Publishing", () => {
    it("publishes 'complaint.created' with publicVisible false on createComplaint", async () => {
      const res = await createComplaint({
        title: "Realtime Created Complaint",
        description: "Valid description exceeding ten characters",
        category: "Service",
        submitterName: "John Citizen",
        submitterEmail: "john@example.com",
      });

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "complaint.created",
        complaintId: res.id,
        publicVisible: false,
      });
    });

    it("publishes 'complaint.updated' with publicVisible true on claimComplaint", async () => {
      const agent = await createUser({ role: "AGENT" });
      const complaint = await createDbComplaint({ status: "OPEN" });
      publishedEvents = [];

      await claimComplaint(agent, complaint.id);

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "complaint.updated",
        complaintId: complaint.id,
        publicVisible: true,
      });
    });

    it("publishes 'complaint.updated' with publicVisible true on assignComplaint when opening, and false when already in review", async () => {
      const admin = await createUser({ role: "ADMIN" });
      const agent1 = await createUser({ role: "AGENT" });
      const agent2 = await createUser({ role: "AGENT" });

      // 1. OPEN complaint assigned -> isOpening is true
      const openComplaint = await createDbComplaint({ status: "OPEN" });
      publishedEvents = [];

      await assignComplaint(admin, openComplaint.id, agent1.id, 0);

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "complaint.updated",
        complaintId: openComplaint.id,
        publicVisible: true,
      });

      // 2. IN_REVIEW reassigned -> isOpening is false
      publishedEvents = [];
      await assignComplaint(admin, openComplaint.id, agent2.id, 1);

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "complaint.updated",
        complaintId: openComplaint.id,
        publicVisible: false,
      });
    });

    it("publishes 'complaint.updated' on changeStatus and changePriority", async () => {
      const agent = await createUser({ role: "AGENT" });
      const complaint = await createDbComplaint({
        status: "IN_REVIEW",
        assigneeId: agent.id,
        priority: "MEDIUM",
        version: 0,
      });
      publishedEvents = [];

      // changeStatus
      await changeStatus(agent, complaint.id, {
        status: "RESOLVED",
        expectedVersion: 0,
      });

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "complaint.updated",
        complaintId: complaint.id,
        publicVisible: true,
      });

      // changePriority
      publishedEvents = [];
      await changePriority(agent, complaint.id, {
        priority: "HIGH",
        expectedVersion: 1,
      });

      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "complaint.updated",
        complaintId: complaint.id,
        publicVisible: true,
      });
    });

    it("publishes 'comment.added' with publicVisible !isInternal for staff comments, and true for complainant reply", async () => {
      const agent = await createUser({ role: "AGENT" });
      const complaint = await createDbComplaint({
        status: "IN_REVIEW",
        assigneeId: agent.id,
      });
      publishedEvents = [];

      // Internal staff comment
      await addComment(agent, complaint.id, {
        body: "Confidential staff note",
        internal: true,
      });
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "comment.added",
        complaintId: complaint.id,
        publicVisible: false,
      });

      // Public staff comment
      publishedEvents = [];
      await addComment(agent, complaint.id, {
        body: "Public update for citizen",
        internal: false,
      });
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "comment.added",
        complaintId: complaint.id,
        publicVisible: true,
      });

      // Complainant reply
      publishedEvents = [];
      await addComplainantComment(complaint.publicToken, "Complainant response");
      expect(publishedEvents).toHaveLength(1);
      expect(publishedEvents[0]).toMatchObject({
        type: "comment.added",
        complaintId: complaint.id,
        publicVisible: true,
      });
    });

    it("publishes NOTHING on failed claim or failed status change", async () => {
      const agent1 = await createUser({ role: "AGENT" });
      const agent2 = await createUser({ role: "AGENT" });
      const complaint = await createDbComplaint({ status: "OPEN" });

      await claimComplaint(agent1, complaint.id);
      publishedEvents = [];

      // Second claim fails
      await expect(claimComplaint(agent2, complaint.id)).rejects.toThrow(ConflictError);
      expect(publishedEvents).toHaveLength(0);

      // Status change with stale expectedVersion fails
      await expect(
        changeStatus(agent1, complaint.id, {
          status: "RESOLVED",
          expectedVersion: 999,
        }),
      ).rejects.toThrow(ConflictError);
      expect(publishedEvents).toHaveLength(0);
    });
  });

  describe("SSE Route Handlers", () => {
    it("returns 401 on staff stream without active session", async () => {
      activeToken = null;
      const req = new Request("http://localhost:3000/api/events");
      const res = await getStaffEvents(req);
      expect(res.status).toBe(401);
    });

    it("connects to staff stream with session and receives published event", async () => {
      const agent = await createUser({ role: "AGENT" });
      const session = await createSession(agent.id);
      activeToken = session.token;

      const abortController = new AbortController();
      const req = new Request("http://localhost:3000/api/events", {
        signal: abortController.signal,
      });

      const res = await getStaffEvents(req);
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      const reader = res.body?.getReader();
      expect(reader).toBeTruthy();

      const decoder = new TextDecoder();
      // Read initial "event: ready" chunk
      const firstChunk = await reader!.read();
      expect(decoder.decode(firstChunk.value)).toContain("event: ready");

      // Publish an event while connected
      eventBus.publish({
        type: "complaint.created",
        complaintId: "test-cmp-sse",
        publicVisible: false,
        at: new Date().toISOString(),
      });

      // Read next chunk
      const secondChunk = await reader!.read();
      const secondText = decoder.decode(secondChunk.value);
      expect(secondText).toContain("event: message");
      expect(secondText).toContain("test-cmp-sse");

      abortController.abort();
    });

    it("returns 404 on public stream for unknown token", async () => {
      const req = new Request("http://localhost:3000/api/public/complaints/unknown-token/events");
      const res = await getPublicEvents(req, {
        params: Promise.resolve({ token: "unknown-token" }),
      });
      expect(res.status).toBe(404);
    });

    it("public stream receives status change event and DOES NOT receive internal comment event", async () => {
      const complaint = await createDbComplaint({ status: "IN_REVIEW" });

      const abortController = new AbortController();
      const req = new Request(
        `http://localhost:3000/api/public/complaints/${complaint.publicToken}/events`,
        { signal: abortController.signal },
      );

      const res = await getPublicEvents(req, {
        params: Promise.resolve({ token: complaint.publicToken }),
      });
      expect(res.status).toBe(200);

      const reader = res.body?.getReader();
      expect(reader).toBeTruthy();

      const decoder = new TextDecoder();
      // Ready chunk
      const readyChunk = await reader!.read();
      expect(decoder.decode(readyChunk.value)).toContain("event: ready");

      // 1. Publish internal comment on this complaint (publicVisible: false)
      eventBus.publish({
        type: "comment.added",
        complaintId: complaint.id,
        publicVisible: false,
        at: new Date().toISOString(),
      });

      // 2. Publish status change on this complaint (publicVisible: true)
      eventBus.publish({
        type: "complaint.updated",
        complaintId: complaint.id,
        publicVisible: true,
        at: new Date().toISOString(),
      });

      // The next chunk received should be the public event, NOT the internal comment
      const eventChunk = await reader!.read();
      const eventText = decoder.decode(eventChunk.value);
      expect(eventText).toContain('{"type":"changed"}');
      expect(eventText).not.toContain("comment.added");

      abortController.abort();
    });
  });
});
