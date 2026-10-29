import { ValidationError } from "@/lib/errors";
import { ZodError, type ZodSchema, type z } from "zod";


export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ValidationError(null, "Request body must be valid JSON");
  }
}

export async function parseBody<T extends ZodSchema>(schema: T, req: Request): Promise<z.infer<T>> {
  const json = await readJson(req);
  try {
    return schema.parse(json);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      throw new ValidationError(details);
    }
    throw err;
  }
}

export function parseQuery<T extends ZodSchema>(schema: T, req: Request): z.infer<T> {
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    raw[key] = value;
  }
  try {
    return schema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      throw new ValidationError(details);
    }
    throw err;
  }
}

