import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Dashboard - Complaints Portal",
};

async function DashboardContent() {
  const user = await getCurrentUser();

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.5rem" }}>
          Staff Dashboard
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Signed in as <strong>{user?.name}</strong> ({user?.email}) &mdash; Role:{" "}
          <span className="user-role">{user?.role}</span>
        </p>
      </div>

      <div className="card">
        <h2 className="card-title">Dashboard coming next</h2>
        <p className="card-desc">
          The complaint queue, filter tabs, stats overview, and resolution actions will appear here in Part 2.
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading dashboard...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
