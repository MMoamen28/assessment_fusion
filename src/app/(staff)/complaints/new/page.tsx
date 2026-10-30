import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { NewComplaintForm } from "@/components/complaint/NewComplaintForm";

export const metadata: Metadata = {
  title: "New Complaint - Complaints Portal",
};

export default async function NewComplaintPage() {
  await requireUser();

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ marginBottom: "1rem" }}>
        <Link href="/dashboard" style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
          &larr; Back to dashboard
        </Link>
      </div>

      <NewComplaintForm />
    </div>
  );
}
