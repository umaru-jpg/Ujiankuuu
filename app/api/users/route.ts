import { NextResponse } from "next/server";
import {
  findAllUsers,
  createUser,
} from "@/server/repositories/userManagementRepository";
import type { Role } from "@/lib/auth";

// ── GET /api/users ─────────────────────────────────────────────────────
// List users with pagination, filter, and search.
// Query params: page, limit, role, search

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const page = searchParams.get("page")
      ? Number(searchParams.get("page"))
      : undefined;
    const limit = searchParams.get("limit")
      ? Number(searchParams.get("limit"))
      : undefined;
    const roleParam = searchParams.get("role");
    const search = searchParams.get("search") || undefined;

    const role = roleParam
      ? (roleParam.toLowerCase() as Role)
      : undefined;

    const result = await findAllUsers({
      page,
      limit: limit ?? 100, // Get all users by default for management page
      role,
      search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { message: "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}

// ── POST /api/users ────────────────────────────────────────────────────
// Create a new user.
// Body: { name, email, password, role, department?, title? }

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json(
        { message: 'Field "name" wajib diisi.' },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== "string" || !body.email.trim()) {
      return NextResponse.json(
        { message: 'Field "email" wajib diisi.' },
        { status: 400 }
      );
    }

    if (
      !body.password ||
      typeof body.password !== "string" ||
      body.password.trim().length < 4
    ) {
      return NextResponse.json(
        { message: 'Field "password" wajib diisi minimal 4 karakter.' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles: Role[] = ["admin", "guru", "siswa"];
    const role = typeof body.role === "string" ? body.role.toLowerCase() : "siswa";
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json(
        { message: `role harus salah satu dari: ${validRoles.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email.trim())) {
      return NextResponse.json(
        { message: "Format email tidak valid." },
        { status: 400 }
      );
    }

    const id = await createUser({
      name: body.name.trim(),
      email: body.email.trim(),
      password: body.password,
      role: role as Role,
      department: body.department?.trim() || undefined,
      title: body.title?.trim() || undefined,
    });

    return NextResponse.json(
      { message: "Pengguna berhasil dibuat.", id },
      { status: 201 }
    );
  } catch (error) {
    const err = error as { code?: string; message?: string };

    // Handle duplicate entry
    if (err.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "Email atau username sudah terdaftar." },
        { status: 409 }
      );
    }

    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { message: "Gagal membuat pengguna." },
      { status: 500 }
    );
  }
}
