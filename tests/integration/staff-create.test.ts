import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, createUser } from "../helpers/db";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import * as cookieModule from "@/lib/auth/cookie";
import { POST as postStaffComplaint } from "@/app/api/complaints/route";
import { POST as postPublicComplaint } from "@/app/api/complaints/public/route";
import { createComplaint } from "@/lib/services/complaints";

describe("Staff Complaint Creation Integration", () => {
  let activeToken: string | null = null;

  beforeEach(async () => {
    await resetDb();
    activeToken = null;
    vi.spyOn(cookieModule, "readSessionCookie").mockImplementation(async () => activeToken);
  });

  it("allows agent to create a complaint via POST /api/complaints with channel 'staff'", async () => {
    const agent = await createUser({
      name: "Agent Smith",
      email: "smith@example.com",
      role: "AGENT",
    });
    const session = await createSession(agent.id);
    activeToken = session.token;

    const req = new Request("http://localhost:3000/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Alice Citizen",
        submitterEmail: "alice@example.com",
        category: "Billing",
        priority: "HIGH",
        title: "Staff Created Ticket",
        description: "This is a detailed description created by staff on behalf of complainant.",
      }),
    });

    const res = await postStaffComplaint(req, {});
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.id).toBeTruthy();
    expect(json.reference).toMatch(/^CMP-[A-HJ-NP-Z2-9]{6}$/);
    expect(json.publicToken).toBeTruthy();

    const inDb = await prisma.complaint.findUnique({
      where: { id: json.id },
    });
    expect(inDb).not.toBeNull();
    expect(inDb?.status).toBe("OPEN");
    expect(inDb?.priority).toBe("HIGH");
    expect(inDb?.assigneeId).toBeNull();
    expect(inDb?.version).toBe(0);

    const activities = await prisma.activity.findMany({
      where: { complaintId: json.id },
    });
    expect(activities).toHaveLength(1);
    expect(activities[0].action).toBe("CREATED");
    expect(activities[0].actorId).toBe(agent.id);
    expect(activities[0].metadata).toEqual({ channel: "staff" });
  });

  it("allows admin to create a complaint with default MEDIUM priority", async () => {
    const admin = await createUser({
      name: "Admin Boss",
      email: "boss@example.com",
      role: "ADMIN",
    });
    const session = await createSession(admin.id);
    activeToken = session.token;

    const req = new Request("http://localhost:3000/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Bob Citizen",
        submitterEmail: "bob@example.com",
        category: "Service",
        title: "Admin Created Ticket",
        description: "This is another detailed description created by admin.",
      }),
    });

    const res = await postStaffComplaint(req, {});
    expect(res.status).toBe(201);

    const json = await res.json();
    const inDb = await prisma.complaint.findUnique({
      where: { id: json.id },
    });
    expect(inDb?.priority).toBe("MEDIUM");

    const activities = await prisma.activity.findMany({
      where: { complaintId: json.id },
    });
    expect(activities[0].actorId).toBe(admin.id);
    expect(activities[0].metadata).toEqual({ channel: "staff" });
  });

  it("rejects unauthenticated POST /api/complaints with 401", async () => {
    activeToken = null;

    const req = new Request("http://localhost:3000/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Unauth User",
        submitterEmail: "unauth@example.com",
        category: "Delivery",
        title: "Unauth Ticket",
        description: "This should fail due to missing session.",
      }),
    });

    const res = await postStaffComplaint(req, {});
    expect(res.status).toBe(401);
  });

  it("rejects invalid category and invalid email with 400", async () => {
    const agent = await createUser({ role: "AGENT" });
    const session = await createSession(agent.id);
    activeToken = session.token;

    // Bad category
    const badCatReq = new Request("http://localhost:3000/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Valid Name",
        submitterEmail: "valid@example.com",
        category: "NonExistentCategory",
        title: "Valid Title",
        description: "Valid description exceeding ten characters",
      }),
    });
    const badCatRes = await postStaffComplaint(badCatReq, {});
    expect(badCatRes.status).toBe(400);

    // Bad email
    const badEmailReq = new Request("http://localhost:3000/api/complaints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submitterName: "Valid Name",
        submitterEmail: "not-an-email",
        category: "Service",
        title: "Valid Title",
        description: "Valid description exceeding ten characters",
      }),
    });
    const badEmailRes = await postStaffComplaint(badEmailReq, {});
    expect(badEmailRes.status).toBe(400);
  });

  it("ensures public path records actorId null and channel 'public'", async () => {
    const req = new Request("http://localhost:3000/api/complaints/public", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "10.0.0.88",
      },
      body: JSON.stringify({
        submitterName: "Public Submitter",
        submitterEmail: "public@example.com",
        category: "Product",
        title: "Public Direct Submission",
        description: "Public user submitting their own ticket directly.",
      }),
    });

    const res = await postPublicComplaint(req, {});
    expect(res.status).toBe(201);

    const json = await res.json();
    const inDb = await prisma.complaint.findUnique({
      where: { reference: json.reference },
    });

    const activities = await prisma.activity.findMany({
      where: { complaintId: inDb!.id },
    });
    expect(activities).toHaveLength(1);
    expect(activities[0].action).toBe("CREATED");
    expect(activities[0].actorId).toBeNull();
    expect(activities[0].metadata).toEqual({ channel: "public" });
  });

  it("service directly accepts options and defaults to public without actor", async () => {
    const result = await createComplaint({
      title: "Service Direct Test",
      description: "Direct service invocation exceeding ten characters",
      category: "Other",
      submitterName: "Direct Submitter",
      submitterEmail: "direct@example.com",
    });

    const inDb = await prisma.complaint.findUnique({
      where: { reference: result.reference },
    });
    const activities = await prisma.activity.findMany({
      where: { complaintId: inDb!.id },
    });
    expect(activities[0].actorId).toBeNull();
    expect(activities[0].metadata).toEqual({ channel: "public" });
  });
});
