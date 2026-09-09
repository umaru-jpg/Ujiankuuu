import { NextResponse } from "next/server";
import { getUjianForStudent } from "@/server/services/ujianService";

export async function GET(
  request: Request,
  { params }: { params: { scheduleId: string } }
) {
  try {
    const scheduleId = Number(params.scheduleId);
    const { searchParams } = new URL(request.url);
    const userId = Number(searchParams.get("userId"));

    if (!Number.isInteger(scheduleId) || scheduleId <= 0 || !Number.isInteger(userId) || userId <= 0) {
      return NextResponse.json(
        { message: "Parameter jadwal atau user tidak valid." },
        { status: 400 }
      );
    }

    const result = await getUjianForStudent(scheduleId, userId);
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status });
    }

    return NextResponse.json({
      schedule: result.schedule,
      questions: result.questions,
    });
  } catch (error) {
    console.error("GET /api/ujian/[scheduleId] error:", error);
    return NextResponse.json(
      { message: "Gagal membuka ujian." },
      { status: 500 }
    );
  }
}
