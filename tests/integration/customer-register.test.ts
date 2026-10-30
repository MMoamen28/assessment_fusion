import { describe, it, expect, beforeEach, vi } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import * as cookieModule from "@/lib/auth/cookie";
import { POST as registerRoute } from "@/app/api/auth/register/route";
import { GET as getComplaintsRoute } from "@/app/api/complaints/route";
import { POST as claimRoute } from "@/app/api/complaints/[id]/claim/route";
import { POST as assignRoute } from "@/app/api/complaints/[id]/assign/route";
import { POST as statusRoute } from "@/app/api/complaints/[id]/status/route";
import { POST as priorityRoute } from "@/app/api/complaints/[id]/priority/route";
import { POST as commentRoute } from "@/app/api/complaints/[id]/comments/route";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { assignComplaint } from "@/lib/services/complaints";
import { ForbiddenError } from "@/lib/errors";

function makeJsonRequest(body: unknown): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "192.168.1.100",
    },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(): Request {
  return new Request("http://localhost:3000/api/test", {
    method: "GET",
    headers: {
      "x-forwarded-for": "192.168.1.100",
    },
  });
}

describe("Customer Registration & Customer Role Isolation", () => {
  let activeToken: string | null = null;
  let lastSetCookie: { token: string; expiresAt: Date } | null = null;

  beforeEach(async () => {
    await resetDb();
    activeToken = null;
    lastSetCookie = null;
    vi.spyOn(cookieModule, "readSessionCookie").mockImplementation(async () => activeToken);
    vi.spyOn(cookieModule, "setSessionCookie").mockImplementation(async (token, expiresAt) => {
      lastSetCookie = { token, expiresAt };
    });
  });

  it("successfully registers a new customer with role CUSTOMER and sets session cookie", async () => {
    const email = "citizen@example.com";
    const password = "ValidPassword123!";
    const req = makeJsonRequest({
      name: "Jane Citizen",
      email,
      password,
    });

    const res = await registerRoute(req, {});
    expect(res.status).toBe(201);

    const body = await res.json();
    expect(body.user).toBeDefined();
    expect(body.user.name).toBe("Jane Citizen");
    expect(body.user.email).toBe(email);
    expect(body.user.role).toBe("CUSTOMER");

    // Verify session cookie was set
    expect(lastSetCookie).not.toBeNull();
    expect(lastSetCookie?.token).toBeTruthy();

    // Verify database record
    const inDb = await prisma.user.findUnique({ where: { email } });
    expect(inDb).not.toBeNull();
    expect(inDb?.role).toBe("CUSTOMER");
    expect(inDb?.name).toBe("Jane Citizen");

    // Verify password was hashed
    const valid = await verifyPassword(password, inDb!.passwordHash);
    expect(valid).toBe(true);
  });

  it("rejects duplicate email with 409 Conflict", async () => {
    await createUser({ email: "duplicate@example.com", role: "CUSTOMER" });

    const req = makeJsonRequest({
      name: "Another User",
      email: "duplicate@example.com",
      password: "Password123!",
    });

    const res = await registerRoute(req, {});
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("CONFLICT");
  });

  it("validates registration fields and returns 400 on invalid input", async () => {
    const req = makeJsonRequest({
      name: "J", // too short
      email: "not-an-email",
      password: "short", // < 8 chars
    });

    const res = await registerRoute(req, {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("forbids customer from accessing staff complaint list API", async () => {
    const customer = await createUser({ role: "CUSTOMER" });
    const { token } = await createSession(customer.id);
    activeToken = token;

    const req = makeGetRequest();
    const res = await getComplaintsRoute(req, {});
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("forbids customer from claiming complaints via API", async () => {
    const customer = await createUser({ role: "CUSTOMER" });
    const { token } = await createSession(customer.id);
    activeToken = token;

    const complaint = await createComplaint({ status: "OPEN", assigneeId: null });
    const req = makeJsonRequest({});
    const ctx = { params: Promise.resolve({ id: complaint.id }) };
    const res = await claimRoute(req, ctx);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("forbids customer from changing complaint status via API", async () => {
    const customer = await createUser({ role: "CUSTOMER" });
    const { token } = await createSession(customer.id);
    activeToken = token;

    const complaint = await createComplaint({ status: "OPEN", assigneeId: null, version: 0 });
    const req = makeJsonRequest({ status: "REJECTED", expectedVersion: 0 });
    const ctx = { params: Promise.resolve({ id: complaint.id }) };
    const res = await statusRoute(req, ctx);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("forbids customer from changing complaint priority via API", async () => {
    const customer = await createUser({ role: "CUSTOMER" });
    const { token } = await createSession(customer.id);
    activeToken = token;

    const complaint = await createComplaint({ status: "OPEN", assigneeId: null, version: 0 });
    const req = makeJsonRequest({ priority: "HIGH", expectedVersion: 0 });
    const ctx = { params: Promise.resolve({ id: complaint.id }) };
    const res = await priorityRoute(req, ctx);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("forbids customer from adding staff comments via API", async () => {
    const customer = await createUser({ role: "CUSTOMER" });
    const { token } = await createSession(customer.id);
    activeToken = token;

    const complaint = await createComplaint({ status: "OPEN", assigneeId: null });
    const req = makeJsonRequest({ body: "Internal staff note", internal: true });
    const ctx = { params: Promise.resolve({ id: complaint.id }) };
    const res = await commentRoute(req, ctx);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("forbids customer from assigning complaints via API", async () => {
    const customer = await createUser({ role: "CUSTOMER" });
    const agent = await createUser({ role: "AGENT" });
    const { token } = await createSession(customer.id);
    activeToken = token;

    const complaint = await createComplaint({ status: "OPEN", assigneeId: null, version: 0 });
    const req = makeJsonRequest({ assigneeId: agent.id, expectedVersion: 0 });
    const ctx = { params: Promise.resolve({ id: complaint.id }) };
    const res = await assignRoute(req, ctx);

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("forbids admin from assigning a complaint to a customer", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const customer = await createUser({ role: "CUSTOMER" });
    const complaint = await createComplaint({ status: "OPEN", assigneeId: null, version: 0 });

    await expect(
      assignComplaint(
        { id: admin.id, email: admin.email, name: admin.name, role: admin.role },
        complaint.id,
        customer.id,
        0,
      ),
    ).rejects.toThrow(ForbiddenError);
  });

  it("allows customer to retrieve complaints matching their submitterEmail", async () => {
    const customer = await createUser({ email: "citizen@example.com", role: "CUSTOMER" });

    // File 2 complaints with customer's email and 1 with another email
    await createComplaint({
      submitterEmail: "citizen@example.com",
      title: "Pothole on 5th Ave",
    });
    await createComplaint({
      submitterEmail: "CITIZEN@EXAMPLE.COM", // case insensitive match
      title: "Broken Streetlight",
    });
    await createComplaint({
      submitterEmail: "other@example.com",
      title: "Trash on 2nd Ave",
    });

    const results = await prisma.complaint.findMany({
      where: {
        submitterEmail: { equals: customer.email, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
    });

    expect(results).toHaveLength(2);
    expect(results.map((c) => c.title)).toContain("Pothole on 5th Ave");
    expect(results.map((c) => c.title)).toContain("Broken Streetlight");
  });
});
