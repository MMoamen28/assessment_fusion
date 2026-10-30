import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { prisma } from "@/lib/db";
import { COMPLAINT_CATEGORIES } from "@/lib/domain/constants";
import { generatePublicToken, generateReference } from "@/lib/ids";

describe("Database Constraints & Invariants Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  describe("complaint_category_valid & pg_constraint definition", () => {
    it("reads category CHECK constraint definition from pg_catalog and confirms it matches COMPLAINT_CATEGORIES", async () => {
      const rows = await prisma.$queryRaw<Array<{ def: string }>>`
        SELECT pg_get_constraintdef(c.oid) AS def
        FROM pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
        WHERE t.relname = 'Complaint' AND c.conname = 'complaint_category_valid'
      `;

      expect(rows).toHaveLength(1);
      const def = rows[0].def;

      for (const cat of COMPLAINT_CATEGORIES) {
        expect(def).toContain(`'${cat}'`);
      }
    });

    it("rejects invalid category and accepts every valid category", async () => {
      // Violating category
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "Valid Title Here",
            description: "Valid description exceeding ten characters",
            category: "InvalidCategory",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_category_valid/);

      // Valid categories
      for (const cat of COMPLAINT_CATEGORIES) {
        const created = await prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: `Ticket for category ${cat}`,
            description: "Valid description exceeding ten characters",
            category: cat,
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        });
        expect(created.category).toBe(cat);
      }
    });
  });

  describe("complaint_version_nonneg", () => {
    it("rejects negative version and accepts version >= 0", async () => {
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "Negative Version Ticket",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: -1,
          },
        }),
      ).rejects.toThrow(/23514|complaint_version_nonneg/);

      const valid = await prisma.complaint.create({
        data: {
          reference: generateReference(),
          publicToken: generatePublicToken(),
          title: "Zero Version Ticket",
          description: "Valid description exceeding ten characters",
          category: "Service",
          status: "OPEN",
          submitterName: "John Citizen",
          submitterEmail: "john@example.com",
          version: 0,
        },
      });
      expect(valid.version).toBe(0);
    });
  });

  describe("length bounds (title, description, submitterName, submitterEmail, comment body)", () => {
    it("rejects whitespace-only or empty title and title exceeding 200 chars", async () => {
      // Whitespace only
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "   ",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_title_length/);

      // Exceeding 200 chars
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "A".repeat(201),
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_title_length/);

      // Boundary 200 chars accepted
      const valid = await prisma.complaint.create({
        data: {
          reference: generateReference(),
          publicToken: generatePublicToken(),
          title: "A".repeat(200),
          description: "Valid description exceeding ten characters",
          category: "Service",
          status: "OPEN",
          submitterName: "John Citizen",
          submitterEmail: "john@example.com",
          version: 0,
        },
      });
      expect(valid.title.length).toBe(200);
    });

    it("rejects description shorter than 10 characters or exceeding 5000 characters", async () => {
      // 9 chars
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "123456789",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_description_length/);

      // 5001 chars
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "A".repeat(5001),
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_description_length/);

      // Boundary 10 chars accepted
      const valid = await prisma.complaint.create({
        data: {
          reference: generateReference(),
          publicToken: generatePublicToken(),
          title: "Valid Title",
          description: "1234567890",
          category: "Service",
          status: "OPEN",
          submitterName: "John Citizen",
          submitterEmail: "john@example.com",
          version: 0,
        },
      });
      expect(valid.description.length).toBe(10);
    });

    it("rejects whitespace-only submitterName and submitterEmail exceeding 255 chars", async () => {
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "   ",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_submitter_name_length/);

      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: `${"a".repeat(250)}@ex.com`,
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_submitter_email_length/);
    });

    it("rejects comment body with whitespace-only or exceeding 2000 chars", async () => {
      const complaint = await createComplaint({ status: "OPEN" });

      await expect(
        prisma.comment.create({
          data: {
            complaintId: complaint.id,
            body: "   ",
          },
        }),
      ).rejects.toThrow(/23514|comment_body_length/);

      await expect(
        prisma.comment.create({
          data: {
            complaintId: complaint.id,
            body: "A".repeat(2001),
          },
        }),
      ).rejects.toThrow(/23514|comment_body_length/);

      const valid = await prisma.comment.create({
        data: {
          complaintId: complaint.id,
          body: "A".repeat(2000),
        },
      });
      expect(valid.body.length).toBe(2000);
    });
  });

  describe("complaint_public_token_length and complaint_reference_format", () => {
    it("rejects publicToken shorter than 20 chars", async () => {
      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: "short_token_19_char", // 19 chars
            title: "Valid Title",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_public_token_length/);
    });

    it("rejects reference not matching ^CMP-[A-HJ-NP-Z2-9]{6}$", async () => {
      // Lowercase
      await expect(
        prisma.complaint.create({
          data: {
            reference: "CMP-abcdef",
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_reference_format/);

      // Excluded letter 'O'
      await expect(
        prisma.complaint.create({
          data: {
            reference: "CMP-ABCDEO",
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_reference_format/);

      // Excluded digit '1'
      await expect(
        prisma.complaint.create({
          data: {
            reference: "CMP-ABCDE1",
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_reference_format/);
    });
  });

  describe("complaint_assignment_invariant", () => {
    it("rejects OPEN complaint with assignee", async () => {
      const agent = await createUser({ role: "AGENT" });

      await expect(
        prisma.complaint.create({
          data: {
            reference: generateReference(),
            publicToken: generatePublicToken(),
            title: "Valid Title",
            description: "Valid description exceeding ten characters",
            category: "Service",
            status: "OPEN",
            assigneeId: agent.id,
            submitterName: "John Citizen",
            submitterEmail: "john@example.com",
            version: 0,
          },
        }),
      ).rejects.toThrow(/23514|complaint_assignment_invariant/);
    });

    it("rejects IN_REVIEW, RESOLVED, and CLOSED complaints without assignee", async () => {
      for (const st of ["IN_REVIEW", "RESOLVED", "CLOSED"] as const) {
        await expect(
          prisma.complaint.create({
            data: {
              reference: generateReference(),
              publicToken: generatePublicToken(),
              title: "Valid Title",
              description: "Valid description exceeding ten characters",
              category: "Service",
              status: st,
              assigneeId: null,
              submitterName: "John Citizen",
              submitterEmail: "john@example.com",
              version: 0,
            },
          }),
        ).rejects.toThrow(/23514|complaint_assignment_invariant/);
      }
    });

    it("accepts REJECTED complaint both with and without assignee", async () => {
      const agent = await createUser({ role: "AGENT" });

      // Unassigned REJECTED
      const unassignedRejected = await prisma.complaint.create({
        data: {
          reference: generateReference(),
          publicToken: generatePublicToken(),
          title: "Unassigned Rejected Ticket",
          description: "Valid description exceeding ten characters",
          category: "Service",
          status: "REJECTED",
          assigneeId: null,
          submitterName: "John Citizen",
          submitterEmail: "john@example.com",
          version: 0,
        },
      });
      expect(unassignedRejected.status).toBe("REJECTED");
      expect(unassignedRejected.assigneeId).toBeNull();

      // Assigned REJECTED
      const assignedRejected = await prisma.complaint.create({
        data: {
          reference: generateReference(),
          publicToken: generatePublicToken(),
          title: "Assigned Rejected Ticket",
          description: "Valid description exceeding ten characters",
          category: "Service",
          status: "REJECTED",
          assigneeId: agent.id,
          submitterName: "John Citizen",
          submitterEmail: "john@example.com",
          version: 0,
        },
      });
      expect(assignedRejected.status).toBe("REJECTED");
      expect(assignedRejected.assigneeId).toBe(agent.id);
    });
  });
});
