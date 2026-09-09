import { getMysqlPool } from "@/server/db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import type { PoolConnection } from "mysql2/promise";

// ── Types ──────────────────────────────────────────────────────────────

export type ExamType = "PTS" | "PAS" | "UH" | "UTS" | "UAS" | "other";
export type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

export interface ExamScheduleRow extends RowDataPacket {
  id: number;
  title: string;
  subject: string;
  exam_type: ExamType;
  exam_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string; // HH:mm:ss
  room: string;
  class_names: string; // JSON string
  supervisors: string; // JSON string
  status: ExamStatus;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name?: string; // from JOIN
  question_count?: number;
  question_ids?: number[];
}

export interface CreateExamScheduleDTO {
  title: string;
  subject: string;
  exam_type: ExamType;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  class_names: string[];
  supervisors: string[];
  status?: ExamStatus;
  notes?: string;
  created_by: number;
  question_ids: number[];
}

export interface UpdateExamScheduleDTO {
  title?: string;
  subject?: string;
  exam_type?: ExamType;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  class_names?: string[];
  supervisors?: string[];
  status?: ExamStatus;
  notes?: string;
  question_ids?: number[];
}

export interface ExamScheduleListParams {
  page?: number;
  limit?: number;
  subject?: string;
  status?: ExamStatus;
  search?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Repository Functions ───────────────────────────────────────────────

/**
 * Get all exam schedules with pagination, filtering, and search.
 */
export async function findAllExamSchedules(
  params: ExamScheduleListParams = {}
): Promise<PaginatedResult<ExamScheduleRow>> {
  const pool = getMysqlPool();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (params.subject) {
    conditions.push("es.subject = ?");
    values.push(params.subject);
  }

  if (params.status) {
    conditions.push("es.status = ?");
    values.push(params.status);
  }

  if (params.search) {
    conditions.push(
      "(es.title LIKE ? OR es.subject LIKE ? OR es.room LIKE ?)"
    );
    const searchPattern = `%${params.search}%`;
    values.push(searchPattern, searchPattern, searchPattern);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM exam_schedules es ${where}`,
    values
  );
  const total = (countRows[0] as { total: number }).total;

  // Fetch data with creator name
  const [rows] = await pool.execute<ExamScheduleRow[]>(
     `SELECT
       es.*,
       u.name as creator_name,
       (
         SELECT COUNT(*)
         FROM exam_schedule_questions esq
         WHERE esq.exam_schedule_id = es.id
       ) as question_count
     FROM exam_schedules es
     LEFT JOIN users u ON u.id = es.created_by
     ${where}
     ORDER BY es.exam_date DESC, es.start_time DESC
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
 * Get a single exam schedule by ID.
 */
export async function findExamScheduleById(
  id: number
): Promise<ExamScheduleRow | null> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<ExamScheduleRow[]>(
    `SELECT
       es.*,
       u.name as creator_name,
       (
         SELECT COUNT(*)
         FROM exam_schedule_questions esq
         WHERE esq.exam_schedule_id = es.id
       ) as question_count
     FROM exam_schedules es
     LEFT JOIN users u ON u.id = es.created_by
     WHERE es.id = ?
     LIMIT 1`,
    [id]
  );

  const schedule = rows[0] ?? null;
  if (!schedule) return null;

  schedule.question_ids = await findQuestionIdsByScheduleId(id);
  return schedule;
}

/**
 * Create a new exam schedule.
 */
export async function createExamSchedule(
  dto: CreateExamScheduleDTO
): Promise<number> {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO exam_schedules
         (title, subject, exam_type, exam_date, start_time, end_time,
          room, class_names, supervisors, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.title,
        dto.subject,
        dto.exam_type,
        dto.exam_date,
        dto.start_time,
        dto.end_time,
        dto.room,
        JSON.stringify(dto.class_names),
        JSON.stringify(dto.supervisors),
        dto.status ?? "scheduled",
        dto.notes ?? null,
        dto.created_by,
      ]
    );

    await replaceScheduleQuestions(result.insertId, dto.question_ids, conn);
    await conn.commit();
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Update an existing exam schedule.
 */
export async function updateExamSchedule(
  id: number,
  dto: UpdateExamScheduleDTO
): Promise<boolean> {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (dto.title !== undefined) {
    fields.push("title = ?");
    values.push(dto.title);
  }
  if (dto.subject !== undefined) {
    fields.push("subject = ?");
    values.push(dto.subject);
  }
  if (dto.exam_type !== undefined) {
    fields.push("exam_type = ?");
    values.push(dto.exam_type);
  }
  if (dto.exam_date !== undefined) {
    fields.push("exam_date = ?");
    values.push(dto.exam_date);
  }
  if (dto.start_time !== undefined) {
    fields.push("start_time = ?");
    values.push(dto.start_time);
  }
  if (dto.end_time !== undefined) {
    fields.push("end_time = ?");
    values.push(dto.end_time);
  }
  if (dto.room !== undefined) {
    fields.push("room = ?");
    values.push(dto.room);
  }
  if (dto.class_names !== undefined) {
    fields.push("class_names = ?");
    values.push(JSON.stringify(dto.class_names));
  }
  if (dto.supervisors !== undefined) {
    fields.push("supervisors = ?");
    values.push(JSON.stringify(dto.supervisors));
  }
  if (dto.status !== undefined) {
    fields.push("status = ?");
    values.push(dto.status);
  }
  if (dto.notes !== undefined) {
    fields.push("notes = ?");
    values.push(dto.notes);
  }

  if (fields.length === 0 && dto.question_ids === undefined) {
    conn.release();
    return false;
  }

  try {
    await conn.beginTransaction();

    let affected = 0;
    if (fields.length > 0) {
      values.push(id);
      const [result] = await conn.execute<ResultSetHeader>(
        `UPDATE exam_schedules SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
      affected = result.affectedRows;
    }

    if (dto.question_ids !== undefined) {
      await replaceScheduleQuestions(id, dto.question_ids, conn);
      affected = 1;
    }

    await conn.commit();
    return affected > 0;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Delete an exam schedule by ID.
 */
export async function deleteExamSchedule(id: number): Promise<boolean> {
  const pool = getMysqlPool();
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM exam_schedules WHERE id = ?",
    [id]
  );

  return result.affectedRows > 0;
}

/**
 * Find exam schedules by subject (for filter dropdown).
 */
export async function findDistinctSubjects(): Promise<string[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT DISTINCT subject FROM exam_schedules ORDER BY subject"
  );

  return rows.map((r) => r.subject as string);
}

async function findQuestionIdsByScheduleId(id: number): Promise<number[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT question_id
     FROM exam_schedule_questions
     WHERE exam_schedule_id = ?
     ORDER BY sort_order ASC, question_id ASC`,
    [id]
  );

  return rows.map((r) => Number(r.question_id));
}

async function replaceScheduleQuestions(
  scheduleId: number,
  questionIds: number[],
  executor: PoolConnection
) {
  await executor.execute(
    "DELETE FROM exam_schedule_questions WHERE exam_schedule_id = ?",
    [scheduleId]
  );

  const uniqueIds = Array.from(new Set(questionIds.map(Number))).filter(
    (id) => Number.isInteger(id) && id > 0
  );

  for (let i = 0; i < uniqueIds.length; i++) {
    await executor.execute(
      `INSERT INTO exam_schedule_questions
         (exam_schedule_id, question_id, sort_order)
       VALUES (?, ?, ?)`,
      [scheduleId, uniqueIds[i], i]
    );
  }
}
