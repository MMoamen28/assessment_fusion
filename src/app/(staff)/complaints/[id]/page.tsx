import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { getComplaintDetail, getAssignableUsers } from "@/lib/services/complaints";
import { NotFoundError } from "@/lib/errors";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { formatDateTime } from "@/lib/format";
import {
  canClaim,
  canAssign,
  canChangeStatus,
  canComment,
  canChangePriority,
} from "@/lib/domain/permissions";
import { checkTransition, TRANSITIONS, isTerminal } from "@/lib/domain/workflow";
import type { Status } from "@/types/api";
import { ClaimButton } from "@/components/complaint/ClaimButton";
import { AssignForm } from "@/components/complaint/AssignForm";
import { StatusForm } from "@/components/complaint/StatusForm";
import { PriorityForm } from "@/components/complaint/PriorityForm";
import { CommentForm } from "@/components/complaint/CommentForm";
import { CopyTrackingLink } from "@/components/complaint/CopyTrackingLink";

export const instant = false;

interface PageProps {
  params: Promise<{ id: string }>;
}

interface ActivityItem {
  id: string;
  action: string;
  metadata: unknown;
  createdAt: string | Date;
  actor: { id: string; name: string } | null;
}

function getActivitySentence(
  activity: ActivityItem,
  userMap: Map<string, string>,
): string {
  const actor = activity.actor?.name || "Someone";
  const meta = (activity.metadata && typeof activity.metadata === "object"
    ? activity.metadata
    : {}) as Record<string, unknown>;

  switch (activity.action) {
    case "CREATED":
      return "Complaint submitted";
    case "CLAIMED":
      return `${actor} claimed this complaint`;
    case "ASSIGNED": {
      const toId =
        typeof meta.to === "string"
          ? meta.to
          : typeof meta.assignedTo === "string"
          ? meta.assignedTo
          : "";
      const toName = (toId && userMap.get(toId)) || toId || "someone";
      return `${actor} assigned it to ${toName}`;
    }
    case "STATUS_CHANGED": {
      const from =
        typeof meta.from === "string"
          ? meta.from
          : typeof meta.previousStatus === "string"
          ? meta.previousStatus
          : "?";
      const to =
        typeof meta.to === "string"
          ? meta.to
          : typeof meta.newStatus === "string"
          ? meta.newStatus
          : "?";
      const note =
        typeof meta.note === "string" && meta.note.trim()
          ? meta.note.trim()
          : typeof meta.reason === "string" && meta.reason.trim()
          ? meta.reason.trim()
          : "";
      return `${actor} changed status from ${from} to ${to}${note ? `: ${note}` : ""}`;
    }
    case "PRIORITY_CHANGED": {
      const from = typeof meta.from === "string" ? meta.from : "?";
      const to = typeof meta.to === "string" ? meta.to : "?";
      return `${actor} changed priority from ${from} to ${to}`;
    }
    case "COMMENTED": {
      if (meta.internal === true) {
        return `${actor} added an internal comment`;
      }
      if (meta.internal === false) {
        return `${actor} added a public comment`;
      }
      return `${actor} added a comment`;
    }
    default:
      return `${actor} performed ${activity.action}`;
  }
}

