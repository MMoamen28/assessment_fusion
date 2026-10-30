import React from "react";

export interface TextAreaFieldProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextAreaField({
  label,
  id,
  error,
  hint,
  className = "",
  rows = 4,
  ...props
}: TextAreaFieldProps) {
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
      <textarea
        id={inputId}
        rows={rows}
        className={["input", "textarea", error ? "input-error" : "", className].filter(Boolean).join(" ")}
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
