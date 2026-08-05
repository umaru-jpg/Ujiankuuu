export type Role = "admin" | "guru" | "siswa";

export interface User {
  id: number;
  name: string;
  username: string;
  /** Hanya dipakai di akun demo; tidak pernah disimpan ke session browser. */
  password?: string;
  role: Role;
  title: string;
  initial: string;
  color: string; // tailwind gradient stops for avatar
}

/**
 * Akun demo (frontend-only, tanpa backend).
 *  - admin  / admin123  -> /admin
 *  - guru   / guru123   -> /guru
 *  - siswa  / siswa123  -> /siswa
 */
export const MOCK_USERS: User[] = [
  {
    id: 1,
    name: "Admin",
    username: "admin",
    password: "admin123",
    role: "admin",
    title: "Administrator Sistem",
    initial: "A",
    color: "from-blue-600 to-indigo-500",
  },
  {
    id: 2,
    name: "Bpk. Budi Santoso",
    username: "guru",
    password: "guru123",
    role: "guru",
    title: "Guru Mapel RPL",
    initial: "B",
    color: "from-emerald-600 to-teal-500",
  },
  {
    id: 3,
    name: "Ahmad Fauzi",
    username: "siswa",
    password: "siswa123",
    role: "siswa",
    title: "X RPL 1",
    initial: "A",
    color: "from-violet-600 to-purple-500",
  },
];

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

const SESSION_KEY = "ujiankuuu_session";

/** Salinan user tanpa password, aman untuk disimpan di browser. */
function buildSession(user: User): Omit<User, "password"> {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    title: user.title,
    initial: user.initial,
    color: user.color,
  };
}

export function login(username: string, password: string, remember: boolean): User | null {
  const user = MOCK_USERS.find(
    (u) =>
      u.username.toLowerCase() === username.trim().toLowerCase() &&
      u.password === password
  );
  if (user) {
    // Ingat Saya = localStorage (tetap ada setelah browser ditutup),
    // jika tidak dicentang pakai sessionStorage (hilang saat tab ditutup).
    const session = buildSession(user);
    if (remember) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }
  return user ?? null;
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
  sessionStorage.removeItem(SESSION_KEY);
}
