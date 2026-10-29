import { hash, compare } from "bcryptjs";

export async function hashPassword(plain: string): Promise<string> {
  return hash(plain, 10);
}

export async function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return compare(plain, passwordHash);
}
