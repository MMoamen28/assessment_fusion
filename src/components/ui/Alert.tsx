import React from "react";

export interface AlertProps {
  type?: "error" | "success" | "info" | "warning";
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({
  type = "info",
  title,
  children,
  className = "",
}: AlertProps) {
  const classes = ["alert", `alert-${type}`, className].filter(Boolean).join(" ");

  return (
    <div className={classes} role={type === "error" ? "alert" : "status"}>
      {title && <strong className="alert-title">{title}</strong>}
      <div>{children}</div>
    </div>
  );
}
