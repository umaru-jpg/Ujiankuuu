import { NextResponse } from "next/server";
import {
  findAllKelas,
  findKelasByName,
  createKelas,
} from "@/server/repositories/kelasRepository";
import type { KelasLevel } from "@/server/repositories/kelasRepository";

const VALID_LEVELS: KelasLevel[] = ["X", "XI", "XII"];

// ── GET /api/kelas ─────────────────────────────────────────────────────
// List all classes.

export async function GET() {
  try {
    const kelas = await findAllKelas();
    return NextResponse.json({ kelas });
  } catch (error) {
    console.error("GET /api/kelas error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data kelas." },
      { status: 500 }
    );
  }
}

// ── POST /api/kelas ────────────────────────────────────────────────────
// Create a new class.
// Body: { name, level, major, homeroom_teacher, student_count }

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim().toUpperCase() : "";
    const level = body.level as KelasLevel;
    const major = typeof body.major === "string" ? body.major.trim() : "";
    const homeroom_teacher =
      typeof body.homeroom_teacher === "string" ? body.homeroom_teacher.trim() : "";
    const student_count = Number(body.student_count);

    if (!name) {
      return NextResponse.json(
        { message: "Nama kelas wajib diisi." },
        { status: 400 }
      );
    }
    if (!VALID_LEVELS.includes(level)) {
      return NextResponse.json(
        { message: `Tingkat harus salah satu dari: ${VALID_LEVELS.join(", ")}` },
        { status: 400 }
      );
    }
    if (!major) {
      return NextResponse.json(
        { message: "Jurusan wajib diisi." },
        { status: 400 }
      );
    }
    if (!homeroom_teacher) {
      return NextResponse.json(
        { message: "Nama wali kelas wajib diisi." },
        { status: 400 }
      );
    }
    if (!Number.isInteger(student_count) || student_count <= 0) {
      return NextResponse.json(
        { message: "Jumlah siswa harus bilangan bulat lebih dari 0." },
        { status: 400 }
      );
    }

    const existing = await findKelasByName(name);
    if (existing) {
      return NextResponse.json(
        { message: `Kelas ${name} sudah terdaftar.` },
        { status: 409 }
      );
    }

    const id = await createKelas({
      name,
      level,
      major,
      homeroom_teacher,
      student_count,
    });

    return NextResponse.json(
      { message: "Kelas berhasil ditambahkan.", id },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/kelas error:", error);
    return NextResponse.json(
      { message: "Gagal menambahkan kelas." },
      { status: 500 }
    );
  }
}
