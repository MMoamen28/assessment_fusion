import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { generateReference, generatePublicToken } from "@/lib/ids";
import { canAssign, canChangeStatus, canChangePriority } from "@/lib/domain/permissions";
import { checkTransition } from "@/lib/domain/workflow";
import {
  NotFoundError,
  ForbiddenError,
  ConflictError,
  InvalidTransitionError,
  ValidationError,
} from "@/lib/errors";
import type {
  CreateComplaintInput,
  ChangeStatusInput,
  ChangePriorityInput,
  ListQueryInput,
} from "@/lib/validation/complaint";
import {
  staffComplaintListSelect,
  complaintDetailSelect,
  assignableUserSelect,
  type ComplaintDetailDto,
  type AssignableUserDto,
} from "./dto";


export async function createComplaint(input: CreateComplaintInput) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const reference = generateReference();
      const publicToken = generatePublicToken();

      return await prisma.$transaction(async (tx) => {
        const complaint = await tx.complaint.create({
          data: {
            reference,
            publicToken,
            title: input.title,
            description: input.description,
            category: input.category,
            submitterName: input.submitterName,
            submitterEmail: input.submitterEmail,
            status: "OPEN",
            priority: "MEDIUM",
            assigneeId: null,
            version: 0,
          },
        });

        await tx.activity.create({
          data: {
            complaintId: complaint.id,
            actorId: null,
            action: "CREATED",
          },
        });

        return { reference, publicToken };
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        attempt < 4
      ) {
        continue;
      }
      throw err;
    }
  }
  throw new ConflictError("Failed to generate unique complaint identifiers");
}

export async function claimComplaint(actor: SessionUser, id: string) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.complaint.updateMany({
      where: {
        id,
        status: "OPEN",
        assigneeId: null,
      },
      data: {
        assigneeId: actor.id,
        status: "IN_REVIEW",
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      const row = await tx.complaint.findUnique({ where: { id } });
      if (!row) {
        throw new NotFoundError("Complaint not found");
      }
      throw new ConflictError("Complaint has already been claimed or is no longer open");
    }

    await tx.activity.create({
      data: {
        complaintId: id,
        actorId: actor.id,
        action: "CLAIMED",
        metadata: { assigneeId: actor.id },
      },
    });

    await tx.activity.create({
      data: {
        complaintId: id,
        actorId: actor.id,
        action: "STATUS_CHANGED",
        metadata: { from: "OPEN", to: "IN_REVIEW" },
      },
    });

    return { success: true };
  });
}

export async function assignComplaint(
  actor: SessionUser,
  id: string,
  assigneeId: string,
  expectedVersion: number,
) {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({ where: { id } });
    if (!complaint) {
      throw new NotFoundError("Complaint not found");
    }

    if (!canAssign(actor, complaint)) {
      throw new ForbiddenError("Only admins can assign complaints, and terminal complaints cannot be assigned");
    }

    const assignee = await tx.user.findUnique({ where: { id: assigneeId } });
    if (!assignee) {
      throw new NotFoundError("Assignee not found");
    }

    const isOpening = complaint.status === "OPEN";
    const updateData: Prisma.ComplaintUncheckedUpdateManyInput = isOpening
      ? {
          assigneeId,
          status: "IN_REVIEW",
          version: { increment: 1 },
        }
      : {
          assigneeId,
          version: { increment: 1 },
        };

    const updated = await tx.complaint.updateMany({
      where: {
        id,
        version: expectedVersion,
      },
      data: updateData,
    });

    if (updated.count === 0) {
      throw new ConflictError("Complaint was modified, reload and retry");
    }

    await tx.activity.create({
      data: {
        complaintId: id,
        actorId: actor.id,
        action: "ASSIGNED",
        metadata: {
          from: complaint.assigneeId,
          to: assigneeId,
        },
      },
    });

    if (isOpening) {
      await tx.activity.create({
        data: {
          complaintId: id,
          actorId: actor.id,
          action: "STATUS_CHANGED",
          metadata: {
            from: "OPEN",
            to: "IN_REVIEW",
          },
        },
      });
    }

    return { success: true };
  });
}

