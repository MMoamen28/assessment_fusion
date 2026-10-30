import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import {
  listComplaints,
  getStats,
  getAssignableUsers,
} from "@/lib/services/complaints";
import { listQuerySchema, type ListQueryInput } from "@/lib/validation/complaint";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { formatDateTime } from "@/lib/format";
import type { Status, Priority } from "@/types/api";

export const metadata: Metadata = {
  title: "Staff Dashboard - Complaints Portal",
};

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function parseQueryParams(
  raw: Record<string, string | string[] | undefined>,
): ListQueryInput {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw || {})) {
    if (typeof v === "string") {
      normalized[k] = v;
    } else if (Array.isArray(v) && v.length > 0) {
      normalized[k] = v.join(",");
    }
  }

  const fullResult = listQuerySchema.safeParse(normalized);
  if (fullResult.success) {
    return fullResult.data;
  }

  // Fall back gracefully to defaults on invalid input (never crash)
  const cleaned: Record<string, unknown> = {
    sort: "newest",
    page: 1,
    pageSize: 20,
  };

  if (normalized.q) cleaned.q = normalized.q.trim();
  if (normalized.category) cleaned.category = normalized.category.trim();
  if (normalized.assignee) cleaned.assignee = normalized.assignee.trim();

  const pageNum = parseInt(normalized.page, 10);
  if (!isNaN(pageNum) && pageNum >= 1) cleaned.page = pageNum;

  const pageSizeNum = parseInt(normalized.pageSize, 10);
  if (!isNaN(pageSizeNum) && pageSizeNum >= 1 && pageSizeNum <= 100) {
    cleaned.pageSize = pageSizeNum;
  }

  if (["newest", "oldest", "priority"].includes(normalized.sort)) {
    cleaned.sort = normalized.sort as "newest" | "oldest" | "priority";
  }

  if (normalized.status) {
    const statusResult = listQuerySchema.shape.status.safeParse(normalized.status);
    if (statusResult.success && statusResult.data) {
      cleaned.status = statusResult.data;
    }
  }

  if (normalized.priority) {
    const priorityResult = listQuerySchema.shape.priority.safeParse(normalized.priority);
    if (priorityResult.success && priorityResult.data) {
      cleaned.priority = priorityResult.data;
    }
  }

  return cleaned as ListQueryInput;
}

