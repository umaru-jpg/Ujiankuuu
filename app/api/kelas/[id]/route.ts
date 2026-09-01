import { NextResponse } from "next/server";
import {
  findKelasById,
  findKelasByName,
  updateKelas,
  deleteKelas,
} from "@/server/repositories/kelasRepository";
import type { KelasLevel } from "@/server/repositories/kelasRepository";

const VALID_LEVELS: KelasLevel[] = ["X", "XI", "XII"];

// ── GET /api/kelas/:id ─────────────────────────────────────────────────
// Get a single class by ID.

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const kelas = await findKelasById(id);
    if (!kelas) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(kelas);
  } catch (error) {
    console.error("GET /api/kelas/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data kelas." },
      { status: 500 }
    );
  }
}

// ── PUT /api/kelas/:id ─────────────────────────────────────────────────
// Update a class. Body: any subset of fields.

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const existing = await findKelasById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await request.json();

    const updateDto: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim().toUpperCase();
      if (!name) {
        return NextResponse.json(
          { message: "Nama kelas tidak boleh kosong." },
          { status: 400 }
        );
      }
      // Check duplicate name (excluding current record)
      const dup = await findKelasByName(name);
      if (dup && dup.id !== id) {
        return NextResponse.json(
          { message: `Kelas ${name} sudah terdaftar.` },
          { status: 409 }
        );
      }
      updateDto.name = name;
    }

    if (body.level !== undefined) {
      if (!VALID_LEVELS.includes(body.level)) {
        return NextResponse.json(
          { message: `Tingkat harus salah satu dari: ${VALID_LEVELS.join(", ")}` },
          { status: 400 }
        );
      }
      updateDto.level = body.level;
    }

    if (body.major !== undefined) {
      const major = String(body.major).trim();
      if (!major) {
        return NextResponse.json(
          { message: "Jurusan tidak boleh kosong." },
          { status: 400 }
        );
      }
      updateDto.major = major;
    }

    if (body.homeroom_teacher !== undefined) {
      const homeroom_teacher = String(body.homeroom_teacher).trim();
      if (!homeroom_teacher) {
        return NextResponse.json(
          { message: "Nama wali kelas tidak boleh kosong." },
          { status: 400 }
        );
      }
      updateDto.homeroom_teacher = homeroom_teacher;
    }

    if (body.student_count !== undefined) {
      const student_count = Number(body.student_count);
      if (!Number.isInteger(student_count) || student_count <= 0) {
        return NextResponse.json(
          { message: "Jumlah siswa harus bilangan bulat lebih dari 0." },
          { status: 400 }
        );
      }
      updateDto.student_count = student_count;
    }

    const updated = await updateKelas(id, updateDto);
    if (!updated) {
      return NextResponse.json(
        { message: "Gagal memperbarui kelas." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Kelas berhasil diperbarui." });
  } catch (error) {
    console.error("PUT /api/kelas/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui kelas." },
      { status: 500 }
    );
  }
}

// ── DELETE /api/kelas/:id ──────────────────────────────────────────────
// Delete a class by ID.

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { message: "ID tidak valid." },
        { status: 400 }
      );
    }

    const existing = await findKelasById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Kelas tidak ditemukan." },
        { status: 404 }
      );
    }

    const deleted = await deleteKelas(id);
    if (!deleted) {
      return NextResponse.json(
        { message: "Gagal menghapus kelas." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Kelas berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/kelas/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus kelas." },
      { status: 500 }
    );
  }
}
