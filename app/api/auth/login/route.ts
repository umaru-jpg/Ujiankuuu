import { NextResponse } from "next/server";
import { authenticateUser } from "@/server/services/authService";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const identifier =
      typeof body.identifier === "string" ? body.identifier : "";
    const password = typeof body.password === "string" ? body.password : "";

    const user = await authenticateUser(identifier, password);
    if (!user) {
      return NextResponse.json(
        { message: "Username atau password salah." },
        { status: 401 }
      );
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Login gagal. Periksa koneksi database." },
      { status: 500 }
    );
  }
}
