import { z } from "zod";

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    SESSION_COOKIE_NAME: z.string().default("session"),
    SESSION_TTL_HOURS: z.coerce.number().int().positive().default(12),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    COOKIE_SECURE: z
      .preprocess((val) => {
        if (typeof val === "string") {
          if (val.toLowerCase() === "true") return true;
          if (val.toLowerCase() === "false") return false;
        }
        return val;
      }, z.boolean())
      .optional(),
  })
  .transform((data) => ({
    ...data,
    COOKIE_SECURE: data.COOKIE_SECURE ?? (data.NODE_ENV === "production"),
  }));

export const env = schema.parse(process.env);
