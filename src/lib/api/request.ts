import { ValidationError } from "@/lib/errors";
import type { ZodSchema, z } from "zod";

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError(null, "Request body must be valid JSON");
  }
}

export async function parseBody<T extends ZodSchema>(schema: T, req: Request): Promise<z.infer<T>> {
  const json = await readJson(req);
  return schema.parse(json);
}
