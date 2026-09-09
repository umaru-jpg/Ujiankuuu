import { NextResponse } from "next/server";
import { submitUjianForStudent } from "@/server/services/ujianService";

export async function POST(
  request: Request,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const scheduleId = Number(params.scheduleId);
    const body = await request.json();
    const userId = Number(body.userId);
    const answers = Array.isArray(body.answers) ? body.answers : [];
    const durationSeconds = Number(body.duration_seconds ?? 0);

    if (!Number.isInteger(scheduleId) || scheduleId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { message: "Parameter jadwal atau user tidak valid." },
        { status: 400 }
      );
    }

    const result = await submitUjianForStudent(
      scheduleId,
      userId,
      answers,
      Number.isFinite(durationSeconds) ? durationSeconds : 0
    );
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json(result.result, { status: 201 });
  } catch (error) {
    console.error("POST /api/ujian/[scheduleId]/submit error:", error);
    return NextResponse.json(
      { message: "Gagal mengirim jawaban ujian." },
      { status: 500 }
    );
  }
}
