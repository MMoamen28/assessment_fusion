export type Role = "AGENT" | "ADMIN";
export type Status = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED" | "REJECTED";
export type Priority = "LOW" | "MEDIUM" | "HIGH";
export type ActivityAction =
  | "CREATED"
  | "CLAIMED"
  | "ASSIGNED"
  | "STATUS_CHANGED"
  | "COMMENTED"
  | "PRIORITY_CHANGED";

export interface SessionUserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface ComplaintListItem {
  id: string;
  reference: string;
  title: string;
  category: string;
  status: Status;
  priority: Priority;
  assignee: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintListResponse {
  items: ComplaintListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ComplaintDetailComment {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
  } | null;
}

export interface ComplaintDetailActivity {
  id: string;
  action: ActivityAction;
  metadata: unknown;
  createdAt: string;
  actor: {
    id: string;
    name: string;
  } | null;
}

export interface ComplaintDetail {
  id: string;
  reference: string;
  publicToken: string;
  title: string;
  description: string;
  category: string;
  status: Status;
  priority: Priority;
  submitterName: string;
  submitterEmail: string;
  assigneeId: string | null;
  assignee: {
    id: string;
    name: string;
    role: Role;
  } | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  comments: ComplaintDetailComment[];
  activities: ComplaintDetailActivity[];
}

export interface PublicComment {
  body: string;
  createdAt: string;
  authorRole: string;
}

export interface PublicTimelineItem {
  status: string;
  at: string;
}

export interface PublicComplaint {
  reference: string;
  title: string;
  category: string;
  status: Status;
  priority: Priority;
  description: string;
  createdAt: string;
  updatedAt: string;
  comments: PublicComment[];
  timeline: PublicTimelineItem[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
