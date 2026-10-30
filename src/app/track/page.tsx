import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { TrackLookupForm } from "@/components/TrackLookupForm";

export const metadata: Metadata = {
  title: "Track a Complaint - Complaints Portal",
  description: "Check real-time progress and updates for your submitted complaint",
};

export const instant = false;

export default async function TrackPage() {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === "CUSTOMER") {
      redirect("/my-complaints");
    } else {
      redirect("/dashboard");
    }
  }

  return (
    <div style={{ maxWidth: "560px", margin: "1.5rem auto" }}>
      <div className="card">
        <h1 className="card-title" style={{ marginBottom: "0.5rem" }}>
          Track Your Complaints
        </h1>
        <p className="card-desc" style={{ marginBottom: "1.25rem" }}>
          To view and monitor all your submitted complaints, live status updates, and municipal responses in your personal dashboard, please sign in.
        </p>

        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <Link href="/login" className="btn btn-primary" style={{ flex: 1, textAlign: "center" }}>
            Sign in to track &rarr;
          </Link>
          <Link href="/register" className="btn btn-secondary" style={{ flex: 1, textAlign: "center" }}>
            Create citizen account
          </Link>
        </div>

        <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.25rem" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.5rem", color: "var(--text-muted)" }}>
            Or track an individual ticket by reference:
          </div>
          <TrackLookupForm />
        </div>
      </div>
    </div>
  );
}
