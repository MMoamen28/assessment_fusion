import React from "react";

export interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({
  label,
  id,
  error,
  hint,
  className = "",
  ...props
}: FieldProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className="field-group">
      <label htmlFor={inputId} className="field-label">
        {label}
        {props.required && <span className="field-required"> *</span>}
      </label>
      <input
        id={inputId}
        className={["input", error ? "input-error" : "", className].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={[hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
        {...props}
      />
      {hint && (
        <span id={hintId} className="field-hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field-error" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
