import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, createUser, createComplaint } from "../helpers/db";
import { listComplaints } from "@/lib/services/complaints";
import { listQuerySchema } from "@/lib/validation/complaint";
import { parseQuery } from "@/lib/api/request";
import { ValidationError } from "@/lib/errors";

describe("Complaints List & Filtering Integration", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("filters by q across reference, title, and submitter email", async () => {
    const actor = await createUser();

    const c1 = await createComplaint({
      title: "Unique Pothole Hazard",
      submitterEmail: "resident1@example.com",
    });

    const c2 = await createComplaint({
      title: "Noise complaint",
      submitterEmail: "pothole.watcher@example.com",
    });

    const c3 = await createComplaint({
      title: "Garbage collection",
      submitterEmail: "citizen@example.com",
    });

    const searchTitle = await listComplaints(
      { q: "Pothole", page: 1, pageSize: 20, sort: "newest" },
      { id: actor.id, email: actor.email, name: actor.name, role: actor.role },
    );

    const ids = searchTitle.items.map((i) => i.id);
    expect(ids).toContain(c1.id);
    expect(ids).toContain(c2.id);
    expect(ids).not.toContain(c3.id);

    const refFragment = c3.reference.substring(4, 7);
    const searchRef = await listComplaints(
      { q: refFragment, page: 1, pageSize: 20, sort: "newest" },
      { id: actor.id, email: actor.email, name: actor.name, role: actor.role },
    );

    expect(searchRef.items.map((i) => i.id)).toContain(c3.id);
  });

  it("filters by status list, priority list, category, and assignee", async () => {
    const agent = await createUser({ role: "AGENT" });
    const other = await createUser({ role: "AGENT" });

    const cOpen = await createComplaint({
      status: "OPEN",
      priority: "LOW",
      category: "Roads",
      assigneeId: null,
    });

    const cReviewMe = await createComplaint({
      status: "IN_REVIEW",
      priority: "HIGH",
      category: "Roads",
      assigneeId: agent.id,
    });

    const cReviewOther = await createComplaint({
      status: "IN_REVIEW",
      priority: "MEDIUM",
      category: "Parks",
      assigneeId: other.id,
    });

    const cResolved = await createComplaint({
      status: "RESOLVED",
      priority: "HIGH",
      category: "Roads",
      assigneeId: agent.id,
    });

    const statusFilter = await listComplaints(
      { status: ["OPEN", "RESOLVED"], page: 1, pageSize: 20, sort: "newest" },
      { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
    );
    expect(statusFilter.items.map((i) => i.id)).toEqual(
      expect.arrayContaining([cOpen.id, cResolved.id]),
    );
    expect(statusFilter.items.map((i) => i.id)).not.toContain(cReviewMe.id);

    const priorityFilter = await listComplaints(
      { priority: ["HIGH"], page: 1, pageSize: 20, sort: "newest" },
      { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
    );
    expect(priorityFilter.items.map((i) => i.id)).toEqual(
      expect.arrayContaining([cReviewMe.id, cResolved.id]),
    );
    expect(priorityFilter.items.map((i) => i.id)).not.toContain(cOpen.id);

    const meFilter = await listComplaints(
      { assignee: "me", page: 1, pageSize: 20, sort: "newest" },
      { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
    );
    expect(meFilter.items.map((i) => i.id)).toEqual(
      expect.arrayContaining([cReviewMe.id, cResolved.id]),
    );
    expect(meFilter.items.map((i) => i.id)).not.toContain(cReviewOther.id);

    const unassignedFilter = await listComplaints(
      { assignee: "unassigned", page: 1, pageSize: 20, sort: "newest" },
      { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
    );
    expect(unassignedFilter.items.map((i) => i.id)).toEqual([cOpen.id]);

    const specificAssignee = await listComplaints(
      { assignee: other.id, page: 1, pageSize: 20, sort: "newest" },
      { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
    );
    expect(specificAssignee.items.map((i) => i.id)).toEqual([cReviewOther.id]);

    const combined = await listComplaints(
      {
        status: ["IN_REVIEW"],
        priority: ["HIGH"],
        category: "Roads",
        assignee: "me",
        page: 1,
        pageSize: 20,
        sort: "newest",
      },
      { id: agent.id, email: agent.email, name: agent.name, role: agent.role },
    );
    expect(combined.items.map((i) => i.id)).toEqual([cReviewMe.id]);
  });

  it("handles pagination bounds, totals, and stable ordering", async () => {
    const actor = await createUser();

    for (let i = 0; i < 25; i++) {
      await createComplaint({
        title: `Complaint number ${i}`,
      });
    }

    const p1 = await listComplaints(
      { page: 1, pageSize: 10, sort: "newest" },
      { id: actor.id, email: actor.email, name: actor.name, role: actor.role },
    );
    expect(p1.items).toHaveLength(10);
    expect(p1.total).toBe(25);
    expect(p1.page).toBe(1);
    expect(p1.pageSize).toBe(10);

    const p2 = await listComplaints(
      { page: 2, pageSize: 10, sort: "newest" },
      { id: actor.id, email: actor.email, name: actor.name, role: actor.role },
    );
    expect(p2.items).toHaveLength(10);

    const p3 = await listComplaints(
      { page: 3, pageSize: 10, sort: "newest" },
      { id: actor.id, email: actor.email, name: actor.name, role: actor.role },
    );
    expect(p3.items).toHaveLength(5);

    const p4 = await listComplaints(
      { page: 4, pageSize: 10, sort: "newest" },
      { id: actor.id, email: actor.email, name: actor.name, role: actor.role },
    );
    expect(p4.items).toHaveLength(0);

    const p1Again = await listComplaints(
      { page: 1, pageSize: 10, sort: "newest" },
      { id: actor.id, email: actor.email, name: actor.name, role: actor.role },
    );
    expect(p1Again.items.map((i) => i.id)).toEqual(p1.items.map((i) => i.id));
  });

  it("rejects pageSize above 100 via query parser and schema", async () => {
    expect(() =>
      parseQuery(
        listQuerySchema,
        new Request("http://localhost/api/complaints?pageSize=101"),
      ),
    ).toThrow(ValidationError);
  });
});
