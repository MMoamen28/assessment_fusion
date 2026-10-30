"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ComplaintError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ maxWidth: "560px", margin: "3rem auto", textAlign: "center" }}>
      <div className="card">
        <h2 className="card-title" style={{ color: "var(--danger)" }}>
          Error Loading Complaint
        </h2>
        <p className="card-desc">
          An error occurred while loading this complaint record. Please try again or return to the dashboard.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/dashboard" className="btn btn-secondary">
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
