import { getMysqlPool } from "@/server/db/mysql";
import type { RowDataPacket } from "mysql2";

// ── Types ──────────────────────────────────────────────────────────────

export interface ExamResultRow extends RowDataPacket {
  id: number;
  exam_schedule_id: number;
  student_id: number;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  duration_seconds: number;
  topic_performance: string | null;
  answers: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamResultWithStudent extends ExamResultRow {
  student_name: string;
  student_username: string;
  student_title: string | null;
}

export interface ExamResultWithSchedule extends ExamResultRow {
  exam_title: string;
  exam_subject: string;
  exam_date: string;
  exam_class_names: string;
  creator_name: string;
}

export interface AdminClassSummary {
  kelas: string;
  peserta: number;
  rata: number;
  tertinggi: number;
  terendah: number;
  lulus: number;
}

export interface AdminDistribution {
  range_label: string;
  count: number;
}

export interface AdminHasilResponse {
  summaries: AdminClassSummary[];
  distribution: AdminDistribution[];
  subjects: string[];
  totalExams: number;
}

export interface GuruExamWithStudents {
  id: string;
  mapel: string;
  kelas: string;
  date: string;
  students: {
    nis: string;
    name: string;
    kelas: string;
    score: number;
  }[];
}

export interface SiswaHasilResponse {
  score: number;
  correct_answers: number;
  wrong_answers: number;
  duration_seconds: number;
  topic_performance: { label: string; pct: number }[];
  exam_title: string;
  exam_subject: string;
  exam_date: string;
}

// ── Repository Functions ───────────────────────────────────────────────

/**
 * Admin: Get class summaries aggregated per subject and class.
 * When subject is "Semua Mapel", aggregates across all subjects.
 */
interface RawResultRow extends RowDataPacket {
  exam_schedule_id: number;
  student_id: number;
  score: number;
  subject: string;
  class_names: string;
}

function getAllResultRows(subject?: string): Promise<RawResultRow[]> {
  const pool = getMysqlPool();

  if (subject && subject !== "Semua Mapel") {
    return pool.execute<RawResultRow[]>(
      `SELECT
         er.exam_schedule_id,
         er.student_id,
         er.score,
         es.subject,
         es.class_names
       FROM exam_results er
       JOIN exam_schedules es ON es.id = er.exam_schedule_id
       WHERE es.subject = ?`,
      [subject]
    ).then(([rows]) => rows);
  }

  return pool.execute<RawResultRow[]>(
    `SELECT
       er.exam_schedule_id,
       er.student_id,
       er.score,
       es.subject,
       es.class_names
     FROM exam_results er
     JOIN exam_schedules es ON es.id = er.exam_schedule_id`
  ).then(([rows]) => rows);
}

function parseClassNames(classNamesRaw: string | null): string[] {
  if (!classNamesRaw) return [];
  try {
    const parsed = JSON.parse(classNamesRaw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function getAdminClassSummaries(
  subject?: string
): Promise<AdminClassSummary[]> {
  const rows = await getAllResultRows(subject);

  // Group scores by class name
  const byClass = new Map<string, number[]>();
  for (const row of rows) {
    for (const className of parseClassNames(row.class_names)) {
      if (!byClass.has(className)) byClass.set(className, []);
      byClass.get(className)!.push(row.score);
    }
  }

  const summaries: AdminClassSummary[] = [];
  Array.from(byClass.entries()).forEach(([kelas, scores]) => {
    const peserta = scores.length;
    const rata =
      peserta > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / peserta) * 10) / 10 : 0;
    const lulus = scores.filter((s) => s >= 75).length;

    summaries.push({
      kelas,
      peserta,
      rata,
      tertinggi: peserta > 0 ? Math.max(...scores) : 0,
      terendah: peserta > 0 ? Math.min(...scores) : 0,
      lulus,
    });
  });

  return summaries.sort((a, b) => a.kelas.localeCompare(b.kelas));
}

/**
 * Admin: Get score distribution for a given subject.
 * Returns counts per range: ≤50, 51-60, 61-70, 71-80, 81-90, 91-100.
 */
export async function getAdminDistribution(
  subject?: string
): Promise<AdminDistribution[]> {
  const pool = getMysqlPool();
  const ranges = [
    { label: "≤50", min: 0, max: 50 },
    { label: "51-60", min: 51, max: 60 },
    { label: "61-70", min: 61, max: 70 },
    { label: "71-80", min: 71, max: 80 },
    { label: "81-90", min: 81, max: 90 },
    { label: "91-100", min: 91, max: 100 },
  ];

  const subjectCondition = subject && subject !== "Semua Mapel"
    ? "AND es.subject = ?"
    : "";

  const results: AdminDistribution[] = [];

  for (const range of ranges) {
    const params: (string | number)[] = [range.min, range.max];
    if (subject && subject !== "Semua Mapel") {
      params.push(subject);
    }

    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt
       FROM exam_results er
       JOIN exam_schedules es ON es.id = er.exam_schedule_id
       WHERE er.score >= ? AND er.score <= ? ${subjectCondition}`,
      params
    );

    results.push({
      range_label: range.label,
      count: Number(rows[0].cnt),
    });
  }

  return results;
}

/**
 * Admin: Get distinct subjects from exam_schedules that have results.
 */
export async function getAdminSubjects(): Promise<string[]> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT DISTINCT es.subject
     FROM exam_schedules es
     JOIN exam_results er ON er.exam_schedule_id = es.id
     ORDER BY es.subject`
  );

  return rows.map((r) => r.subject as string);
}

/**
 * Admin: Get total number of completed exams with results.
 */
export async function getAdminTotalExams(): Promise<number> {
  const pool = getMysqlPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT es.id) AS total
     FROM exam_schedules es
     JOIN exam_results er ON er.exam_schedule_id = es.id`
  );

  return Number(rows[0].total);
}

/**
 * Guru: Get all completed exams with their student results for the guru's supervised exams.
 */
export async function getGuruExamResults(
  guruUserId: number
): Promise<GuruExamWithStudents[]> {
  const pool = getMysqlPool();

  // Find completed exams (supervisor filtering done in JS for DB compatibility)
  const [exams] = await pool.execute<RowDataPacket[]>(
    `SELECT es.id, es.title, es.subject, es.exam_date, es.class_names, es.supervisors
     FROM exam_schedules es
     WHERE es.status = 'completed'
     ORDER BY es.exam_date DESC`
  );

  // Get guru name for supervisor matching
  const [guruRows] = await pool.execute<RowDataPacket[]>(
    `SELECT name FROM users WHERE id = ? LIMIT 1`,
    [guruUserId]
  );
  const guruName = guruRows[0]?.name as string | undefined;

  function isSupervised(supervisorsRaw: string): boolean {
    if (!supervisorsRaw) return false;
    try {
      const parsed = JSON.parse(supervisorsRaw);
      if (!Array.isArray(parsed)) return false;
      if (!guruName) return false;
      return (parsed as string[]).some((s) => s === guruName);
    } catch {
      return false;
    }
  }

  // Filter exams where this guru is a supervisor, otherwise fallback to all for demo
  let examList = exams.filter((e) => isSupervised(e.supervisors as string));
  if (examList.length === 0) {
    examList = exams;
  }

  const results: GuruExamWithStudents[] = [];

  for (const exam of examList) {
    const classNames = parseClassNames(exam.class_names as string);
    const dateStr = exam.exam_date as string;

    const [studentRows] = await pool.execute<RowDataPacket[]>(
      `SELECT
         er.score,
         er.student_id,
         u.name AS student_name,
         u.username AS student_username,
         u.title AS student_title
       FROM exam_results er
       JOIN users u ON u.id = er.student_id
       WHERE er.exam_schedule_id = ?
       ORDER BY er.score DESC`,
      [exam.id]
    );

    // Format date to "15 Okt 2026"
    const dateObj = new Date(dateStr);
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
    ];
    const formattedDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    results.push({
      id: String(exam.id),
      mapel: exam.subject as string,
      kelas: classNames.join(", "),
      date: formattedDate,
      students: studentRows.map((s) => ({
        nis: s.student_username as string,
        name: s.student_name as string,
        kelas: (s.student_title as string) ?? classNames[0],
        score: Number(s.score),
      })),
    });
  }

  return results;
}

/**
 * Siswa: Get the latest exam result for a student.
 */
export async function getSiswaLatestResult(
  studentUserId: number
): Promise<SiswaHasilResponse | null> {
  const pool = getMysqlPool();

  const [rows] = await pool.execute<ExamResultWithSchedule[]>(
    `SELECT
       er.*,
       es.title AS exam_title,
       es.subject AS exam_subject,
       es.exam_date AS exam_date
     FROM exam_results er
     JOIN exam_schedules es ON es.id = er.exam_schedule_id
     WHERE er.student_id = ?
     ORDER BY er.created_at DESC
     LIMIT 1`,
    [studentUserId]
  );

  const row = rows[0];
  if (!row) return null;

  // Format date
  const dateObj = new Date(row.exam_date);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];
  const formattedDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

  let topicPerformance: { label: string; pct: number }[] = [];
  if (row.topic_performance) {
    try {
      topicPerformance = JSON.parse(row.topic_performance);
    } catch {
      topicPerformance = [];
    }
  }

  return {
    score: row.score,
    correct_answers: row.correct_answers,
    wrong_answers: row.wrong_answers,
    duration_seconds: row.duration_seconds,
    topic_performance: topicPerformance,
    exam_title: row.exam_title,
    exam_subject: row.exam_subject,
    exam_date: formattedDate,
  };
}

/**
 * Siswa: Get all exam results for a student.
 */
export async function getSiswaAllResults(
  studentUserId: number
): Promise<SiswaHasilResponse[]> {
  const pool = getMysqlPool();

  const [rows] = await pool.execute<ExamResultWithSchedule[]>(
    `SELECT
       er.*,
       es.title AS exam_title,
       es.subject AS exam_subject,
       es.exam_date AS exam_date
     FROM exam_results er
     JOIN exam_schedules es ON es.id = er.exam_schedule_id
     WHERE er.student_id = ?
     ORDER BY er.created_at DESC`,
    [studentUserId]
  );

  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
  ];

  return rows.map((row) => {
    const dateObj = new Date(row.exam_date);
    const formattedDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;

    let topicPerformance: { label: string; pct: number }[] = [];
    if (row.topic_performance) {
      try {
        topicPerformance = JSON.parse(row.topic_performance);
      } catch {
        topicPerformance = [];
      }
    }

    return {
      score: row.score,
      correct_answers: row.correct_answers,
      wrong_answers: row.wrong_answers,
      duration_seconds: row.duration_seconds,
      topic_performance: topicPerformance,
      exam_title: row.exam_title,
      exam_subject: row.exam_subject,
      exam_date: formattedDate,
    };
  });
}

/**
 * Create a new exam result (for when a student completes an exam).
 */
export async function createExamResult(params: {
  exam_schedule_id: number;
  student_id: number;
  score: number;
  correct_answers: number;
  wrong_answers: number;
  duration_seconds: number;
  topic_performance?: { label: string; pct: number }[];
  answers?: unknown[];
}): Promise<number> {
  const pool = getMysqlPool();
  const [result] = await pool.execute(
    `INSERT INTO exam_results
       (exam_schedule_id, student_id, score, correct_answers, wrong_answers,
        duration_seconds, topic_performance, answers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       score = VALUES(score),
       correct_answers = VALUES(correct_answers),
       wrong_answers = VALUES(wrong_answers),
       duration_seconds = VALUES(duration_seconds),
       topic_performance = VALUES(topic_performance),
       answers = VALUES(answers),
       updated_at = CURRENT_TIMESTAMP`,
    [
      params.exam_schedule_id,
      params.student_id,
      params.score,
      params.correct_answers,
      params.wrong_answers,
      params.duration_seconds,
      params.topic_performance ? JSON.stringify(params.topic_performance) : null,
      params.answers ? JSON.stringify(params.answers) : null,
    ]
  );

  return (result as { insertId: number }).insertId;
}
