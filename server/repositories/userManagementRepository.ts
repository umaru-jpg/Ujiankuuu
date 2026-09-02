import { getMysqlPool } from "@/server/db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { Role } from "@/lib/auth";

// ── Types ──────────────────────────────────────────────────────────────

export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  username: string;
  email: string | null;
  password_hash: string;
  role: Role;
  title: string | null;
  department: string | null;
  avatar_initial: string | null;
  avatar_color: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
  password: string;
  role: Role;
  department?: string;
  title?: string;
}

export interface UpdateUserDTO {
  name?: string;
  email?: string;
  password?: string;
  role?: Role;
  department?: string;
  title?: string;
}

export interface UserListParams {
  page?: number;
  limit?: number;
  role?: Role;
  search?: string;
}

export interface PaginatedUsers {
  data: UserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Repository Functions ───────────────────────────────────────────────

/**
 * Get all users with pagination, filtering, and search.
 */
export async function findAllUsers(
  params: UserListParams = {}
): Promise<PaginatedUsers> {
  const pool = getMysqlPool();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (params.role) {
    conditions.push("role = ?");
    values.push(params.role);
  }

  if (params.search) {
    conditions.push("(name LIKE ? OR email LIKE ? OR username LIKE ?)");
    const searchPattern = `%${params.search}%`;
    values.push(searchPattern, searchPattern, searchPattern);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM users ${where}`,
    values
  );
  const total = (countRows[0] as { total: number }).total;

  // Fetch data
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT
       id, name, username, email, role, title, department,
       avatar_initial, avatar_color, created_at, updated_at
     FROM users
     ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    data: rows,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single user by ID.
 */
export async function findUserById(id: number): Promise<UserRow | null> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<UserRow[]>(
    `SELECT
       id, name, username, email, role, title, department,
       avatar_initial, avatar_color, created_at, updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  return rows[0] ?? null;
}

/**
 * Create a new user.
 * Auto-generates username from email prefix.
 */
export async function createUser(dto: CreateUserDTO): Promise<number> {
  const pool = getMysqlPool();

  // Auto-generate username from email prefix
  const baseUsername = dto.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  let username = baseUsername;
  let suffix = 1;

  // Ensure username is unique
  while (true) {
    const [existing] = await pool.execute<RowDataPacket[]>(
      "SELECT id FROM users WHERE username = ? LIMIT 1",
      [username]
    );
    if (existing.length === 0) break;
    username = `${baseUsername}${suffix}`;
    suffix++;
  }

  // Generate avatar initial from first letter of name
  const avatarInitial = dto.name.charAt(0).toUpperCase();

  // Generate avatar color based on role
  const avatarColorMap: Record<Role, string> = {
    admin: "from-blue-600 to-indigo-500",
    guru: "from-emerald-600 to-teal-500",
    siswa: "from-violet-600 to-purple-500",
  };

  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO users
       (name, username, email, password_hash, role, title, department, avatar_initial, avatar_color)
     VALUES (?, ?, ?, SHA2(?, 256), ?, ?, ?, ?, ?)`,
    [
      dto.name,
      username,
      dto.email,
      dto.password,
      dto.role,
      dto.title ?? null,
      dto.department ?? null,
      avatarInitial,
      avatarColorMap[dto.role],
    ]
  );

  return result.insertId;
}

/**
 * Update an existing user.
 * If password is provided, it will be hashed and updated.
 */
export async function updateUser(
  id: number,
  dto: UpdateUserDTO
): Promise<boolean> {
  const pool = getMysqlPool();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (dto.name !== undefined) {
    fields.push("name = ?");
    values.push(dto.name);
  }
  if (dto.email !== undefined) {
    fields.push("email = ?");
    values.push(dto.email);
  }
  if (dto.password !== undefined && dto.password.trim() !== "") {
    fields.push("password_hash = SHA2(?, 256)");
    values.push(dto.password);
  }
  if (dto.role !== undefined) {
    fields.push("role = ?");
    values.push(dto.role);
  }
  if (dto.department !== undefined) {
    fields.push("department = ?");
    values.push(dto.department);
  }
  if (dto.title !== undefined) {
    fields.push("title = ?");
    values.push(dto.title);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

/**
 * Delete a user by ID.
 */
export async function deleteUser(id: number): Promise<boolean> {
  const pool = getMysqlPool();
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM users WHERE id = ?",
    [id]
  );

  return result.affectedRows > 0;
}
