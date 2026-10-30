import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SubmitComplaintForm } from "@/components/SubmitComplaintForm";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Submit a Complaint - Complaints Portal",
  description: "Register a formal complaint for review and investigation",
};

export const instant = false;

async function SubmitContent() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div style={{ maxWidth: "560px", margin: "2rem auto" }}>
        <div className="card" style={{ textAlign: "center", padding: "2.5rem 1.5rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🏛️</div>
          <h2 className="card-title" style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Citizen Account Required
          </h2>
          <p className="card-desc" style={{ maxWidth: "440px", margin: "0 auto 1.75rem", fontSize: "0.95rem" }}>
            To submit formal complaints and monitor all your cases in real-time through a single verified dashboard, please sign in or create your citizen account.
          </p>

          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <Link href="/login" className="btn btn-primary" style={{ minWidth: "140px" }}>
              Sign in &rarr;
            </Link>
            <Link href="/register" className="btn btn-secondary" style={{ minWidth: "140px" }}>
              Register account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: "1rem" }}>
      <SubmitComplaintForm
        initialName={user.name}
        initialEmail={user.email}
        isLoggedIn={true}
      />
    </div>
  );
}

export default function SubmitPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SubmitContent />
    </Suspense>
  );
}