function buildPageUrl(
  pageNumber: number,
  rawParams: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  for (const [key, val] of Object.entries(rawParams)) {
    if (key === "page") continue;
    if (typeof val === "string" && val) {
      params.set(key, val);
    } else if (Array.isArray(val) && val.length > 0) {
      params.set(key, val.join(","));
    }
  }
  if (pageNumber > 1) {
    params.set("page", String(pageNumber));
  }
  const qs = params.toString();
  return qs ? `/dashboard?${qs}` : "/dashboard";
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const rawParams = await searchParams;
  const query = parseQueryParams(rawParams);

  // Direct service calls (no HTTP self-call)
  const [stats, listResult, assignedMeResult, assignableUsers] = await Promise.all([
    getStats(),
    listComplaints(query, user),
    listComplaints({ assignee: "me", page: 1, pageSize: 1, sort: "newest" }, user),
    user.role === "ADMIN" ? getAssignableUsers() : Promise.resolve([]),
  ]);

  const { items, total, page, pageSize } = listResult;
  const totalCount =
    stats.OPEN + stats.IN_REVIEW + stats.RESOLVED + stats.CLOSED + stats.REJECTED;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Determine active stat card for highlighting
  const currentStatusParam =
    typeof rawParams.status === "string" ? rawParams.status : "";
  const currentAssigneeParam =
    typeof rawParams.assignee === "string" ? rawParams.assignee : "";
  const isTotalActive = !currentStatusParam && !currentAssigneeParam;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.25rem" }}>
            Staff Dashboard
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9375rem" }}>
            Welcome back, <strong>{user.name}</strong> ({user.email}) &bull;{" "}
            <span className="user-role">{user.role}</span>
          </p>
        </div>
        <Link href="/complaints/new" className="button button-primary">
          New complaint
        </Link>
      </div>

      {/* Stats Cards Row */}
      <div className="stats-grid">
        <Link
          href="/dashboard"
          className={`stat-card ${isTotalActive ? "active" : ""}`}
        >
          <span className="stat-label">Total</span>
          <span className="stat-value">{totalCount}</span>
        </Link>
        <Link
          href="/dashboard?status=OPEN"
          className={`stat-card ${currentStatusParam === "OPEN" ? "active" : ""}`}
        >
          <span className="stat-label">Open</span>
          <span className="stat-value">{stats.OPEN}</span>
        </Link>
        <Link
          href="/dashboard?status=IN_REVIEW"
          className={`stat-card ${currentStatusParam === "IN_REVIEW" ? "active" : ""}`}
        >
          <span className="stat-label">In Review</span>
          <span className="stat-value">{stats.IN_REVIEW}</span>
        </Link>
        <Link
          href="/dashboard?status=RESOLVED"
          className={`stat-card ${currentStatusParam === "RESOLVED" ? "active" : ""}`}
        >
          <span className="stat-label">Resolved</span>
          <span className="stat-value">{stats.RESOLVED}</span>
        </Link>
        <Link
          href="/dashboard?status=CLOSED"
          className={`stat-card ${currentStatusParam === "CLOSED" ? "active" : ""}`}
        >
          <span className="stat-label">Closed</span>
          <span className="stat-value">{stats.CLOSED}</span>
        </Link>
        <Link
          href="/dashboard?status=REJECTED"
          className={`stat-card ${currentStatusParam === "REJECTED" ? "active" : ""}`}
        >
          <span className="stat-label">Rejected</span>
          <span className="stat-value">{stats.REJECTED}</span>
        </Link>
        <Link
          href="/dashboard?assignee=unassigned&status=OPEN"
          className={`stat-card ${
            currentAssigneeParam === "unassigned" ? "active" : ""
          }`}
        >
          <span className="stat-label">Unassigned (open)</span>
          <span className="stat-value">{stats.unassignedOpen}</span>
        </Link>
        <Link
          href="/dashboard?assignee=me"
          className={`stat-card ${currentAssigneeParam === "me" ? "active" : ""}`}
        >
          <span className="stat-label">Assigned to me</span>
          <span className="stat-value">{assignedMeResult.total}</span>
        </Link>
      </div>

      {/* Filter Bar Component */}
      <FilterBar
        isAdmin={user.role === "ADMIN"}
        assignableUsers={assignableUsers}
      />

      {/* Results Table or Empty State */}
      {items.length > 0 ? (
        <>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Category</th>
                  <th>Assignee</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {items.map((complaint) => {
                  const isAssignedToMe = complaint.assignee?.id === user.id;
                  return (
                    <tr
                      key={complaint.id}
                      className={isAssignedToMe ? "row-assigned-me" : undefined}
                    >
                      <td>
                        <span className="table-ref">{complaint.reference}</span>
                      </td>
                      <td>
                        <Link
                          href={`/complaints/${complaint.id}`}
                          className="table-title-link"
                        >
                          {complaint.title}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={complaint.status as Status} />
                      </td>
                      <td>
                        <PriorityBadge priority={complaint.priority as Priority} />
                      </td>
                      <td>{complaint.category}</td>
                      <td>
                        {complaint.assignee ? (
                          <span>{complaint.assignee.name}</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                        {formatDateTime(complaint.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <div className="pagination-info">
              Page {page} of {totalPages} ({total} {total === 1 ? "result" : "results"})
            </div>
            <div className="pagination-controls">
              {page > 1 ? (
                <Link
                  href={buildPageUrl(page - 1, rawParams)}
                  className="btn btn-secondary btn-sm"
                >
                  &larr; Previous
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled
                >
                  &larr; Previous
                </button>
              )}

              {page < totalPages ? (
                <Link
                  href={buildPageUrl(page + 1, rawParams)}
                  className="btn btn-secondary btn-sm"
                >
                  Next &rarr;
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled
                >
                  Next &rarr;
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state">
          <p style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "var(--text-main)" }}>
            No complaints match your filters
          </p>
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            Clear filters
          </Link>
        </div>
      )}
    </div>
  );
}
