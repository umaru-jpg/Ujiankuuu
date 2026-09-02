import { getMysqlPool } from "@/server/db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

// ── Types ──────────────────────────────────────────────────────────────

export type QuestionLevel = "X" | "XI" | "XII";
export type QuestionStatus = "published" | "draft";
export type QuestionType = "multiple_choice" | "essay";

export interface QuestionOption {
  id?: number;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface QuestionRow extends RowDataPacket {
  id: number;
  subject: string;
  class_name: string;
  level: QuestionLevel;
  status: QuestionStatus;
  question_type: QuestionType;
  prompt: string;
  author_id: number;
  author_name: string;
  color: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithOptions extends QuestionRow {
  options: QuestionOption[];
}

export interface CreateQuestionDTO {
  subject: string;
  level: QuestionLevel;
  status: QuestionStatus;
  question_type: QuestionType;
  prompt: string;
  author_id: number;
  author_name: string;
  color?: string;
  options?: { option_text: string; is_correct: boolean }[];
}

export interface BulkCreateQuestionsDTO {
  subject: string;
  level: QuestionLevel;
  status: QuestionStatus;
  author_id: number;
  author_name: string;
  color?: string;
  questions: {
    question_type: QuestionType;
    prompt: string;
    options?: { option_text: string; is_correct: boolean }[];
  }[];
}

export interface QuestionListParams {
  page?: number;
  limit?: number;
  subject?: string;
  level?: QuestionLevel;
  status?: QuestionStatus;
  search?: string;
  author_id?: number;
}

export interface PaginatedQuestions {
  data: QuestionWithOptions[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Helper: Level ↔ Class Name Mapping ─────────────────────────────────

const LEVEL_TO_CLASS_NAME: Record<QuestionLevel, string> = {
  X: "Kelas 10",
  XI: "Kelas 11",
  XII: "Kelas 12",
};

// ── Repository Functions ───────────────────────────────────────────────

/**
 * Get all questions with pagination, filtering, and search.
 * Includes answer options for each question.
 */
export async function findAllQuestions(
  params: QuestionListParams = {}
): Promise<PaginatedQuestions> {
  const pool = getMysqlPool();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: (string | number)[] = [];

  if (params.subject) {
    conditions.push("q.subject = ?");
    values.push(params.subject);
  }

  if (params.level) {
    conditions.push("q.level = ?");
    values.push(params.level);
  }

  if (params.status) {
    conditions.push("q.status = ?");
    values.push(params.status);
  }

  if (params.author_id) {
    conditions.push("q.author_id = ?");
    values.push(params.author_id);
  }

  if (params.search) {
    conditions.push("(q.prompt LIKE ? OR q.subject LIKE ?)");
    const searchPattern = `%${params.search}%`;
    values.push(searchPattern, searchPattern);
  }

  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const [countRows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(*) as total FROM questions q ${where}`,
    values
  );
  const total = (countRows[0] as { total: number }).total;

  // Fetch questions
  const [rows] = await pool.execute<QuestionRow[]>(
    `SELECT
       q.id, q.subject, q.class_name, q.level, q.status,
       q.question_type, q.prompt, q.author_id, q.author_name,
       q.color, q.created_at, q.updated_at
     FROM questions q
     ${where}
     ORDER BY q.created_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  // Fetch options for all questions in this page
  const questionIds = rows.map((r) => r.id);
  let optionsMap: Record<number, QuestionOption[]> = {};

  if (questionIds.length > 0) {
    const placeholders = questionIds.map(() => "?").join(",");
    const [optionRows] = await pool.execute<RowDataPacket[]>(
      `SELECT id, question_id, option_text, is_correct, sort_order
       FROM question_options
       WHERE question_id IN (${placeholders})
       ORDER BY question_id, sort_order ASC`,
      questionIds
    );

    for (const opt of optionRows) {
      const qid = opt.question_id as number;
      if (!optionsMap[qid]) optionsMap[qid] = [];
      optionsMap[qid].push({
        id: opt.id as number,
        option_text: opt.option_text as string,
        is_correct: Boolean(opt.is_correct),
        sort_order: opt.sort_order as number,
      });
    }
  }

  const data: QuestionWithOptions[] = rows.map((row) => ({
    ...row,
    options: optionsMap[row.id] ?? [],
  }));

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get a single question by ID with its options.
 */
export async function findQuestionById(
  id: number
): Promise<QuestionWithOptions | null> {
  const pool = getMysqlPool();

  const [rows] = await pool.execute<QuestionRow[]>(
    `SELECT
       id, subject, class_name, level, status,
       question_type, prompt, author_id, author_name,
       color, created_at, updated_at
     FROM questions
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  const question = rows[0];
  if (!question) return null;

  const [optionRows] = await pool.execute<RowDataPacket[]>(
    `SELECT id, option_text, is_correct, sort_order
     FROM question_options
     WHERE question_id = ?
     ORDER BY sort_order ASC`,
    [id]
  );

  return {
    ...question,
    options: optionRows.map((opt) => ({
      id: opt.id as number,
      option_text: opt.option_text as string,
      is_correct: Boolean(opt.is_correct),
      sort_order: opt.sort_order as number,
    })),
  };
}

/**
 * Create a single question with options (if multiple_choice).
 */
export async function createQuestion(dto: CreateQuestionDTO): Promise<number> {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const className = LEVEL_TO_CLASS_NAME[dto.level];

    // Insert question
    const [result] = await conn.execute<ResultSetHeader>(
      `INSERT INTO questions
         (subject, class_name, level, status, question_type, prompt,
          author_id, author_name, color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dto.subject,
        className,
        dto.level,
        dto.status,
        dto.question_type,
        dto.prompt,
        dto.author_id,
        dto.author_name,
        dto.color ?? null,
      ]
    );

    const questionId = result.insertId;

    // Insert options for multiple choice
    if (dto.question_type === "multiple_choice" && dto.options?.length) {
      for (let i = 0; i < dto.options.length; i++) {
        await conn.execute(
          `INSERT INTO question_options
             (question_id, option_text, is_correct, sort_order)
           VALUES (?, ?, ?, ?)`,
          [questionId, dto.options[i].option_text, dto.options[i].is_correct ? 1 : 0, i]
        );
      }
    }

    await conn.commit();
    return questionId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Bulk create multiple questions with options in a single transaction.
 * Used by the bulk create form.
 */
export async function bulkCreateQuestions(
  dto: BulkCreateQuestionsDTO
): Promise<number> {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();
  let createdCount = 0;

  try {
    await conn.beginTransaction();

    const className = LEVEL_TO_CLASS_NAME[dto.level];

    for (const q of dto.questions) {
      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO questions
           (subject, class_name, level, status, question_type, prompt,
            author_id, author_name, color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          dto.subject,
          className,
          dto.level,
          dto.status,
          q.question_type,
          q.prompt,
          dto.author_id,
          dto.author_name,
          dto.color ?? null,
        ]
      );

      const questionId = result.insertId;

      // Insert options for multiple choice
      if (q.question_type === "multiple_choice" && q.options?.length) {
        for (let i = 0; i < q.options.length; i++) {
          await conn.execute(
            `INSERT INTO question_options
               (question_id, option_text, is_correct, sort_order)
             VALUES (?, ?, ?, ?)`,
            [questionId, q.options[i].option_text, q.options[i].is_correct ? 1 : 0, i]
          );
        }
      }

      createdCount++;
    }

    await conn.commit();
    return createdCount;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Update a question. If options are provided, replaces all options.
 */
export async function updateQuestion(
  id: number,
  dto: Partial<CreateQuestionDTO>
): Promise<boolean> {
  const pool = getMysqlPool();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (dto.subject !== undefined) {
      fields.push("subject = ?");
      values.push(dto.subject);
    }
    if (dto.level !== undefined) {
      fields.push("level = ?");
      values.push(dto.level);
      fields.push("class_name = ?");
      values.push(LEVEL_TO_CLASS_NAME[dto.level]);
    }
    if (dto.status !== undefined) {
      fields.push("status = ?");
      values.push(dto.status);
    }
    if (dto.question_type !== undefined) {
      fields.push("question_type = ?");
      values.push(dto.question_type);
    }
    if (dto.prompt !== undefined) {
      fields.push("prompt = ?");
      values.push(dto.prompt);
    }
    if (dto.color !== undefined) {
      fields.push("color = ?");
      values.push(dto.color);
    }

    if (fields.length > 0) {
      values.push(id);
      await conn.execute(
        `UPDATE questions SET ${fields.join(", ")} WHERE id = ?`,
        values
      );
    }

    // Replace options if provided
    if (dto.options !== undefined) {
      await conn.execute("DELETE FROM question_options WHERE question_id = ?", [id]);

      if (dto.question_type === "multiple_choice" && dto.options.length) {
        for (let i = 0; i < dto.options.length; i++) {
          await conn.execute(
            `INSERT INTO question_options
               (question_id, option_text, is_correct, sort_order)
             VALUES (?, ?, ?, ?)`,
            [id, dto.options[i].option_text, dto.options[i].is_correct ? 1 : 0, i]
          );
        }
      }
    }

    await conn.commit();
    return true;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Delete a question by ID (options cascade delete).
 */
export async function deleteQuestion(id: number): Promise<boolean> {
  const pool = getMysqlPool();
  const [result] = await pool.execute<ResultSetHeader>(
    "DELETE FROM questions WHERE id = ?",
    [id]
  );

  return result.affectedRows > 0;
}

/**
 * Get distinct subjects from questions (for filter dropdown).
 */
export async function findDistinctQuestionSubjects(): Promise<string[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT DISTINCT subject FROM questions ORDER BY subject"
  );

  return rows.map((r) => r.subject as string);
}
