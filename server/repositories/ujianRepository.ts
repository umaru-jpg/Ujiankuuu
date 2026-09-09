import { getMysqlPool } from "@/server/db/mysql";
import type { RowDataPacket } from "mysql2";

export interface UjianScheduleRow extends RowDataPacket {
  id: number;
  title: string;
  subject: string;
  exam_type: string;
  exam_date: string | Date;
  start_time: string;
  end_time: string;
  room: string;
  class_names: string;
  supervisors: string;
  status: string;
}

export interface UjianQuestionRow extends RowDataPacket {
  id: number;
  subject: string;
  level: string;
  question_type: "multiple_choice" | "essay";
  prompt: string;
  sort_order: number;
}

export interface UjianOptionRow extends RowDataPacket {
  id: number;
  question_id: number;
  option_text: string;
  is_correct: number;
  sort_order: number;
}

export async function findUjianSchedule(
  scheduleId: number
): Promise<UjianScheduleRow | null> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<UjianScheduleRow[]>(
    `SELECT id, title, subject, exam_type, exam_date, start_time, end_time,
            room, class_names, supervisors, status
     FROM exam_schedules
     WHERE id = ?
     LIMIT 1`,
    [scheduleId]
  );

  return rows[0] ?? null;
}

export async function findUjianQuestions(
  scheduleId: number
): Promise<UjianQuestionRow[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<UjianQuestionRow[]>(
    `SELECT q.id, q.subject, q.level, q.question_type, q.prompt, esq.sort_order
     FROM exam_schedule_questions esq
     JOIN questions q ON q.id = esq.question_id
     WHERE esq.exam_schedule_id = ? AND q.status = 'published'
     ORDER BY esq.sort_order ASC, q.id ASC`,
    [scheduleId]
  );

  return rows;
}

export async function findUjianOptions(
  questionIds: number[]
): Promise<UjianOptionRow[]> {
  if (questionIds.length === 0) return [];

  const pool = getMysqlPool();
  const placeholders = questionIds.map(() => "?").join(",");
  const [rows] = await pool.execute<UjianOptionRow[]>(
    `SELECT id, question_id, option_text, is_correct, sort_order
     FROM question_options
     WHERE question_id IN (${placeholders})
     ORDER BY question_id ASC, sort_order ASC`,
    questionIds
  );

  return rows;
}

export async function hasExamResult(
  scheduleId: number,
  studentId: number
): Promise<boolean> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT id
     FROM exam_results
     WHERE exam_schedule_id = ? AND student_id = ?
     LIMIT 1`,
    [scheduleId, studentId]
  );

  return rows.length > 0;
}
