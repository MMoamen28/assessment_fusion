"use client";

import React, { useState } from "react";
import { assignComplaint } from "@/lib/api/client";
import { useAction } from "./useAction";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import type { AssignableUser } from "@/types/api";

interface AssignFormProps {
  complaintId: string;
  expectedVersion: number;
  assignableUsers: AssignableUser[];
  currentAssigneeId?: string | null;
}

export function AssignForm({
  complaintId,
  expectedVersion,
  assignableUsers,
  currentAssigneeId,
}: AssignFormProps) {
  const [selectedUser, setSelectedUser] = useState(currentAssigneeId ?? "");

  const { pending, alertError, fieldErrors, successMessage, execute } = useAction(
    (assigneeId: string) => assignComplaint(complaintId, assigneeId, expectedVersion),
    {
      successMessage: "Complaint assigned successfully.",
    },
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    await execute(selectedUser);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      {alertError && <Alert type="error">{alertError}</Alert>}
      {successMessage && <Alert type="success">{successMessage}</Alert>}

      <div className="field-group" style={{ marginBottom: "0.75rem" }}>
        <label htmlFor="assign-staff-select" className="field-label">
          Assign to Staff Member
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <select
            id="assign-staff-select"
            className={`select ${fieldErrors.assigneeId ? "select-error" : ""}`}
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            disabled={pending}
            required
          >
            <option value="">Select staff member...</option>
            {assignableUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            disabled={pending || !selectedUser}
          >
            Assign
          </Button>
        </div>
        {fieldErrors.assigneeId && (
          <span className="field-error" role="alert">
            {fieldErrors.assigneeId}
          </span>
        )}
      </div>
    </form>
  );
}
