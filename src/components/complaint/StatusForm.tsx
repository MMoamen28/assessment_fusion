"use client";

import React, { useState } from "react";
import { changeComplaintStatus } from "@/lib/api/client";
import { useAction } from "./useAction";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { Status } from "@/types/api";

interface StatusFormProps {
  complaintId: string;
  currentStatus: Status;
  expectedVersion: number;
  allowedStatuses: Status[];
}

export function StatusForm({
  complaintId,
  currentStatus,
  expectedVersion,
  allowedStatuses,
}: StatusFormProps) {
  const [targetStatus, setTargetStatus] = useState<Status | "">(
    allowedStatuses[0] ?? "",
  );
  const [note, setNote] = useState("");

  const { pending, alertError, fieldErrors, successMessage, execute } = useAction(
    (status: Status, statusNote?: string) =>
      changeComplaintStatus(complaintId, status, expectedVersion, statusNote),
    {
      successMessage: "Status updated successfully.",
      onSuccess: () => {
        setNote("");
      },
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStatus) return;
    await execute(targetStatus, note.trim() || undefined);
  };

  const getStatusLabel = (status: Status) => {
    if (currentStatus === "RESOLVED" && status === "IN_REVIEW") {
      return "Reopen";
    }
    switch (status) {
      case "OPEN":
        return "Open";
      case "IN_REVIEW":
        return "In Review";
      case "RESOLVED":
        return "Resolved";
      case "CLOSED":
        return "Closed";
      case "REJECTED":
        return "Rejected";
      default:
        return status;
    }
  };

  if (allowedStatuses.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      {alertError && <Alert type="error">{alertError}</Alert>}
      {successMessage && <Alert type="success">{successMessage}</Alert>}

      <div className="field-group" style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="change-status-select" className="field-label">
          Change Status
        </label>
        <select
          id="change-status-select"
          className={`select ${fieldErrors.status ? "select-error" : ""}`}
          value={targetStatus}
          onChange={(e) => setTargetStatus(e.target.value as Status)}
          disabled={pending}
          required
        >
          <option value="" disabled>
            Select next status...
          </option>
          {allowedStatuses.map((st) => (
            <option key={st} value={st}>
              {getStatusLabel(st)}
            </option>
          ))}
        </select>
        {fieldErrors.status && (
          <span className="field-error" role="alert">
            {fieldErrors.status}
          </span>
        )}
      </div>

      <div className="field-group" style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="status-note" className="field-label">
          Status Change Note (Optional)
        </label>
        <textarea
          id="status-note"
          className={`textarea ${fieldErrors.note ? "textarea-error" : ""}`}
          rows={2}
          maxLength={1000}
          placeholder="Add an optional explanation for this status update (max 1000 characters)..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={pending}
        />
        {fieldErrors.note && (
          <span className="field-error" role="alert">
            {fieldErrors.note}
          </span>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={pending}
        disabled={pending || !targetStatus}
      >
        Update status
      </Button>
    </form>
  );
}
