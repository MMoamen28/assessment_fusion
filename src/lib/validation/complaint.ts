import { z } from "zod";
import { Status, Priority } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { COMPLAINT_CATEGORIES } from "@/lib/domain/constants";

const cuidSchema = z.string().cuid();

export function validateComplaintId(id: string): string {
  const result = cuidSchema.safeParse(id);
  if (!result.success) {
    throw new NotFoundError("Complaint not found");
  }
  return result.data;
}


export const createComplaintSchema = z.object({
  submitterName: z.string().trim().min(1).max(100),
  submitterEmail: z.string().trim().email().toLowerCase().max(255),
  category: z.enum(COMPLAINT_CATEGORIES),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(10).max(5000),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;

export const createStaffComplaintSchema = createComplaintSchema.extend({
  priority: z.nativeEnum(Priority).optional().default(Priority.MEDIUM),
});

export type CreateStaffComplaintInput = z.infer<typeof createStaffComplaintSchema>;

export const assignSchema = z.object({
  assigneeId: z.string().trim().min(1),
  expectedVersion: z.number().int().min(0),
});

export type AssignInput = z.infer<typeof assignSchema>;

export const changeStatusSchema = z.object({
  status: z.nativeEnum(Status),
  expectedVersion: z.number().int().min(0),
  note: z.string().trim().max(1000).optional(),
});

export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;

export const changePrioritySchema = z.object({
  priority: z.nativeEnum(Priority),
  expectedVersion: z.number().int().min(0),
});

export type ChangePriorityInput = z.infer<typeof changePrioritySchema>;

export const addCommentSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  internal: z.boolean().default(true),
});

export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const listQuerySchema = z.object({
  q: z.string().trim().optional(),
  status: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    })
    .pipe(z.array(z.nativeEnum(Status)).optional()),
  priority: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    })
    .pipe(z.array(z.nativeEnum(Priority)).optional()),
  assignee: z.string().trim().optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["newest", "oldest", "priority"]).default("newest"),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;

export const lookupSchema = z.object({
  reference: z.string().trim().min(1),
  email: z.string().trim().email().toLowerCase(),
});

export type LookupInput = z.infer<typeof lookupSchema>;