export async function changeStatus(
  actor: SessionUser,
  id: string,
  input: ChangeStatusInput,
) {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({ where: { id } });
    if (!complaint) {
      throw new NotFoundError("Complaint not found");
    }

    if (!canChangeStatus(actor, complaint, input.status)) {
      throw new ForbiddenError("You are not allowed to change the status of this complaint");
    }

    const transitionCheck = checkTransition(complaint.status, input.status, {
      hasAssignee: complaint.assigneeId !== null,
    });
    if (!transitionCheck.ok) {
      throw new InvalidTransitionError(transitionCheck.reason);
    }

    const updated = await tx.complaint.updateMany({
      where: {
        id,
        version: input.expectedVersion,
        status: complaint.status,
      },
      data: {
        status: input.status,
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Complaint was modified, reload and retry");
    }

    const metadata: Prisma.InputJsonObject = input.note
      ? {
          from: complaint.status,
          to: input.status,
          note: input.note,
        }
      : {
          from: complaint.status,
          to: input.status,
        };


    await tx.activity.create({
      data: {
        complaintId: id,
        actorId: actor.id,
        action: "STATUS_CHANGED",
        metadata,
      },
    });

    return { success: true };
  });
}

export async function changePriority(
  actor: SessionUser,
  id: string,
  input: ChangePriorityInput,
) {
  return prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({ where: { id } });
    if (!complaint) {
      throw new NotFoundError("Complaint not found");
    }

    if (!canChangePriority(actor, complaint)) {
      throw new ForbiddenError("You are not allowed to change priority of this complaint");
    }

    if (complaint.priority === input.priority) {
      throw new ValidationError(null, `Priority is already set to ${input.priority}`);
    }

    const updated = await tx.complaint.updateMany({
      where: {
        id,
        version: input.expectedVersion,
      },
      data: {
        priority: input.priority,
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new ConflictError("Complaint was modified, reload and retry");
    }

    await tx.activity.create({
      data: {
        complaintId: id,
        actorId: actor.id,
        action: "PRIORITY_CHANGED",
        metadata: {
          from: complaint.priority,
          to: input.priority,
        },
      },
    });

    return { success: true };
  });
}

export async function listComplaints(filters: ListQueryInput, actor: SessionUser) {
  const where: Prisma.ComplaintWhereInput = {};

  if (filters.q) {
    where.OR = [
      { reference: { contains: filters.q, mode: "insensitive" } },
      { title: { contains: filters.q, mode: "insensitive" } },
      { submitterName: { contains: filters.q, mode: "insensitive" } },
      { submitterEmail: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.status && filters.status.length > 0) {
    where.status = { in: filters.status };
  }

  if (filters.priority && filters.priority.length > 0) {
    where.priority = { in: filters.priority };
  }

  if (filters.assignee) {
    if (filters.assignee === "me") {
      where.assigneeId = actor.id;
    } else if (filters.assignee === "unassigned") {
      where.assigneeId = null;
    } else {
      where.assigneeId = filters.assignee;
    }
  }

  if (filters.category) {
    where.category = filters.category;
  }

  let orderBy: Prisma.ComplaintOrderByWithRelationInput[];
  if (filters.sort === "oldest") {
    orderBy = [{ createdAt: "asc" }, { id: "asc" }];
  } else if (filters.sort === "priority") {
    orderBy = [{ priority: "desc" }, { createdAt: "desc" }, { id: "desc" }];
  } else {
    orderBy = [{ createdAt: "desc" }, { id: "desc" }];
  }

  const page = filters.page;
  const pageSize = filters.pageSize;
  const skip = (page - 1) * pageSize;

  const [items, total] = await prisma.$transaction([
    prisma.complaint.findMany({
      where,
      select: staffComplaintListSelect,
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.complaint.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function getComplaintDetail(id: string): Promise<ComplaintDetailDto> {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: complaintDetailSelect,
  });

  if (!complaint) {
    throw new NotFoundError("Complaint not found");
  }

  return complaint;
}

export async function getStats(): Promise<Record<string, number>> {
  const [grouped, unassignedOpen] = await Promise.all([
    prisma.complaint.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.complaint.count({
      where: {
        status: "OPEN",
        assigneeId: null,
      },
    }),
  ]);

  const counts: Record<string, number> = {
    OPEN: 0,
    IN_REVIEW: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REJECTED: 0,
    unassignedOpen,
  };

  for (const group of grouped) {
    counts[group.status] = group._count._all;
  }

  return counts;
}

export async function getAssignableUsers(): Promise<AssignableUserDto[]> {
  return prisma.user.findMany({
    select: assignableUserSelect,
    orderBy: { name: "asc" },
  });
}

