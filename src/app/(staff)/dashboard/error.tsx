"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", textAlign: "center" }}>
      <div className="card">
        <h2 className="card-title" style={{ color: "var(--danger)" }}>
          Unable to Load Dashboard
        </h2>
        <p className="card-desc">
          An error occurred while loading the complaints queue. Please try again or clear your filters.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/dashboard" className="btn btn-secondary">
            Reset to default view
          </Link>
        </div>
      </div>
    </div>
  );
}
