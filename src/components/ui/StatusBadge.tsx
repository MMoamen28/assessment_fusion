import type { Status } from "@/types/api";

const statusLabels: Record<Status, string> = {
  OPEN: "Open",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REJECTED: "Rejected",
};

export interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const modifier = status.toLowerCase().replace("_", "-");
  const classes = ["badge", `badge-status-${modifier}`, className].filter(Boolean).join(" ");

  return <span className={classes}>{statusLabels[status] ?? status}</span>;
}
