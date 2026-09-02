import { NextResponse } from "next/server";
import { getGuruExamResults } from "@/server/repositories/hasilRepository";

// ── GET /api/hasil/guru ────────────────────────────────────────────────
// Guru: Get all completed exams with their student results.
// Query params: userId (required, the guru's user ID)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get("userId");

    if (!userIdStr) {
      return NextResponse.json(
        { message: "Parameter userId wajib diisi." },
        { status: 400 }
      );
    }

    const userId = Number(userIdStr);
    if (Number.isNaN(userId)) {
      return NextResponse.json(
        { message: "userId harus berupa angka." },
        { status: 400 }
      );
    }

    const exams = await getGuruExamResults(userId);

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("GET /api/hasil/guru error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data hasil ujian guru." },
      { status: 500 }
    );
  }
}
