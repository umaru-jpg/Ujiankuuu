import { NextResponse } from "next/server";
import {
  getAdminClassSummaries,
  getAdminDistribution,
  getAdminSubjects,
  getAdminTotalExams,
} from "@/server/repositories/hasilRepository";

// ── GET /api/hasil ─────────────────────────────────────────────────────
// Admin: Get aggregated class summaries, distribution, subjects, and total exams.
// Query params: subject (optional, defaults to "Semua Mapel")

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "Semua Mapel";

    const [summaries, distribution, subjects, totalExams] = await Promise.all([
      getAdminClassSummaries(subject),
      getAdminDistribution(subject),
      getAdminSubjects(),
      getAdminTotalExams(),
    ]);

    return NextResponse.json({
      summaries,
      distribution,
      subjects,
      totalExams,
    });
  } catch (error) {
    console.error("GET /api/hasil error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data hasil ujian." },
      { status: 500 }
    );
  }
}
