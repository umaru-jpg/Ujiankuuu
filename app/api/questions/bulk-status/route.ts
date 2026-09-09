import { NextResponse } from "next/server";
import {
  updateQuestionsStatus,
  type QuestionStatus,
} from "@/server/repositories/questionRepository";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const rawIds = (Array.isArray(body.question_ids) ? body.question_ids : []) as unknown[];
    const normalizedIds = rawIds.map(Number);
    const questionIds = Array.from(new Set(normalizedIds)).filter(
      (id): id is number => Number.isInteger(id) && id > 0
    );
    const status = typeof body.status === "string" ? body.status.toLowerCase() : "";
    const validStatuses: QuestionStatus[] = ["published", "draft"];

    if (questionIds.length === 0) {
      return NextResponse.json(
        { message: "Pilih minimal 1 soal." },
        { status: 400 }
      );
    }
    if (!validStatuses.includes(status as QuestionStatus)) {
      return NextResponse.json(
        { message: "Status harus published atau draft." },
        { status: 400 }
      );
    }

    const updated = await updateQuestionsStatus(questionIds, status as QuestionStatus);
    return NextResponse.json({
      message: `${updated} soal berhasil diubah menjadi ${status}.`,
      updated,
    });
  } catch (error) {
    console.error("PATCH /api/questions/bulk-status error:", error);
    return NextResponse.json(
      { message: "Gagal mengubah status soal." },
      { status: 500 }
    );
  }
}
