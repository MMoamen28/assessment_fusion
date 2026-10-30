import type { Metadata } from "next";
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

  return (
    <div style={{ paddingTop: "1rem" }}>
      <SubmitComplaintForm
        initialName={user?.name ?? ""}
        initialEmail={user?.email ?? ""}
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
