import { NextResponse } from "next/server";
import {
  findUserById,
  updateUser,
  deleteUser,
} from "@/server/repositories/userManagementRepository";
import type { Role } from "@/lib/auth";

// ── GET /api/users/[id] ────────────────────────────────────────────────

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

    const user = await findUserById(id);
    if (!user) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("GET /api/users/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}

// ── PUT /api/users/[id] ────────────────────────────────────────────────
// Update user.
// Body: { name?, email?, password?, role?, department?, title? }

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

    // Validate name if provided
    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json(
          { message: 'Field "name" tidak boleh kosong.' },
          { status: 400 }
        );
      }
    }

    // Validate email if provided
    if (body.email !== undefined) {
      if (typeof body.email !== "string" || !body.email.trim()) {
        return NextResponse.json(
          { message: 'Field "email" tidak boleh kosong.' },
          { status: 400 }
        );
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email.trim())) {
        return NextResponse.json(
          { message: "Format email tidak valid." },
          { status: 400 }
        );
      }
    }

    // Validate password if provided
    if (body.password !== undefined && body.password.trim() !== "") {
      if (body.password.trim().length < 4) {
        return NextResponse.json(
          { message: "Password minimal 4 karakter." },
          { status: 400 }
        );
      }
    }

    // Validate role if provided
    const validRoles: Role[] = ["admin", "guru", "siswa"];
    if (body.role !== undefined) {
      const role = body.role.toLowerCase();
      if (!validRoles.includes(role as Role)) {
        return NextResponse.json(
          { message: `role harus salah satu dari: ${validRoles.join(", ")}` },
          { status: 400 }
        );
      }
      body.role = role;
    }

    // Check if user exists
    const existing = await findUserById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await updateUser(id, {
      name: body.name?.trim(),
      email: body.email?.trim(),
      password: body.password?.trim(),
      role: body.role as Role | undefined,
      department: body.department?.trim(),
      title: body.title?.trim(),
    });

    if (!updated) {
      return NextResponse.json(
        { message: "Tidak ada data yang diubah." },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Pengguna berhasil diperbarui." });
  } catch (error) {
    const err = error as { code?: string; message?: string };

    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "Email sudah terdaftar." },
        { status: 409 }
      );
    }

    console.error("PUT /api/users/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal memperbarui pengguna." },
      { status: 500 }
    );
  }
}

// ── DELETE /api/users/[id] ─────────────────────────────────────────────

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

    const existing = await findUserById(id);
    if (!existing) {
      return NextResponse.json(
        { message: "Pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    const deleted = await deleteUser(id);
    if (!deleted) {
      return NextResponse.json(
        { message: "Gagal menghapus pengguna." },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Pengguna berhasil dihapus." });
  } catch (error) {
    const err = error as { code?: string };

    // Handle foreign key constraint
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { message: "Pengguna tidak dapat dihapus karena masih memiliki data terkait." },
        { status: 409 }
      );
    }

    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json(
      { message: "Gagal menghapus pengguna." },
      { status: 500 }
    );
  }
}
