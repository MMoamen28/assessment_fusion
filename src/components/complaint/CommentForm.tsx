"use client";

import React, { useState } from "react";
import { addComment } from "@/lib/api/client";
import { useAction } from "./useAction";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface CommentFormProps {
  complaintId: string;
}

export function CommentForm({ complaintId }: CommentFormProps) {
  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(true);

  const { pending, alertError, fieldErrors, successMessage, execute } = useAction(
    (commentBody: string, internal: boolean) =>
      addComment(complaintId, commentBody, internal),
    {
      successMessage: "Comment added successfully.",
      onSuccess: () => {
        setBody("");
      },
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    await execute(body.trim(), isInternal);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      {alertError && <Alert type="error">{alertError}</Alert>}
      {successMessage && <Alert type="success">{successMessage}</Alert>}

      <div className="field-group" style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="comment-body-textarea" className="field-label">
          Add a Comment or Resolution Note
        </label>
        <textarea
          id="comment-body-textarea"
          className={`textarea ${fieldErrors.body ? "textarea-error" : ""}`}
          rows={3}
          maxLength={2000}
          required
          placeholder="Enter comment, update or resolution findings (max 2000 characters)..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
        />
        {fieldErrors.body && (
          <span className="field-error" role="alert">
            {fieldErrors.body}
          </span>
        )}
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="comment-internal-checkbox"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--text-main)",
            cursor: "pointer",
          }}
        >
          <input
            id="comment-internal-checkbox"
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            disabled={pending}
            style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
          />
          <span>Internal note (not visible to the complainant)</span>
        </label>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={pending}
        disabled={pending || !body.trim()}
      >
        Add comment
      </Button>
    </form>
  );
}
