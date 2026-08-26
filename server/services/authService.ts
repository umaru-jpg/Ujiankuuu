import { createHash, timingSafeEqual } from "crypto";
import {
  findAuthUserByIdentifier,
  toSessionUser,
} from "@/server/repositories/userRepository";
import type { User } from "@/lib/auth";

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function isPasswordMatch(password: string, passwordHash: string): boolean {
  const actual = Buffer.from(hashPassword(password));
  const expected = Buffer.from(passwordHash);

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function authenticateUser(
  identifier: string,
  password: string
): Promise<User | null> {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier || !password) return null;

  const user = await findAuthUserByIdentifier(normalizedIdentifier);
  if (!user) return null;

  if (!isPasswordMatch(password, user.password_hash)) return null;

  return toSessionUser(user);
}
