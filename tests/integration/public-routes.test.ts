import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createComplaint } from "../helpers/db";
import { POST as postPublicComplaint, publicSubmitLimiter } from "@/app/api/complaints/public/route";
import { POST as postPublicLookup, lookupLimiter } from "@/app/api/public/lookup/route";
import { POST as postComplainantReply, replyLimiter } from "@/app/api/public/complaints/[token]/comments/route";

describe("Public Route Handlers", () => {
  beforeEach(async () => {
    await resetDb();
    publicSubmitLimiter.reset();
    lookupLimiter.reset();
    replyLimiter.reset();
  });

  describe("POST /api/complaints/public", () => {
    it("returns 201 with reference and publicToken on valid input", async () => {
      const req = new Request("http://localhost:3000/api/complaints/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.1",
        },
        body: JSON.stringify({
          submitterName: "Jane Citizen",
          submitterEmail: "jane.citizen@example.com",
          category: "Service",
          title: "Public Route Test Ticket",
          description: "This is a sufficiently long description for valid submission.",
        }),
      });

      const res = await postPublicComplaint(req, {});
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.reference).toMatch(/^CMP-[A-Z2-9]{6}$/);
      expect(json.publicToken).toBeTruthy();
    });

    it("returns 400 on invalid email", async () => {
      const req = new Request("http://localhost:3000/api/complaints/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.2",
        },
        body: JSON.stringify({
          submitterName: "Jane Citizen",
          submitterEmail: "not-an-email",
          category: "Service",
          title: "Bad Email Ticket",
          description: "This is a sufficiently long description for valid submission.",
        }),
      });

      const res = await postPublicComplaint(req, {});
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 429 with Retry-After when rate-limited", async () => {
      const ip = "198.51.100.3";

      for (let i = 0; i < 5; i++) {
        const req = new Request("http://localhost:3000/api/complaints/public", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({
            submitterName: "Jane Citizen",
            submitterEmail: `jane.${i}@example.com`,
            category: "Service",
            title: `Rate Limit Ticket ${i}`,
            description: "This is a sufficiently long description for valid submission.",
          }),
        });
        const res = await postPublicComplaint(req, {});
        expect(res.status).toBe(201);
      }

      // 6th request triggers rate limit
      const blockedReq = new Request("http://localhost:3000/api/complaints/public", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          submitterName: "Jane Citizen",
          submitterEmail: "jane.blocked@example.com",
          category: "Service",
          title: "Blocked Rate Limit Ticket",
          description: "This is a sufficiently long description for valid submission.",
        }),
      });

      const blockedRes = await postPublicComplaint(blockedReq, {});
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();

      const json = await blockedRes.json();
      expect(json.error.code).toBe("RATE_LIMITED");
    });
  });

  describe("POST /api/public/lookup", () => {
    it("returns 200 with publicToken on valid lookup", async () => {
      const complaint = await createComplaint({
        submitterEmail: "lookup.target@example.com",
      });

      const req = new Request("http://localhost:3000/api/public/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.10",
        },
        body: JSON.stringify({
          reference: complaint.reference,
          email: "LOOKUP.TARGET@EXAMPLE.COM",
        }),
      });

      const res = await postPublicLookup(req, {});
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.publicToken).toBe(complaint.publicToken);
    });

    it("returns 404 on reference/email mismatch", async () => {
      const complaint = await createComplaint({
        submitterEmail: "lookup.real@example.com",
      });

      const req = new Request("http://localhost:3000/api/public/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "198.51.100.11",
        },
        body: JSON.stringify({
          reference: complaint.reference,
          email: "wrong.email@example.com",
        }),
      });

      const res = await postPublicLookup(req, {});
      expect(res.status).toBe(404);

      const json = await res.json();
      expect(json.error.code).toBe("NOT_FOUND");
    });

    it("returns 429 when rate-limited after 10 requests", async () => {
      const ip = "198.51.100.12";

      for (let i = 0; i < 10; i++) {
        const req = new Request("http://localhost:3000/api/public/lookup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({
            reference: `CMP-XYZ${i}`,
            email: `attempt.${i}@example.com`,
          }),
        });
        const res = await postPublicLookup(req, {});
        expect([200, 404]).toContain(res.status);
      }

      // 11th request triggers rate limit
      const blockedReq = new Request("http://localhost:3000/api/public/lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": ip,
        },
        body: JSON.stringify({
          reference: "CMP-BLOCKED",
          email: "blocked@example.com",
        }),
      });

      const blockedRes = await postPublicLookup(blockedReq, {});
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
    });
  });

  describe("POST /api/public/complaints/[token]/comments", () => {
    it("returns 201 on successful complainant reply", async () => {
      const complaint = await createComplaint({ status: "OPEN" });

      const req = new Request(
        `http://localhost:3000/api/public/complaints/${complaint.publicToken}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "198.51.100.20",
          },
          body: JSON.stringify({
            body: "Here is an update regarding my issue.",
          }),
        },
      );

      const res = await postComplainantReply(req, {
        params: Promise.resolve({ token: complaint.publicToken }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.body).toBe("Here is an update regarding my issue.");
      expect(json.authorRole).toBe("Complainant");
    });

    it("returns 409 when complaint is closed", async () => {
      const complaint = await createComplaint({ status: "CLOSED" });

      const req = new Request(
        `http://localhost:3000/api/public/complaints/${complaint.publicToken}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": "198.51.100.21",
          },
          body: JSON.stringify({
            body: "Attempting to reply to closed complaint.",
          }),
        },
      );

      const res = await postComplainantReply(req, {
        params: Promise.resolve({ token: complaint.publicToken }),
      });

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.code).toBe("CONFLICT");
    });

    it("returns 429 when rate-limited after 10 replies per hour per token+ip", async () => {
      const complaint = await createComplaint({ status: "OPEN" });
      const ip = "198.51.100.22";

      for (let i = 0; i < 10; i++) {
        const req = new Request(
          `http://localhost:3000/api/public/complaints/${complaint.publicToken}/comments`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-forwarded-for": ip,
            },
            body: JSON.stringify({ body: `Reply number ${i}` }),
          },
        );
        const res = await postComplainantReply(req, {
          params: Promise.resolve({ token: complaint.publicToken }),
        });
        expect(res.status).toBe(201);
      }

      // 11th request triggers rate limit
      const blockedReq = new Request(
        `http://localhost:3000/api/public/complaints/${complaint.publicToken}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": ip,
          },
          body: JSON.stringify({ body: "Blocked reply" }),
        },
      );

      const blockedRes = await postComplainantReply(blockedReq, {
        params: Promise.resolve({ token: complaint.publicToken }),
      });

      expect(blockedRes.status).toBe(429);
      expect(blockedRes.headers.get("Retry-After")).toBeTruthy();
    });
  });
});
