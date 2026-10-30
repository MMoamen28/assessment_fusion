"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createStaffComplaint, ApiClientError } from "@/lib/api/client";
import { Field } from "@/components/ui/Field";
import { SelectField } from "@/components/ui/SelectField";
import { TextAreaField } from "@/components/ui/TextAreaField";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { COMPLAINT_CATEGORIES } from "@/lib/domain/constants";
import type { Priority } from "@/types/api";

export function NewComplaintForm() {
  const router = useRouter();

  const [submitterName, setSubmitterName] = useState("");
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [category, setCategory] = useState<string>(COMPLAINT_CATEGORIES[0]);
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setGeneralError(null);
    setLoading(true);

    try {
      const res = await createStaffComplaint({
        submitterName: submitterName.trim(),
        submitterEmail: submitterEmail.trim(),
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
      });

      router.push(`/complaints/${res.id}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (Array.isArray(err.details)) {
          const errorsMap: Record<string, string> = {};
          const unhandled: string[] = [];
          for (const item of err.details) {
            if (item && typeof item === "object" && "path" in item && "message" in item) {
              const path = String(item.path);
              const msg = String(item.message);
              errorsMap[path] = msg;
            }
          }
          setFieldErrors(errorsMap);
          if (unhandled.length > 0) {
            setGeneralError(unhandled.join(". "));
          } else if (Object.keys(errorsMap).length === 0) {
            setGeneralError(err.message || "Failed to create complaint.");
          }
        } else {
          setGeneralError(err.message || "Failed to create complaint.");
        }
      } else {
        setGeneralError("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card" style={{ maxWidth: "700px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem" }}>
        Log New Complaint
      </h2>
      <p className="card-desc" style={{ marginBottom: "1.5rem" }}>
        Record a complaint on behalf of a citizen or customer.
      </p>

      {generalError && <Alert type="error">{generalError}</Alert>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <Field
          label="Complainant Name"
          name="submitterName"
          required
          value={submitterName}
          onChange={(e) => setSubmitterName(e.target.value)}
          error={fieldErrors.submitterName}
          disabled={loading}
        />

        <Field
          label="Complainant Email"
          name="submitterEmail"
          type="email"
          required
          value={submitterEmail}
          onChange={(e) => setSubmitterEmail(e.target.value)}
          error={fieldErrors.submitterEmail}
          disabled={loading}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "0.5rem" }}>
        <SelectField
          label="Category"
          name="category"
          required
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          error={fieldErrors.category}
          disabled={loading}
          options={COMPLAINT_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
        />

        <SelectField
          label="Priority"
          name="priority"
          required
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          error={fieldErrors.priority}
          disabled={loading}
          options={[
            { value: "LOW", label: "Low" },
            { value: "MEDIUM", label: "Medium (Default)" },
            { value: "HIGH", label: "High" },
          ]}
        />
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        <Field
          label="Subject / Title"
          name="title"
          required
          placeholder="Short, descriptive summary of the complaint"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={fieldErrors.title}
          disabled={loading}
        />
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        <TextAreaField
          label="Detailed Description"
          name="description"
          required
          rows={5}
          placeholder="Provide clear facts, dates, invoice numbers, or other relevant details (minimum 10 characters)..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          error={fieldErrors.description}
          disabled={loading}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.5rem" }}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={loading}
        >
          Create complaint
        </Button>
      </div>
    </form>
  );
}
