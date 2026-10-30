"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { lookupComplaint, ApiClientError } from "@/lib/api/client";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export function TrackLookupForm() {
  const router = useRouter();
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await lookupComplaint(reference.trim(), email.trim());
      router.push(`/track/${res.publicToken}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 404) {
          setErrorMsg("No complaint found with those details");
        } else if (Array.isArray(err.details)) {
          const errorsMap: Record<string, string> = {};
          for (const item of err.details) {
            if (item && typeof item === "object" && "path" in item && "message" in item) {
              errorsMap[item.path as string] = item.message as string;
            }
          }
          setFieldErrors(errorsMap);
          if (Object.keys(errorsMap).length === 0) {
            setErrorMsg(err.message || "Invalid lookup details provided.");
          }
        } else {
          setErrorMsg(err.message || "Failed to find complaint. Please try again.");
        }
      } else {
        setErrorMsg("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errorMsg && <Alert type="error">{errorMsg}</Alert>}

      <Field
        id="reference"
        label="Complaint Reference Code"
        required
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        error={fieldErrors.reference}
        hint="The reference format is CMP-XXXXXX (e.g. CMP-A8B9C2)"
        placeholder="CMP-A8B9C2"
        disabled={loading}
      />

      <Field
        id="email"
        type="email"
        label="Submitter Email Address"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        hint="The email address you entered when submitting the complaint"
        placeholder="jane@example.com"
        disabled={loading}
      />

      <div style={{ marginTop: "1rem" }}>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading}
          style={{ width: "100%" }}
        >
          Track complaint
        </Button>
      </div>
    </form>
  );
}
