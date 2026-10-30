import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicComplaint } from "@/lib/services/public";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NotFoundError } from "@/lib/errors";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { LiveUpdates } from "@/components/realtime/LiveUpdates";
import { ReplyForm } from "@/components/ReplyForm";
import { formatDateTime } from "@/lib/format";
import type { Status } from "@/types/api";

export const metadata: Metadata = {
  title: "Complaint Status - Complaints Portal",
  robots: {
    index: false,
    follow: false,
  },
};

export const instant = false;

interface TrackTokenPageProps {
  params: Promise<{ token: string }>;
}

export default async function TrackTokenPage({ params }: TrackTokenPageProps) {
  const { token } = await params;
  const user = await getCurrentUser();

  let complaint;
  try {
    complaint = await getPublicComplaint(token);
  } catch (err) {
    if (err instanceof NotFoundError) {
      notFound();
    }
    throw err;
  }

  const backHref = user?.role === "CUSTOMER" ? "/my-complaints" : user ? "/dashboard" : "/";
  const backLabel = user?.role === "CUSTOMER" ? "Back to my complaints" : user ? "Back to dashboard" : "Back to home";

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href={backHref} style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          &larr; {backLabel}
        </Link>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div className="ticket-header">
          <div>
            <div
              style={{
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                marginBottom: "0.25rem",
              }}
            >
              REFERENCE: <strong>{complaint.reference}</strong>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-main)" }}>
              {complaint.title}
            </h1>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            <LiveUpdates url={`/api/public/complaints/${token}/events`} />
          </div>
        </div>

        <div className="meta-grid">
          <div className="meta-item">
            <span className="meta-label">Category</span>
            <span className="meta-val">{complaint.category}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Submitted On</span>
            <span className="meta-val">{formatDateTime(complaint.createdAt)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Last Updated</span>
            <span className="meta-val">{formatDateTime(complaint.updatedAt)}</span>
          </div>
        </div>

        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Description
          </h2>
          <div className="description-box">{complaint.description}</div>
        </div>

        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "0.75rem" }}>
            Progress Timeline
          </h2>
          {complaint.timeline.length > 0 ? (
            <div className="timeline">
              {complaint.timeline.map((item, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-dot" />
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <StatusBadge status={item.status as Status} />
                  </div>
                  <div className="timeline-time">{formatDateTime(item.at)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">No updates yet</div>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.25rem" }}>
          Updates from Our Team
        </h2>
        <p className="card-desc">
          Official responses and resolution notes from staff regarding your complaint.
        </p>

        {complaint.comments.length > 0 ? (
          <div className="comments-list">
            {complaint.comments.map((comment, idx) => (
              <div key={idx} className="comment-card">
                <div className="comment-header">
                  <span className="comment-author">{comment.authorRole}</span>
                  <span className="comment-date">{formatDateTime(comment.createdAt)}</span>
                </div>
                <div className="comment-body">{comment.body}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No updates yet</div>
        )}

        {complaint.status !== "CLOSED" && complaint.status !== "REJECTED" && (
          <div style={{ marginTop: "1.5rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
            <ReplyForm publicToken={token} />
          </div>
        )}
      </div>
    </div>
  );
}
