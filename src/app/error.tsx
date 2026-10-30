"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error boundary caught:", error);
  }, [error]);

  return (
    <div style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center" }}>
      <div className="card">
        <h1 className="card-title" style={{ fontSize: "1.75rem", marginBottom: "0.5rem", color: "var(--danger)" }}>
          Something went wrong
        </h1>
        <p className="card-desc">
          An unexpected error occurred while loading this page. Please try again or return home.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Link href="/" className="btn btn-secondary">
            Go to home
          </Link>
        </div>
      </div>
    </div>
  );
}
