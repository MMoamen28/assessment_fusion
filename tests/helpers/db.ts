import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { Role, Status, Priority, type User, type Complaint } from "@prisma/client";
import { generateReference, generatePublicToken } from "@/lib/ids";

const defaultPasswordHash = hashSync("Password123!", 10);
let emailCounter = 0;

export async function resetDb(): Promise<void> {
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(overrides?: Partial<{
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
}>): Promise<User> {
  emailCounter += 1;
  return prisma.user.create({
    data: {
      email: overrides?.email ?? `user_${emailCounter}_${Date.now()}@example.com`,
      name: overrides?.name ?? `Test User ${emailCounter}`,
      passwordHash: overrides?.passwordHash ?? defaultPasswordHash,
      role: overrides?.role ?? Role.AGENT,
    },
  });
}

export async function createComplaint(overrides?: Partial<{
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  submitterName: string;
  submitterEmail: string;
  assigneeId: string | null;
  version: number;
}>): Promise<Complaint> {
  const status = overrides?.status ?? Status.OPEN;
  let assigneeId = overrides?.assigneeId;

  if (assigneeId === undefined) {
    if (status === "IN_REVIEW" || status === "RESOLVED" || status === "CLOSED") {
      const defaultAgent = await createUser({ role: Role.AGENT });
      assigneeId = defaultAgent.id;
    } else {
      assigneeId = null;
    }
  }

  return prisma.complaint.create({
    data: {
      reference: generateReference(),
      publicToken: generatePublicToken(),
      title: overrides?.title ?? "Test Complaint",
      description: overrides?.description ?? "Test complaint description",
      category: overrides?.category ?? "Service",
      priority: overrides?.priority ?? Priority.MEDIUM,
      status,
      submitterName: overrides?.submitterName ?? "Test Submitter",
      submitterEmail: overrides?.submitterEmail ?? "submitter@example.com",
      assigneeId,
      version: overrides?.version ?? 0,
    },
  });
}
