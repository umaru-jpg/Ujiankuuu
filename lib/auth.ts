export type Role = "admin" | "guru" | "siswa";

export interface User {
  id: number;
  name: string;
  username: string;
  role: Role;
  title: string;
  initial: string;
  color: string; // tailwind gradient stops for avatar
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  guru: "Guru",
  siswa: "Siswa",
};

export const HOME_BY_ROLE: Record<Role, string> = {
  admin: "/admin",
  guru: "/guru",
  siswa: "/siswa",
};

const LEGACY_SESSION_KEY = "ujiankuuu_session";
const SESSION_KEY = "ujiankuuu_auth_session";

export async function login(
  identifier: string,
  password: string,
  remember: boolean
): Promise<User | null> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as { user?: User };
  if (!data.user) return null;

  // Ingat Saya = localStorage (tetap ada setelah browser ditutup),
  // jika tidak dicentang pakai sessionStorage (hilang saat tab ditutup).
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(SESSION_KEY, JSON.stringify(data.user));

  return data.user;
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(LEGACY_SESSION_KEY);
}
