"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { replyToComplaint, ApiClientError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ReplyFormProps {
  publicToken: string;
}

const MAX_CHARS = 2000;

export function ReplyForm({ publicToken }: ReplyFormProps) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const remainingChars = MAX_CHARS - body.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;

    setPending(true);
    setAlertError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      await replyToComplaint(publicToken, body.trim());
      setSuccessMessage("Your reply has been submitted successfully.");
      setBody("");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 404) {
          setAlertError("Complaint not found.");
        } else if (err.status === 409) {
          setAlertError(err.message || "This complaint is closed and no longer accepts replies.");
        } else if (err.status === 429) {
          setAlertError(err.message || "Too many requests. Please try again later.");
        } else if (err.status === 400) {
          if (Array.isArray(err.details)) {
            const mapped: Record<string, string> = {};
            for (const item of err.details) {
              if (item && typeof item === "object" && "path" in item && "message" in item) {
                mapped[String(item.path)] = String(item.message);
              }
            }
            setFieldErrors(mapped);
            if (Object.keys(mapped).length === 0) {
              setAlertError(err.message || "Invalid input provided.");
            }
          } else {
            setAlertError(err.message || "Invalid input provided.");
          }
        } else {
          setAlertError(err.message || "An unexpected error occurred. Please try again.");
        }
      } else {
        setAlertError("An unexpected network error occurred. Please try again.");
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1.5rem" }}>
      {alertError && <Alert type="error">{alertError}</Alert>}
      {successMessage && <Alert type="success">{successMessage}</Alert>}

      <div className="field-group" style={{ marginBottom: "0.5rem" }}>
        <label htmlFor="reply-body-textarea" className="field-label">
          Reply to this complaint
        </label>
        <textarea
          id="reply-body-textarea"
          className={`textarea ${fieldErrors.body ? "textarea-error" : ""}`}
          rows={3}
          maxLength={MAX_CHARS}
          required
          placeholder="Type your response or additional details here..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "0.25rem",
          }}
        >
          {fieldErrors.body ? (
            <span className="field-error" role="alert">
              {fieldErrors.body}
            </span>
          ) : (
            <span />
          )}
          <span
            style={{
              fontSize: "0.75rem",
              color: remainingChars < 0 ? "var(--danger)" : "var(--text-muted)",
            }}
          >
            {remainingChars} characters remaining
          </span>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={pending}
        disabled={pending || !body.trim() || remainingChars < 0}
      >
        Submit reply
      </Button>
    </form>
  );
}
