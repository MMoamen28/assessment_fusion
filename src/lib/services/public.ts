import { prisma } from "@/lib/db";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { addCommentSchema } from "@/lib/validation/complaint";
import { eventBus } from "@/lib/realtime/bus";
import {
  publicComplaintSelect,
  toPublicComplaintDto,
  type PublicComplaintDto,
  type PublicCommentDto,
} from "./dto";

export async function getPublicComplaint(publicToken: string): Promise<PublicComplaintDto> {
  const complaint = await prisma.complaint.findUnique({
    where: { publicToken },
    select: publicComplaintSelect,
  });

  if (!complaint) {
    throw new NotFoundError("Complaint not found");
  }

  return toPublicComplaintDto(complaint);
}

export async function lookupPublicToken(
  reference: string,
  email: string,
): Promise<{ publicToken: string }> {
  const complaint = await prisma.complaint.findFirst({
    where: {
      reference: { equals: reference.trim(), mode: "insensitive" },
      submitterEmail: { equals: email.trim().toLowerCase(), mode: "insensitive" },
    },
    select: {
      publicToken: true,
    },
  });

  if (!complaint) {
    throw new NotFoundError("Complaint not found with the provided details");
  }

  return { publicToken: complaint.publicToken };
}

export async function addComplainantComment(
  publicToken: string,
  body: string,
): Promise<PublicCommentDto> {
  const trimmedBody = addCommentSchema.shape.body.parse(body);

  let complaintId = "";
  const commentDto = await prisma.$transaction(async (tx) => {
    const complaint = await tx.complaint.findUnique({
      where: { publicToken },
      select: { id: true, status: true },
    });

    if (!complaint) {
      throw new NotFoundError("Complaint not found");
    }

    if (complaint.status === "CLOSED" || complaint.status === "REJECTED") {
      throw new ConflictError("This complaint is closed and no longer accepts replies");
    }

    complaintId = complaint.id;

    const comment = await tx.comment.create({
      data: {
        complaintId: complaint.id,
        authorId: null,
        isInternal: false,
        body: trimmedBody,
      },
      select: {
        body: true,
        createdAt: true,
      },
    });

    await tx.activity.create({
      data: {
        complaintId: complaint.id,
        actorId: null,
        action: "COMMENTED",
        metadata: { internal: false, by: "complainant" },
      },
    });

    return {
      body: comment.body,
      createdAt: comment.createdAt,
      authorRole: "Complainant",
    };
  });

  eventBus.publish({
    type: "comment.added",
    complaintId,
    publicVisible: true,
    at: new Date().toISOString(),
  });

  return commentDto;
}