export default async function ComplaintDetailPage({ params }: PageProps) {
  const user = await requireUser();
  const { id } = await params;

  let complaint;
  try {
    complaint = await getComplaintDetail(id);
  } catch (err) {
    if (err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }

  const userActor = { id: user.id, role: user.role };
  const complaintState = { status: complaint.status, assigneeId: complaint.assigneeId };

  const userCanClaim = canClaim(userActor, complaintState);
  const userCanAssign = canAssign(userActor, complaintState);
  const userCanChangePriority = canChangePriority(userActor, complaintState);
  const userCanComment = canComment(userActor, complaintState);

  const transitions = TRANSITIONS[complaint.status] || [];
  const allowedStatuses: Status[] = transitions.filter((to) => {
    return (
      canChangeStatus(userActor, complaintState, to) &&
      checkTransition(complaint.status, to, {
        hasAssignee: complaint.assigneeId !== null,
      }).ok
    );
  });

  const terminal = isTerminal(complaint.status);
  const assignableUsers = await getAssignableUsers();
  const userMap = new Map(assignableUsers.map((u) => [u.id, u.name]));

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", padding: "1.5rem 1rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard" className="btn btn-secondary">
          &larr; Back to dashboard
        </Link>
      </div>

      <div className="ticket-header">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
              marginBottom: "0.5rem",
            }}
          >
            <span className="table-ref" style={{ fontSize: "1rem" }}>
              {complaint.reference}
            </span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: 700,
              margin: 0,
              color: "var(--text-main)",
            }}
          >
            {complaint.title}
          </h1>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="card-title">Complaint Details</h2>
        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Category</span>
            <span className="meta-val">{complaint.category}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Created</span>
            <span className="meta-val">{formatDateTime(complaint.createdAt)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Updated</span>
            <span className="meta-val">{formatDateTime(complaint.updatedAt)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Assignee</span>
            <span className="meta-val">{complaint.assignee?.name ?? "Unassigned"}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Submitter</span>
            <span className="meta-val">{complaint.submitterName}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Submitter Email</span>
            <span className="meta-val">{complaint.submitterEmail}</span>
          </div>
        </div>

        {complaint.publicToken && (
          <CopyTrackingLink publicToken={complaint.publicToken} />
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="card-title">Description</h2>
        <div className="description-box" style={{ margin: 0 }}>
          {complaint.description}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="card-title">Actions</h2>
        {terminal ? (
          <div className="closed-notice">This complaint is closed</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {userCanClaim && <ClaimButton complaintId={complaint.id} />}
            {userCanAssign && (
              <AssignForm
                complaintId={complaint.id}
                expectedVersion={complaint.version}
                assignableUsers={assignableUsers}
                currentAssigneeId={complaint.assigneeId}
              />
            )}
            {allowedStatuses.length > 0 && (
              <StatusForm
                complaintId={complaint.id}
                currentStatus={complaint.status}
                expectedVersion={complaint.version}
                allowedStatuses={allowedStatuses}
              />
            )}
            {userCanChangePriority && (
              <PriorityForm
                complaintId={complaint.id}
                currentPriority={complaint.priority}
                expectedVersion={complaint.version}
              />
            )}
            {!userCanClaim &&
              !userCanAssign &&
              allowedStatuses.length === 0 &&
              !userCanChangePriority && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", margin: 0 }}>
                  No actions available for your role.
                </p>
              )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="card-title">Comments</h2>
        {complaint.comments.length === 0 ? (
          <p className="empty-state">No comments yet.</p>
        ) : (
          <div className="comments-list">
            {complaint.comments.map((c) => (
              <div
                key={c.id}
                className={`comment-card ${c.isInternal ? "comment-internal" : ""}`}
              >
                <div className="comment-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="comment-author">
                      {c.author?.name || "Complainant"}
                    </span>
                    {c.isInternal && <span className="badge-internal">Internal</span>}
                  </div>
                  <span className="comment-date">{formatDateTime(c.createdAt)}</span>
                </div>
                <div className="comment-body">{c.body}</div>
              </div>
            ))}
          </div>
        )}
        {userCanComment && (
          <div
            style={{
              marginTop: "1.5rem",
              borderTop: "1px solid var(--border-color)",
              paddingTop: "1rem",
            }}
          >
            <CommentForm complaintId={complaint.id} />
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <h2 className="card-title">Activity History</h2>
        {complaint.activities.length === 0 ? (
          <p className="empty-state">No activity history recorded.</p>
        ) : (
          <div className="activity-list">
            {complaint.activities.map((act) => (
              <div key={act.id} className="activity-item">
                <span className="activity-sentence">
                  {getActivitySentence(act, userMap)}
                </span>
                <span className="activity-time">{formatDateTime(act.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
