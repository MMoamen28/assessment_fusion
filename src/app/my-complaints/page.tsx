import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { LiveUpdates } from "@/components/realtime/LiveUpdates";

export const metadata: Metadata = {
  title: "My Complaints - Customer Portal",
  description: "View and track the status of all your submitted complaints",
};

export const instant = false;

export default async function MyComplaintsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const complaints = await prisma.complaint.findMany({
    where: {
      submitterEmail: { equals: user.email, mode: "insensitive" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      reference: true,
      publicToken: true,
      title: true,
      category: true,
      status: true,
      priority: true,
      createdAt: true,
      _count: {
        select: {
          comments: {
            where: { isInternal: false },
          },
        },
      },
    },
  });

  return (
    <div style={{ maxWidth: "1000px", margin: "1.5rem auto", padding: "0 1rem" }}>
      <LiveUpdates url="/api/public/events" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
            My Complaints
          </h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Showing complaints filed by <strong>{user.name}</strong> ({user.email})
          </p>
        </div>
        <Link
          href="/submit"
          className="btn btn-primary"
          style={{ textDecoration: "none" }}
        >
          + Submit New Complaint
        </Link>
      </div>

      {complaints.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
            No Complaints Found
          </h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 1.5rem" }}>
            You have not submitted any complaints with this email address yet. Any complaint you submit using <strong>{user.email}</strong> will automatically appear here.
          </p>
          <Link href="/submit" className="btn btn-primary">
            Submit a Complaint Now
          </Link>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-container" style={{ margin: 0, border: "none" }}>
            <table className="table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: "160px" }}>Reference</th>
                  <th>Title &amp; Category</th>
                  <th style={{ width: "120px" }}>Status</th>
                  <th style={{ width: "100px" }}>Priority</th>
                  <th style={{ width: "120px" }}>Updates</th>
                  <th style={{ width: "130px" }}>Submitted</th>
                  <th style={{ width: "90px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="table-ref" style={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {item.reference}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/track/${item.publicToken}`}
                        className="table-title-link"
                        style={{ fontWeight: 600, display: "block" }}
                      >
                        {item.title}
                      </Link>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {item.category}
                      </span>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      <PriorityBadge priority={item.priority} />
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                      {item._count.comments === 0 ? (
                        <span>No public replies</span>
                      ) : (
                        <span>
                          {item._count.comments} {item._count.comments === 1 ? "reply" : "replies"}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/track/${item.publicToken}`}
                        className="btn btn-secondary"
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem", textDecoration: "none" }}
                      >
                        Track &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
