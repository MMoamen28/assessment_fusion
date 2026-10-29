import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser } from "../helpers/db";
import { authenticate } from "@/lib/auth/authenticate";
import {
  createSession,
  getSessionUser,
  deleteSession,
  hashToken,
} from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { UnauthorizedError } from "@/lib/errors";

describe("Authentication Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("authenticate", () => {
    it("authenticates successfully with valid credentials", async () => {
      const user = await createUser({
        email: "alice@example.com",
        name: "Alice",
      });

      const authUser = await authenticate("alice@example.com", "Password123!");
      expect(authUser.id).toBe(user.id);
      expect(authUser.email).toBe(user.email);
      expect(authUser.name).toBe(user.name);
      expect(authUser.role).toBe(user.role);
    });

    it("throws UnauthorizedError with identical message on wrong password", async () => {
      await createUser({
        email: "alice@example.com",
      });

      await expect(authenticate("alice@example.com", "WrongPassword!")).rejects.toThrow(
        UnauthorizedError,
      );
      await expect(authenticate("alice@example.com", "WrongPassword!")).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("throws UnauthorizedError with identical message on unknown email", async () => {
      await expect(authenticate("nonexistent@example.com", "Password123!")).rejects.toThrow(
        UnauthorizedError,
      );
      await expect(authenticate("nonexistent@example.com", "Password123!")).rejects.toThrow(
        "Invalid email or password",
      );
    });
  });

  describe("session management", () => {
    it("stores session row whose id equals hashToken(token) and not raw token", async () => {
      const user = await createUser();
      const { token } = await createSession(user.id);

      const rawSession = await prisma.session.findUnique({
        where: { id: token },
      });
      expect(rawSession).toBeNull();

      const hashedSession = await prisma.session.findUnique({
        where: { id: hashToken(token) },
      });
      expect(hashedSession).not.toBeNull();
      expect(hashedSession?.userId).toBe(user.id);
    });

    it("returns user without passwordHash from getSessionUser", async () => {
      const user = await createUser();
      const { token } = await createSession(user.id);

      const sessionUser = await getSessionUser(token);
      expect(sessionUser).not.toBeNull();
      expect(sessionUser?.id).toBe(user.id);
      expect(sessionUser?.email).toBe(user.email);
      expect(sessionUser?.name).toBe(user.name);
      expect(sessionUser?.role).toBe(user.role);
      expect("passwordHash" in (sessionUser ?? {})).toBe(false);
    });

    it("returns null and deletes session row when session is expired", async () => {
      const user = await createUser();
      const { token } = await createSession(user.id);
      const hashedId = hashToken(token);

      await prisma.session.update({
        where: { id: hashedId },
        data: {
          expiresAt: new Date(Date.now() - 1000),
        },
      });

      const sessionUser = await getSessionUser(token);
      expect(sessionUser).toBeNull();

      const remainingRow = await prisma.session.findUnique({
        where: { id: hashedId },
      });
      expect(remainingRow).toBeNull();
    });

    it("returns null for unknown token", async () => {
      const sessionUser = await getSessionUser("nonexistent-token-12345");
      expect(sessionUser).toBeNull();
    });

    it("returns null after deleteSession", async () => {
      const user = await createUser();
      const { token } = await createSession(user.id);

      await deleteSession(token);

      const sessionUser = await getSessionUser(token);
      expect(sessionUser).toBeNull();

      const remainingRow = await prisma.session.findUnique({
        where: { id: hashToken(token) },
      });
      expect(remainingRow).toBeNull();
    });
  });
});
