"use client";

import React, { useState } from "react";
import { changeComplaintPriority } from "@/lib/api/client";
import { useAction } from "./useAction";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { Priority } from "@/types/api";

interface PriorityFormProps {
  complaintId: string;
  currentPriority: Priority;
  expectedVersion: number;
}

const ALL_PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH"];

export function PriorityForm({
  complaintId,
  currentPriority,
  expectedVersion,
}: PriorityFormProps) {
  const [selectedPriority, setSelectedPriority] = useState<Priority>(currentPriority);

  const { pending, alertError, fieldErrors, successMessage, execute } = useAction(
    (priority: Priority) =>
      changeComplaintPriority(complaintId, priority, expectedVersion),
    {
      successMessage: "Priority updated successfully.",
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPriority || selectedPriority === currentPriority) return;
    await execute(selectedPriority);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      {alertError && <Alert type="error">{alertError}</Alert>}
      {successMessage && <Alert type="success">{successMessage}</Alert>}

      <div className="field-group" style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="change-priority-select" className="field-label">
          Change Priority
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            id="change-priority-select"
            className={`select ${fieldErrors.priority ? "select-error" : ""}`}
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as Priority)}
            disabled={pending}
          >
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p} {p === currentPriority ? "(Current)" : ""}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            disabled={pending || selectedPriority === currentPriority}
          >
            Update priority
          </Button>
        </div>
        {fieldErrors.priority && (
          <span className="field-error" role="alert">
            {fieldErrors.priority}
          </span>
        )}
      </div>
    </form>
  );
}
