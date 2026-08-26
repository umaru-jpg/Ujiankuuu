import { getMysqlPool } from "@/server/db/mysql";
import type { Role, User } from "@/lib/auth";
import type { RowDataPacket } from "mysql2";

export interface AuthUserRow extends RowDataPacket {
  id: number;
  name: string;
  username: string;
  password_hash: string;
  role: Role;
  title: string | null;
  avatar_initial: string | null;
  avatar_color: string | null;
}

export async function findAuthUserByIdentifier(
  identifier: string
): Promise<AuthUserRow | null> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<AuthUserRow[]>(
    `SELECT
      id,
      name,
      username,
      password_hash,
      role,
      title,
      avatar_initial,
      avatar_color
    FROM users
    WHERE username = ? OR email = ?
    LIMIT 1`,
    [identifier, identifier]
  );

  return rows[0] ?? null;
}

export function toSessionUser(row: AuthUserRow): User {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    role: row.role,
    title: row.title ?? "",
    initial: row.avatar_initial ?? row.name.slice(0, 1).toUpperCase(),
    color: row.avatar_color ?? "from-blue-600 to-indigo-500",
  };
}
