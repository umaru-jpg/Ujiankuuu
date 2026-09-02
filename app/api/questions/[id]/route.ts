import { NextResponse } from "next/server";
import {
  findQuestionById,
  updateQuestion,
  deleteQuestion,
} from "@/server/repositories/questionRepository";
import type { QuestionLevel, QuestionStatus, QuestionType } from "@/server/repositories/questionRepository";

// ── GET /api/questions/[id] ────────────────────────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const question = await findQuestionById(id);
    if (!question) {
      return NextResponse.json(
        { message: "Soal tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(question);
  } catch (error) {
    console.error("GET /api/questions/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data soal." },
      { status: 500 }
    );
  }
}

// ── PUT /api/questions/[id] ────────────────────────────────────────────
// Update a question and optionally its options.

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Check if question exists
    const existing = await findQuestionById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Soal tidak ditemukan." },
        { status: 404 }
      );
    }

    // Validate level if provided
    if (body.level !== undefined) {
      const validLevels: QuestionLevel[] = ["X", "XI", "XII"];
      const level = body.level.toUpperCase();
      if (!validLevels.includes(level as QuestionLevel)) {
        return NextResponse.json(
          { message: `level harus salah satu dari: ${validLevels.join(", ")}` },
          { status: 400 }
        );
      }
      body.level = level;
    }

    // Validate status if provided
    if (body.status !== undefined) {
      const validStatuses: QuestionStatus[] = ["published", "draft"];
      const status = body.status.toLowerCase();
      if (!validStatuses.includes(status as QuestionStatus)) {
        return NextResponse.json(
          { message: `status harus salah satu dari: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      body.status = status;
    }

    // Validate question_type if provided
    if (body.question_type !== undefined) {
      const validTypes: QuestionType[] = ["multiple_choice", "essay"];
      const qType = body.question_type.toLowerCase();
      if (!validTypes.includes(qType as QuestionType)) {
        return NextResponse.json(
          { message: 'question_type harus "multiple_choice" atau "essay".' },
          { status: 400 }
        );
      }
      body.question_type = qType;
    }

    // Validate options if provided
    if (body.options !== undefined) {
      if (body.question_type === "multiple_choice" || existing.question_type === "multiple_choice") {
        if (!Array.isArray(body.options) || body.options.length < 2) {
          return NextResponse.json(
            { message: "PG harus memiliki minimal 2 opsi jawaban." },
            { status: 400 }
          );
        }

        const hasCorrect = body.options.some(
          (opt: { is_correct?: boolean }) => opt.is_correct === true
        );
        if (!hasCorrect) {
          return NextResponse.json(
            { message: "PG harus memiliki minimal 1 opsi jawaban benar." },
            { status: 400 }
          );
        }
      }
    }

    await updateQuestion(id, {
      subject: body.subject?.trim(),
      level: body.level,
      status: body.status,
      question_type: body.question_type,
      prompt: body.prompt?.trim(),
      color: body.color,
      options: body.options,
    });

    return NextResponse.json({ message: "Soal berhasil diperbarui." });
  } catch (error) {
    console.error("PUT /api/questions/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui soal." },
      { status: 500 }
    );
  }
}

// ── DELETE /api/questions/[id] ─────────────────────────────────────────

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const existing = await findQuestionById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Soal tidak ditemukan." },
        { status: 404 }
      );
    }

    const deleted = await deleteQuestion(id);
    if (!deleted) {
      return NextResponse.json(
        { message: "Gagal menghapus soal." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Soal berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/questions/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus soal." },
      { status: 500 }
    );
  }
}
