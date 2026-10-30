import type { Priority } from "@/types/api";

const priorityLabels: Record<Priority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function PriorityBadge({ priority, className = "" }: PriorityBadgeProps) {
  const modifier = priority.toLowerCase();
  const classes = ["badge", `badge-priority-${modifier}`, className].filter(Boolean).join(" ");

  return <span className={classes}>{priorityLabels[priority] ?? priority}</span>;
}
