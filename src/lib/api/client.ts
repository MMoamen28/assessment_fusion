import type { ApiErrorBody, SessionUserDto } from "@/types/api";

export class ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

export async function api<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = {};

  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(path, {
    method,
    headers,
    body,
    credentials: "same-origin",
  });

  if (!res.ok) {
    let errorCode = "HTTP_ERROR";
    let errorMessage = res.statusText || "Request failed";
    let errorDetails: unknown;

    try {
      const data = (await res.json()) as ApiErrorBody;
      if (data?.error) {
        errorCode = data.error.code || errorCode;
        errorMessage = data.error.message || errorMessage;
        errorDetails = data.error.details;
      }
    } catch {
      // Response was not JSON, fallback to standard HTTP status
    }

    throw new ApiClientError(res.status, errorCode, errorMessage, errorDetails);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  return (await res.json()) as T;
}

export async function login(
  email: string,
  password: string,
): Promise<{ user: SessionUserDto }> {
  return api<{ user: SessionUserDto }>("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function logout(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export async function getMe(): Promise<{ user: SessionUserDto }> {
  return api<{ user: SessionUserDto }>("/api/auth/me", {
    method: "GET",
  });
}
