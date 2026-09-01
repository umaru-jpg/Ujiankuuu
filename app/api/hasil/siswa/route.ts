import { NextResponse } from "next/server";
import {
  getSiswaLatestResult,
  getSiswaAllResults,
} from "@/server/repositories/hasilRepository";

// ── GET /api/hasil/siswa ───────────────────────────────────────────────
// Siswa: Get exam results (latest or all).
// Query params: userId (required), all (optional, "true" to get all results)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdStr = searchParams.get("userId");
    const all = searchParams.get("all") === "true";

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

    if (all) {
      const results = await getSiswaAllResults(userId);
      return NextResponse.json({ results });
    }

    const result = await getSiswaLatestResult(userId);
    return NextResponse.json({ result });
  } catch (error) {
    console.error("GET /api/hasil/siswa error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data hasil ujian siswa." },
      { status: 500 }
    );
  }
}
