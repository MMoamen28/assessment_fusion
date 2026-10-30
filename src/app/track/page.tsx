import type { Metadata } from "next";
import { TrackLookupForm } from "@/components/TrackLookupForm";

export const metadata: Metadata = {
  title: "Track a Complaint - Complaints Portal",
  description: "Check real-time progress and updates for your submitted complaint",
};

export default function TrackPage() {
  return (
    <div style={{ maxWidth: "520px", margin: "1.5rem auto" }}>
      <div className="card">
        <h1 className="card-title" style={{ marginBottom: "0.5rem" }}>
          Track a Complaint
        </h1>
        <p className="card-desc">
          Enter your reference code and the email address used during submission to view status and responses.
        </p>
        <TrackLookupForm />
      </div>
    </div>
  );
}
