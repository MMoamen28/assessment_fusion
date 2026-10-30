"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/client";

export interface ActionState {
  pending: boolean;
  alertError: string | null;
  fieldErrors: Record<string, string>;
  successMessage: string | null;
}

export function useAction<TArgs extends unknown[], TResult = unknown>(
  actionFn: (...args: TArgs) => Promise<TResult>,
  options?: {
    successMessage?: string;
    onSuccess?: (res: TResult) => void;
  },
) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const execute = async (...args: TArgs): Promise<boolean> => {
    setPending(true);
    setAlertError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      const res = await actionFn(...args);
      const msg = options?.successMessage ?? "Action completed successfully.";
      setSuccessMessage(msg);
      router.refresh();
      if (options?.onSuccess) {
        options.onSuccess(res);
      }
      return true;
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.status === 409) {
          setAlertError(
            "This complaint was just changed by someone else. The latest version has been loaded, please review and try again.",
          );
          router.refresh();
        } else if (err.status === 403 || err.status === 422) {
          setAlertError(err.message || "Operation not allowed.");
        } else if (err.status === 400) {
          if (Array.isArray(err.details)) {
            const mapped: Record<string, string> = {};
            const unhandled: string[] = [];
            for (const item of err.details) {
              if (item && typeof item === "object" && "path" in item && "message" in item) {
                mapped[String(item.path)] = String(item.message);
              } else if (item && typeof item === "object" && "message" in item) {
                unhandled.push(String(item.message));
              }
            }
            setFieldErrors(mapped);
            if (unhandled.length > 0) {
              setAlertError(unhandled.join(". "));
            } else if (Object.keys(mapped).length === 0) {
              setAlertError(err.message || "Invalid input provided.");
            }
          } else {
            setAlertError(err.message || "Invalid input provided.");
          }
        } else {
          setAlertError(err.message || "An unexpected error occurred. Please try again.");
        }
      } else {
        setAlertError("An unexpected network error occurred. Please try again.");
      }
      return false;
    } finally {
      setPending(false);
    }
  };

  const clearAlert = () => {
    setAlertError(null);
    setSuccessMessage(null);
  };

  return {
    pending,
    alertError,
    fieldErrors,
    successMessage,
    execute,
    clearAlert,
  };
}
