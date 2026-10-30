"use client";

import React, { useState } from "react";
import Link from "next/link";
import { submitComplaint, ApiClientError } from "@/lib/api/client";
import { Field } from "@/components/ui/Field";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { COMPLAINT_CATEGORIES } from "@/lib/domain/constants";
import type { SubmitComplaintResponse } from "@/types/api";

export function SubmitComplaintForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [successData, setSuccessData] = useState<SubmitComplaintResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [copyFallbackMsg, setCopyFallbackMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setLoading(true);

    try {
      const res = await submitComplaint({
        submitterName: name.trim(),
        submitterEmail: email.trim(),
        category: category.trim(),
        title: title.trim(),
        description: description.trim(),
      });
      setSuccessData(res);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (Array.isArray(err.details)) {
          const errorsMap: Record<string, string> = {};
          const unhandled: string[] = [];
          for (const item of err.details) {
            if (item && typeof item === "object" && "path" in item && "message" in item) {
              const path = String(item.path);
              const msg = String(item.message);
              if (
                [
                  "submitterName",
                  "name",
                  "submitterEmail",
                  "email",
                  "category",
                  "title",
                  "description",
                ].includes(path)
              ) {
                errorsMap[path] = msg;
              } else {
                unhandled.push(msg);
              }
            }
          }
          setFieldErrors(errorsMap);
          if (unhandled.length > 0) {
            setGeneralError(unhandled.join(". "));
          } else if (Object.keys(errorsMap).length === 0) {
            setGeneralError(err.message || "Failed to submit complaint. Please check your entries.");
          }
        } else {
          setGeneralError(err.message || "Failed to submit complaint.");
        }
      } else {
        setGeneralError("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (successData) {
    const trackingPath = `/track/${successData.publicToken}`;
    const fullTrackingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}${trackingPath}`
        : trackingPath;

    const handleCopy = async () => {
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(fullTrackingUrl);
          setCopied(true);
          setCopyFallbackMsg(null);
          setTimeout(() => setCopied(false), 3000);
        } else {
          throw new Error("Clipboard API unavailable");
        }
      } catch {
        setCopyFallbackMsg("Please select and copy the URL from the input box manually.");
      }
    };

    return (
      <div className="card" style={{ maxWidth: "650px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "2rem", color: "var(--success-text)", marginBottom: "0.25rem" }}>
            ✓
          </div>
          <h2 className="card-title" style={{ fontSize: "1.5rem" }}>
            Complaint Submitted Successfully
          </h2>
          <p className="card-desc">
            Your complaint has been registered and queued for investigation.
          </p>
        </div>

        <div
          style={{
            background: "var(--bg-app)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-sm)",
            padding: "1rem",
            marginBottom: "1.25rem",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>
            REFERENCE NUMBER
          </div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", letterSpacing: "1px" }}>
            {successData.reference}
          </div>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="tracking-url-input">
            Private Tracking Link
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id="tracking-url-input"
              readOnly
              value={fullTrackingUrl}
              className="input"
              onFocus={(e) => e.target.select()}
            />
            <Button type="button" variant="secondary" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
          {copyFallbackMsg && (
            <span className="field-hint" style={{ color: "var(--danger)" }}>
              {copyFallbackMsg}
            </span>
          )}
        </div>

        <Alert type="warning">
          Save this link and reference. You will need them to check your complaint later.
        </Alert>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <Link
            href={trackingPath}
            className="btn btn-primary"
            style={{ flex: 1, textAlign: "center" }}
          >
            View complaint status &rarr;
          </Link>
          <Link href="/" className="btn btn-secondary">
            Return home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: "650px", margin: "0 auto" }}>
      {generalError && <Alert type="error">{generalError}</Alert>}

      <div className="card">
        <h2 className="card-title">Submit a Complaint</h2>
        <p className="card-desc">
          Please fill in the details below. All submissions receive a tracking code to check real-time progress.
        </p>

        <Field
          id="name"
          label="Your Full Name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.submitterName}
          disabled={loading}
          placeholder="Jane Doe"
        />

        <Field
          id="email"
          type="email"
          label="Email Address"
          required
          maxLength={255}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.submitterEmail}
          hint="We will use this address to verify your identity when tracking."
          disabled={loading}
          placeholder="jane@example.com"
        />

        <SelectField
          id="category"
          label="Category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          error={fieldErrors.category}
          disabled={loading}
          placeholderOption="Select a category..."
          options={COMPLAINT_CATEGORIES}
        />

        <Field
          id="title"
          label="Complaint Title / Subject"
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fieldErrors.title}
          disabled={loading}
          placeholder="Brief summary of the issue"
        />

        <TextAreaField
          id="description"
          label="Detailed Description"
          required
          minLength={10}
          maxLength={5000}
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors.description}
          hint="Provide clear details, dates, and relevant facts (minimum 10 characters)."
          disabled={loading}
          placeholder="Describe what occurred, who was involved, and what outcome you are requesting..."
        />

        <div style={{ marginTop: "1rem" }}>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading}
            style={{ width: "100%" }}
          >
            Submit complaint
          </Button>
        </div>
      </div>
    </form>
  );
}
