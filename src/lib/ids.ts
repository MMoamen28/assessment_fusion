import { randomInt, randomBytes } from "node:crypto";

const REFERENCE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(): string {
  let result = "CMP-";
  for (let i = 0; i < 6; i++) {
    result += REFERENCE_ALPHABET[randomInt(0, REFERENCE_ALPHABET.length)];
  }
  return result;
}

export function generatePublicToken(): string {
  return randomBytes(18).toString("base64url");
}
