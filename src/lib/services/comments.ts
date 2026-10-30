import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import { canComment } from "@/lib/domain/permissions";
import { NotFoundError, ForbiddenError } from "@/lib/errors";
import type { AddCommentInput } from "@/lib/validation/complaint";
import { eventBus } from "@/lib/realtime/bus";

export async function addComment(
  actor: SessionUser,
  complaintId: string,
  input: AddCommentInput,
) {
  const comment = await prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({
      where: { id: complaintId },
      select: { id: true, status: true, assigneeId: true },
    });
    if (!complaint) {
      throw new NotFoundError("Complaint not found");
    }
    if (!canComment(actor, complaint)) {
      throw new ForbiddenError("Cannot comment on closed complaints");
    }
    const comment = await tx.comment.create({
      data: {
        complaintId,
        authorId: actor.id,
        body: input.body,
        isInternal: input.internal,
      },
      select: {
        id: true,
        complaintId: true,
        authorId: true,
        body: true,
        isInternal: true,
        createdAt: true,
      },
    });
    await tx.activity.create({
      data: {
        complaintId,
        actorId: actor.id,
        action: "COMMENTED",
        metadata: { internal: input.internal },
      },
    });
    return comment;
  });

  eventBus.publish({
    type: "comment.added",
    complaintId,
    publicVisible: !input.internal,
    at: new Date().toISOString(),
  });

  return comment;
}
