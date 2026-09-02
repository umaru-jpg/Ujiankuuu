import { getMysqlPool } from "@/server/db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

// ── Types ──────────────────────────────────────────────────────────────

export type KelasLevel = "X" | "XI" | "XII";

export interface KelasRow extends RowDataPacket {
  id: number;
  name: string;
  level: KelasLevel;
  major: string;
  homeroom_teacher: string;
  student_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateKelasDTO {
  name: string;
  level: KelasLevel;
  major: string;
  homeroom_teacher: string;
  student_count: number;
}

export interface UpdateKelasDTO {
  name?: string;
  level?: KelasLevel;
  major?: string;
  homeroom_teacher?: string;
  student_count?: number;
}

// ── Repository Functions ───────────────────────────────────────────────

export async function findAllKelas(): Promise<KelasRow[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<KelasRow[]>(
    `SELECT *
     FROM classes
     ORDER BY name ASC`
  );
  return rows;
}

export async function findKelasById(id: number): Promise<KelasRow | null> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<KelasRow[]>(
    `SELECT * FROM classes WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findKelasByName(name: string): Promise<KelasRow | null> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<KelasRow[]>(
    `SELECT * FROM classes WHERE name = ? LIMIT 1`,
    [name]
  );
  return rows[0] ?? null;
}

export async function createKelas(dto: CreateKelasDTO): Promise<number> {
  const pool = getMysqlPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `INSERT INTO classes (name, level, major, homeroom_teacher, student_count)
     VALUES (?, ?, ?, ?, ?)`,
    [
      dto.name,
      dto.level,
      dto.major,
      dto.homeroom_teacher,
      dto.student_count,
    ]
  );
  return result.insertId;
}

export async function updateKelas(
  id: number,
  dto: UpdateKelasDTO
): Promise<boolean> {
  const pool = getMysqlPool();
  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (dto.name !== undefined) {
    fields.push("name = ?");
    values.push(dto.name);
  }
  if (dto.level !== undefined) {
    fields.push("level = ?");
    values.push(dto.level);
  }
  if (dto.major !== undefined) {
    fields.push("major = ?");
    values.push(dto.major);
  }
  if (dto.homeroom_teacher !== undefined) {
    fields.push("homeroom_teacher = ?");
    values.push(dto.homeroom_teacher);
  }
  if (dto.student_count !== undefined) {
    fields.push("student_count = ?");
    values.push(dto.student_count);
  }

  if (fields.length === 0) return false;

  values.push(id);
  const [result] = await pool.execute<ResultSetHeader>(
    `UPDATE classes SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  return result.affectedRows > 0;
}

export async function deleteKelas(id: number): Promise<boolean> {
  const pool = getMysqlPool();
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM classes WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}
