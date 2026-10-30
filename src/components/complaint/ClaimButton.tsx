"use client";

import React from "react";
import { claimComplaint } from "@/lib/api/client";
import { useAction } from "./useAction";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

interface ClaimButtonProps {
  complaintId: string;
}

export function ClaimButton({ complaintId }: ClaimButtonProps) {
  const { pending, alertError, successMessage, execute } = useAction(
    () => claimComplaint(complaintId),
    {
      successMessage: "You have successfully claimed this complaint.",
    },
  );

  return (
    <div>
      {alertError && <Alert type="error">{alertError}</Alert>}
      {successMessage && <Alert type="success">{successMessage}</Alert>}
      <Button
        type="button"
        variant="primary"
        loading={pending}
        disabled={pending}
        onClick={() => execute()}
      >
        Claim complaint
      </Button>
    </div>
  );
}
