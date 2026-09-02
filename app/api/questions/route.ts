import { NextResponse } from "next/server";
import {
  findAllQuestions,
  bulkCreateQuestions,
  findDistinctQuestionSubjects,
} from "@/server/repositories/questionRepository";
import type { QuestionLevel, QuestionStatus, QuestionType } from "@/server/repositories/questionRepository";

// ── GET /api/questions ─────────────────────────────────────────────────
// List questions with pagination, filter, and search.
// Query params: page, limit, subject, level, status, search, author_id

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined;
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined;
    const subject = searchParams.get("subject") || undefined;
    const levelParam = searchParams.get("level");
    const statusParam = searchParams.get("status");
    const search = searchParams.get("search") || undefined;
    const authorId = searchParams.get("author_id")
      ? Number(searchParams.get("author_id"))
      : undefined;

    const level = levelParam
      ? (levelParam.toUpperCase() as QuestionLevel)
      : undefined;
    const status = statusParam
      ? (statusParam.toLowerCase() as QuestionStatus)
      : undefined;

    const result = await findAllQuestions({
      page,
      limit: limit ?? 100,
      subject,
      level,
      status,
      search,
      author_id: authorId || undefined,
    });

    // Also return distinct subjects for filter dropdown
    const subjects = await findDistinctQuestionSubjects();

    return NextResponse.json({
      ...result,
      subjects,
    });
  } catch (error) {
    console.error("GET /api/questions error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data soal." },
      { status: 500 }
    );
  }
}

// ── POST /api/questions ────────────────────────────────────────────────
// Bulk create multiple questions in one request.
// Body: { subject, level, status, author_id, author_name, color?, questions: [...] }

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required top-level fields
    if (!body.subject || typeof body.subject !== "string" || !body.subject.trim()) {
      return NextResponse.json(
        { message: 'Field "subject" wajib diisi.' },
        { status: 400 }
      );
    }

    const validLevels: QuestionLevel[] = ["X", "XI", "XII"];
    const level = typeof body.level === "string" ? body.level.toUpperCase() : "";
    if (!validLevels.includes(level as QuestionLevel)) {
      return NextResponse.json(
        { message: `level harus salah satu dari: ${validLevels.join(", ")}` },
        { status: 400 }
      );
    }

    const validStatuses: QuestionStatus[] = ["published", "draft"];
    const status = typeof body.status === "string" ? body.status.toLowerCase() : "draft";
    if (!validStatuses.includes(status as QuestionStatus)) {
      return NextResponse.json(
        { message: `status harus salah satu dari: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    if (!body.author_id || typeof body.author_id !== "number") {
      return NextResponse.json(
        { message: 'Field "author_id" wajib diisi.' },
        { status: 400 }
      );
    }

    if (!body.author_name || typeof body.author_name !== "string") {
      return NextResponse.json(
        { message: 'Field "author_name" wajib diisi.' },
        { status: 400 }
      );
    }

    // Validate questions array
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { message: 'Field "questions" harus berupa array tidak kosong.' },
        { status: 400 }
      );
    }

    const validTypes: QuestionType[] = ["multiple_choice", "essay"];

    for (let i = 0; i < body.questions.length; i++) {
      const q = body.questions[i];

      if (!q.prompt || typeof q.prompt !== "string" || !q.prompt.trim()) {
        return NextResponse.json(
          { message: `Soal ke-${i + 1}: prompt wajib diisi.` },
          { status: 400 }
        );
      }

      const qType = typeof q.question_type === "string" ? q.question_type.toLowerCase() : "";
      if (!validTypes.includes(qType as QuestionType)) {
        return NextResponse.json(
          { message: `Soal ke-${i + 1}: question_type harus "multiple_choice" atau "essay".` },
          { status: 400 }
        );
      }

      // Validate options for multiple choice
      if (qType === "multiple_choice") {
        if (!Array.isArray(q.options) || q.options.length < 2) {
          return NextResponse.json(
            { message: `Soal ke-${i + 1}: PG harus memiliki minimal 2 opsi jawaban.` },
            { status: 400 }
          );
        }

        const hasCorrect = q.options.some(
          (opt: { is_correct?: boolean }) => opt.is_correct === true
        );
        if (!hasCorrect) {
          return NextResponse.json(
            { message: `Soal ke-${i + 1}: PG harus memiliki minimal 1 opsi jawaban benar.` },
            { status: 400 }
          );
        }
      }
    }

    const createdCount = await bulkCreateQuestions({
      subject: body.subject.trim(),
      level: level as QuestionLevel,
      status: status as QuestionStatus,
      author_id: body.author_id,
      author_name: body.author_name,
      color: body.color,
      questions: body.questions.map(
        (q: {
          question_type: string;
          prompt: string;
          options?: { option_text: string; is_correct: boolean }[];
        }) => ({
          question_type: q.question_type.toLowerCase() as QuestionType,
          prompt: q.prompt.trim(),
          options: q.options,
        })
      ),
    });

    return NextResponse.json(
      { message: `${createdCount} soal berhasil dibuat.`, count: createdCount },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/questions error:", error);
    return NextResponse.json(
      { message: "Gagal membuat soal." },
      { status: 500 }
    );
  }
}
