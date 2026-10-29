import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import {
  publicComplaintSelect,
  toPublicComplaintDto,
  type PublicComplaintDto,
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
