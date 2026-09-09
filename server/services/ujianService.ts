import { createExamResult } from "@/server/repositories/hasilRepository";
import {
  findUjianOptions,
  findUjianQuestions,
  findUjianSchedule,
  hasExamResult,
  type UjianOptionRow,
  type UjianQuestionRow,
  type UjianScheduleRow,
} from "@/server/repositories/ujianRepository";
import { findKelasByName } from "@/server/repositories/kelasRepository";
import { findUserById } from "@/server/repositories/userManagementRepository";

export interface StudentAnswerPayload {
  question_id: number;
  option_id?: number | null;
  answer_text?: string;
}

function parseJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatDateValue(value: string | Date): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value.slice(0, 8);
}

function stampFromDateTime(date: string, time: string): number {
  return Number(`${date.replace(/-/g, "")}${normalizeTime(time).replace(/:/g, "")}`);
}

function jakartaNowStamp(): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return Number(
    `${value("year")}${value("month")}${value("day")}${value("hour")}${value("minute")}${value("second")}`
  );
}

function secondsBetweenTimes(start: string, end: string): number {
  const [sh, sm, ss] = normalizeTime(start).split(":").map(Number);
  const [eh, em, es] = normalizeTime(end).split(":").map(Number);
  return Math.max(0, eh * 3600 + em * 60 + es - (sh * 3600 + sm * 60 + ss));
}

function normalizeClassValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function classMatches(scheduleClass: string, studentClass: string): boolean {
  const scheduleValue = normalizeClassValue(scheduleClass);
  const studentValue = normalizeClassValue(studentClass);
  if (!scheduleValue || !studentValue) return false;
  return (
    scheduleValue === studentValue ||
    studentValue.startsWith(`${scheduleValue} `) ||
    scheduleValue.startsWith(`${studentValue} `)
  );
}

function isStudentInSchedule(schedule: UjianScheduleRow, className: string): boolean {
  const classes = parseJsonArray(schedule.class_names);
  if (!className) return false;
  return classes.some((item) => classMatches(item, className));
}

function assertExamOpen(schedule: UjianScheduleRow) {
  if (schedule.status === "cancelled") {
    return "Ujian ini dibatalkan.";
  }
  if (schedule.status === "completed") {
    return "Ujian ini sudah selesai.";
  }

  const date = formatDateValue(schedule.exam_date);
  const now = jakartaNowStamp();
  const start = stampFromDateTime(date, schedule.start_time);
  const end = stampFromDateTime(date, schedule.end_time);

  if (now < start) {
    return "Ujian belum bisa dibuka. Silakan mulai sesuai tanggal dan jam yang ditentukan.";
  }
  if (now > end) {
    return "Waktu ujian sudah berakhir.";
  }

  return null;
}

function shapeQuestions(questions: UjianQuestionRow[], options: UjianOptionRow[]) {
  const optionsByQuestion = new Map<number, UjianOptionRow[]>();
  for (const option of options) {
    const existing = optionsByQuestion.get(option.question_id) ?? [];
    existing.push(option);
    optionsByQuestion.set(option.question_id, existing);
  }

  return questions.map((question) => ({
    id: question.id,
    question_type: question.question_type,
    prompt: question.prompt,
    options: (optionsByQuestion.get(question.id) ?? []).map((option) => ({
      id: option.id,
      option_text: option.option_text,
      sort_order: option.sort_order,
    })),
  }));
}

export async function getUjianForStudent(scheduleId: number, studentId: number) {
  const [schedule, student] = await Promise.all([
    findUjianSchedule(scheduleId),
    findUserById(studentId),
  ]);

  if (!schedule) return { ok: false as const, status: 404, message: "Jadwal ujian tidak ditemukan." };
  if (!student || student.role !== "siswa") {
    return { ok: false as const, status: 403, message: "Akses ujian hanya untuk siswa." };
  }
  const studentClass = student.department || student.title || "";
  const legacyClass = student.department ? await findKelasByName(student.department) : null;
  const resolvedStudentClass = legacyClass
    ? `${legacyClass.level} ${legacyClass.major}`.trim()
    : studentClass;

  if (!isStudentInSchedule(schedule, resolvedStudentClass)) {
    return { ok: false as const, status: 403, message: "Jadwal ujian ini bukan untuk kelas Anda." };
  }
  if (await hasExamResult(scheduleId, studentId)) {
    return { ok: false as const, status: 409, message: "Anda sudah mengirim jawaban untuk ujian ini." };
  }

  const timeMessage = assertExamOpen(schedule);
  if (timeMessage) return { ok: false as const, status: 403, message: timeMessage };

  const questions = await findUjianQuestions(scheduleId);
  if (questions.length === 0) {
    return { ok: false as const, status: 404, message: "Jadwal ini belum memiliki soal published." };
  }

  const options = await findUjianOptions(questions.map((question) => question.id));
  return {
    ok: true as const,
    schedule: {
      id: schedule.id,
      title: schedule.title,
      subject: schedule.subject,
      exam_type: schedule.exam_type,
      exam_date: formatDateValue(schedule.exam_date),
      start_time: normalizeTime(schedule.start_time),
      end_time: normalizeTime(schedule.end_time),
      room: schedule.room,
      duration_seconds: secondsBetweenTimes(schedule.start_time, schedule.end_time),
    },
    questions: shapeQuestions(questions, options),
  };
}

export async function submitUjianForStudent(
  scheduleId: number,
  studentId: number,
  answers: StudentAnswerPayload[],
  durationSeconds: number
) {
  const access = await getUjianForStudent(scheduleId, studentId);
  if (!access.ok) return access;

  const questions = await findUjianQuestions(scheduleId);
  const options = await findUjianOptions(questions.map((question) => question.id));
  const optionById = new Map(options.map((option) => [option.id, option]));
  const answerByQuestion = new Map(answers.map((answer) => [Number(answer.question_id), answer]));
  const pgQuestions = questions.filter((question) => question.question_type === "multiple_choice");

  let correctAnswers = 0;
  for (const question of pgQuestions) {
    const answer = answerByQuestion.get(question.id);
    const option = answer?.option_id ? optionById.get(Number(answer.option_id)) : undefined;
    if (option?.question_id === question.id && Boolean(option.is_correct)) {
      correctAnswers++;
    }
  }

  const wrongAnswers = Math.max(0, pgQuestions.length - correctAnswers);
  const score = pgQuestions.length > 0 ? Math.round((correctAnswers / pgQuestions.length) * 100) : 0;
  const topicPerformance = [{ label: access.schedule.subject, pct: score }];

  await createExamResult({
    exam_schedule_id: scheduleId,
    student_id: studentId,
    score,
    correct_answers: correctAnswers,
    wrong_answers: wrongAnswers,
    duration_seconds: Math.max(0, Math.floor(durationSeconds)),
    topic_performance: topicPerformance,
    answers,
  });

  return {
    ok: true as const,
    result: {
      score,
      correct_answers: correctAnswers,
      wrong_answers: wrongAnswers,
      duration_seconds: Math.max(0, Math.floor(durationSeconds)),
    },
  };
}
