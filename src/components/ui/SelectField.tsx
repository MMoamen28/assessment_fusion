import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectFieldProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  options?: readonly string[] | readonly SelectOption[];
  placeholderOption?: string;
}

export function SelectField({
  label,
  id,
  error,
  hint,
  options = [],
  placeholderOption,
  className = "",
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const errorId = `${selectId}-error`;
  const hintId = `${selectId}-hint`;

  return (
    <div className="field-group">
      <label htmlFor={selectId} className="field-label">
        {label}
        {props.required && <span className="field-required"> *</span>}
      </label>
      <select
        id={selectId}
        className={["select", error ? "select-error" : "", className]
          .filter(Boolean)
          .join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={
          [hint ? hintId : "", error ? errorId : ""].filter(Boolean).join(" ") ||
          undefined
        }
        {...props}
      >
        {placeholderOption !== undefined && (
          <option value="">{placeholderOption}</option>
        )}
        {options.map((opt) => {
          if (typeof opt === "string") {
            return (
              <option key={opt} value={opt}>
                {opt}
              </option>
            );
          }
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
        {children}
      </select>
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
