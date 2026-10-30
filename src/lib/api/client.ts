import type {
  ApiErrorBody,
  SessionUserDto,
  SubmitComplaintInput,
  SubmitComplaintResponse,
  LookupComplaintResponse,
  ActionResult,
  AddCommentResponse,
  Status,
  Priority,
  PublicComment,
} from "@/types/api";

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

export async function submitComplaint(
  input: SubmitComplaintInput,
): Promise<SubmitComplaintResponse> {
  return api<SubmitComplaintResponse>("/api/complaints/public", {
    method: "POST",
    body: input,
  });
}

export async function lookupComplaint(
  reference: string,
  email: string,
): Promise<LookupComplaintResponse> {
  return api<LookupComplaintResponse>("/api/public/lookup", {
    method: "POST",
    body: { reference, email },
  });
}

export async function claimComplaint(id: string): Promise<ActionResult> {
  return api<ActionResult>(`/api/complaints/${id}/claim`, {
    method: "POST",
  });
}

export async function assignComplaint(
  id: string,
  assigneeId: string,
  expectedVersion: number,
): Promise<ActionResult> {
  return api<ActionResult>(`/api/complaints/${id}/assign`, {
    method: "POST",
    body: { assigneeId, expectedVersion },
  });
}

export async function changeComplaintStatus(
  id: string,
  status: Status,
  expectedVersion: number,
  note?: string,
): Promise<ActionResult> {
  return api<ActionResult>(`/api/complaints/${id}/status`, {
    method: "POST",
    body: { status, expectedVersion, note: note ? note.trim() : undefined },
  });
}

export async function changeComplaintPriority(
  id: string,
  priority: Priority,
  expectedVersion: number,
): Promise<ActionResult> {
  return api<ActionResult>(`/api/complaints/${id}/priority`, {
    method: "POST",
    body: { priority, expectedVersion },
  });
}

export async function addComment(
  id: string,
  body: string,
  isInternal: boolean,
): Promise<AddCommentResponse> {
  return api<AddCommentResponse>(`/api/complaints/${id}/comments`, {
    method: "POST",
    body: { body, internal: isInternal },
  });
}

export async function replyToComplaint(
  token: string,
  body: string,
): Promise<PublicComment> {
  return api<PublicComment>(`/api/public/complaints/${token}/comments`, {
    method: "POST",
    body: { body },
  });
}

export interface CreateStaffComplaintResponse {
  id: string;
  reference: string;
  publicToken: string;
}

export async function createStaffComplaint(input: {
  submitterName: string;
  submitterEmail: string;
  category: string;
  title: string;
  description: string;
  priority?: Priority;
}): Promise<CreateStaffComplaintResponse> {
  return api<CreateStaffComplaintResponse>("/api/complaints", {
    method: "POST",
    body: input,
  });
}

export interface RegisterResponse {
  user: SessionUserDto;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<RegisterResponse> {
  return api<RegisterResponse>("/api/auth/register", {
    method: "POST",
    body: input,
  });
}
