import type { Metadata } from "next";
import { SubmitComplaintForm } from "@/components/SubmitComplaintForm";

export const metadata: Metadata = {
  title: "Submit a Complaint - Complaints Portal",
  description: "Register a formal complaint for review and investigation",
};

export default function SubmitPage() {
  return (
    <div style={{ paddingTop: "1rem" }}>
      <SubmitComplaintForm />
    </div>
  );
}
