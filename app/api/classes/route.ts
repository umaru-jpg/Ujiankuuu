import { NextResponse } from "next/server";
import { getMysqlPool } from "@/server/db/mysql";
import type { RowDataPacket } from "mysql2";

interface ClassRow extends RowDataPacket {
  id: number;
  name: string;
  level: string;
  major: string;
}

// ── GET /api/classes ───────────────────────────────────────────────────
// Fetch all classes ordered by name. Used for combobox in management page.

export async function GET() {
  try {
    const pool = getMysqlPool();
    const [rows] = await pool.execute<ClassRow[]>(
      `SELECT id, name, level, major
       FROM classes
       ORDER BY level ASC, name ASC`
    );

    return NextResponse.json({ data: rows });
  } catch (error) {
    console.error("GET /api/classes error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data kelas." },
      { status: 500 }
    );
  }
}
