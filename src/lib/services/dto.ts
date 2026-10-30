import type { Status, Priority, Prisma } from "@prisma/client";

export const staffComplaintListSelect = {
  id: true,
  reference: true,
  title: true,
  category: true,
  status: true,
  priority: true,
  assignee: {
    select: {
      id: true,
      name: true,
    },
  },
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ComplaintSelect;

export type StaffComplaintListItem = Prisma.ComplaintGetPayload<{
  select: typeof staffComplaintListSelect;
}>;

export const complaintDetailSelect = {
  id: true,
  reference: true,
  publicToken: true,
  title: true,
  description: true,
  category: true,
  status: true,
  priority: true,
  submitterName: true,
  submitterEmail: true,
  assigneeId: true,
  assignee: {
    select: {
      id: true,
      name: true,
      role: true,
    },
  },
  version: true,
  createdAt: true,
  updatedAt: true,
  comments: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      body: true,
      isInternal: true,
      createdAt: true,
      author: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  activities: {
    orderBy: { createdAt: "asc" as const },
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      actor: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.ComplaintSelect;

export type ComplaintDetailDto = Prisma.ComplaintGetPayload<{
  select: typeof complaintDetailSelect;
}>;

export const publicComplaintSelect = {
  reference: true,
  title: true,
  category: true,
  status: true,
  priority: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  comments: {
    where: { isInternal: false },
    orderBy: { createdAt: "asc" as const },
    select: {
      body: true,
      createdAt: true,
      author: {
        select: {
          role: true,
        },
      },
    },
  },
  activities: {
    where: { action: { in: ["CREATED" as const, "STATUS_CHANGED" as const] } },
    orderBy: { createdAt: "asc" as const },
    select: {
      action: true,
      metadata: true,
      createdAt: true,
    },
  },
} satisfies Prisma.ComplaintSelect;

type RawPublicQueryResult = Prisma.ComplaintGetPayload<{
  select: typeof publicComplaintSelect;
}>;

export interface PublicCommentDto {
  body: string;
  createdAt: Date;
  authorRole: string;
}

export interface PublicTimelineItemDto {
  status: string;
  at: Date;
}

export interface PublicComplaintDto {
  reference: string;
  title: string;
  category: string;
  status: Status;
  priority: Priority;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  comments: PublicCommentDto[];
  timeline: PublicTimelineItemDto[];
}

export function toPublicComplaintDto(row: RawPublicQueryResult): PublicComplaintDto {
  const comments: PublicCommentDto[] = row.comments.map((c) => ({
    body: c.body,
    createdAt: c.createdAt,
    authorRole: c.author ? "Support team" : "Complainant",
  }));

  const timeline: PublicTimelineItemDto[] = row.activities.map((a) => {
    let status = "OPEN";
    if (
      a.action === "STATUS_CHANGED" &&
      a.metadata &&
      typeof a.metadata === "object" &&
      "to" in a.metadata &&
      typeof (a.metadata as { to?: unknown }).to === "string"
    ) {
      status = (a.metadata as { to: string }).to;
    }
    return {
      status,
      at: a.createdAt,
    };
  });

  return {
    reference: row.reference,
    title: row.title,
    category: row.category,
    status: row.status,
    priority: row.priority,
    description: row.description,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    comments,
    timeline,
  };
}

export const assignableUserSelect = {
  id: true,
  name: true,
  role: true,
} satisfies Prisma.UserSelect;

export type AssignableUserDto = Prisma.UserGetPayload<{
  select: typeof assignableUserSelect;
}>;
