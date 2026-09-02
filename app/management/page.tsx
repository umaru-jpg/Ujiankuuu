"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import Icon from "@/components/Icon";

type UserRole = "Guru" | "Siswa" | "Admin";
type ApiRole = "admin" | "guru" | "siswa";

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  dept: string;
}

interface KelasOption {
  id: number;
  name: string;
  level: string;
  major: string;
}

// ── Helpers ────────────────────────────────────────────────────────────

function apiRoleToDisplay(apiRole: ApiRole): UserRole {
  const map: Record<ApiRole, UserRole> = {
    admin: "Admin",
    guru: "Guru",
    siswa: "Siswa",
  };
  return map[apiRole];
}

function displayRoleToApi(displayRole: UserRole): ApiRole {
  const map: Record<UserRole, ApiRole> = {
    Admin: "admin",
    Guru: "guru",
    Siswa: "siswa",
  };
  return map[displayRole];
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ── Constants ──────────────────────────────────────────────────────────

const ROLE_FILTERS = ["Semua Role", "Guru", "Siswa", "Admin"] as const;

const PAGE_SIZE = 5;

const ROLE_BADGE: Record<UserRole, string> = {
  Guru: "bg-blue-100 text-blue-800",
  Siswa: "bg-gray-100 text-gray-800",
  Admin: "bg-purple-100 text-purple-800",
};

const AVATAR_COLOR: Record<UserRole, string> = {
  Guru: "bg-primary/10 text-primary",
  Siswa: "bg-green-100 text-green-700",
  Admin: "bg-purple-100 text-purple-700",
};

interface FormState {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  dept: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  role: "Siswa",
  dept: "",
};

// ── Page Component ─────────────────────────────────────────────────────

export default function ManagementUserPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [roleFilter, setRoleFilter] = useState<(typeof ROLE_FILTERS)[number]>(
    ROLE_FILTERS[0]
  );
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Modal tambah/edit
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Data kelas untuk combobox
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [kelasLoading, setKelasLoading] = useState(false);

  // ── Fetch users from API ───────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/users");
      if (!res.ok) {
        throw new Error("Gagal memuat data pengguna.");
      }
      const data = await res.json();
      const mapped: ManagedUser[] = (data.data || []).map(
        (u: {
          id: number;
          name: string;
          email: string | null;
          role: ApiRole;
          department: string | null;
        }) => ({
          id: u.id,
          name: u.name,
          email: u.email || "",
          role: apiRoleToDisplay(u.role),
          dept: u.department || "",
        })
      );
      setUsers(mapped);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data pengguna. Pastikan server berjalan.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch kelas list from API ──────────────────────────────────────

  const fetchKelas = useCallback(async () => {
    try {
      setKelasLoading(true);
      const res = await fetch("/api/classes");
      if (!res.ok) return;
      const data = await res.json();
      setKelasList(data.data || []);
    } catch (err) {
      console.error("Gagal memuat data kelas:", err);
    } finally {
      setKelasLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchKelas();
  }, [fetchUsers, fetchKelas]);

  // ── Filtering & Pagination ─────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchRole = roleFilter === "Semua Role" || u.role === roleFilter;
      const matchSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [users, roleFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, filtered.length);

  function changePage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  // ── Modal handlers ─────────────────────────────────────────────────

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(u: ManagedUser) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      dept: u.dept,
    });
    setOpen(true);
  }

  function handleRoleChange(newRole: UserRole) {
    setForm((f) => {
      // When switching to Siswa, clear dept so user picks from combobox
      // When switching away from Siswa, also clear dept
      return { ...f, role: newRole, dept: "" };
    });
  }

  // ── Submit: Create or Update ───────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return;

    // Validate password for new user
    if (editingId === null && (!form.password || form.password.trim().length < 4)) {
      alert("Password minimal 4 karakter.");
      return;
    }

    // Validate kelas selection for Siswa
    if (form.role === "Siswa" && !form.dept.trim()) {
      alert("Silakan pilih kelas untuk siswa.");
      return;
    }

    setSubmitting(true);

    try {
      if (editingId !== null) {
        // UPDATE
        const body: Record<string, string> = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: displayRoleToApi(form.role),
          department: form.dept.trim(),
        };
        if (form.password.trim()) {
          body.password = form.password.trim();
        }

        const res = await fetch(`/api/users/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Gagal memperbarui pengguna.");
        }
      } else {
        // CREATE
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password.trim(),
            role: displayRoleToApi(form.role),
            department: form.dept.trim(),
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || "Gagal membuat pengguna.");
        }
      }

      // Success
      setForm(EMPTY_FORM);
      setEditingId(null);
      setOpen(false);
      setPage(1);
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────

  async function handleDelete(u: ManagedUser) {
    if (!confirm(`Yakin ingin menghapus "${u.name}"?`)) return;

    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal menghapus pengguna.");
      }
      await fetchUsers();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Gagal menghapus pengguna.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────

  const isSiswa = form.role === "Siswa";

  return (
    <DashboardLayout active="management" allowedRoles={["admin"]}>
      <div className="max-w-[1280px] mx-auto">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-4 md:mb-stack-lg">
          <div>
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
              Manajemen Pengguna
            </h2>
            <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant mt-1">
              Kelola data guru, siswa, dan administrator sistem.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm whitespace-nowrap min-h-[44px] cursor-pointer active:scale-95 duration-200"
          >
            <Icon name="add" size={20} />
            <span className="hidden sm:inline">Tambah User</span>
            <span className="sm:hidden">Baru</span>
          </button>
        </div>

        {/* Filter & Search Controls */}
        <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-3 md:p-4 mb-4 md:mb-stack-lg">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-center justify-between">
            {/* Search (mobile) */}
            <div className="w-full md:w-1/3 relative md:hidden">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                size={18}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama atau email..."
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-sm text-body-sm transition-all text-on-surface placeholder:text-outline"
              />
            </div>
            {/* Role filter */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
              {ROLE_FILTERS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoleFilter(r);
                    setPage(1);
                  }}
                  className={`whitespace-nowrap px-3 md:px-4 py-2 rounded-lg font-body-sm text-body-sm min-h-[40px] md:min-h-[44px] transition-all cursor-pointer active:scale-95 ${
                    roleFilter === r
                      ? "bg-primary-container text-white"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-outline-variant/50"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {/* Search (desktop) */}
            <div className="hidden md:block w-1/3 relative">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                size={18}
              />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Cari nama atau email..."
                className="w-full pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-body-sm text-body-sm transition-all text-on-surface placeholder:text-outline"
              />
            </div>
            <button className="flex items-center gap-2 px-3 md:px-4 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container min-h-[40px] md:min-h-[44px] w-full md:w-auto justify-center cursor-pointer active:scale-95">
              <Icon name="filter_list" size={18} />
              <span className="hidden sm:inline">Filter Lainnya</span>
              <span className="sm:hidden">Filter</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Memuat data pengguna...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-surface-container-lowest border border-error/50 shadow-sm rounded-xl p-8 text-center">
            <Icon name="error_outline" size={32} className="text-error mx-auto mb-2" />
            <p className="font-title-sm text-title-sm text-error">{error}</p>
            <button
              onClick={fetchUsers}
              className="mt-3 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-sm text-body-sm cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Data Table Card */}
        {!loading && !error && (
          <div className="bg-surface-container-lowest border border-outline-variant shadow-sm rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/50 bg-surface-container-low">
                    <th className="py-3 md:py-4 px-4 md:px-6 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                      Nama
                    </th>
                    <th className="py-3 md:py-4 px-4 md:px-6 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden md:table-cell">
                      Email
                    </th>
                    <th className="py-3 md:py-4 px-4 md:px-6 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                      Role
                    </th>
                    <th className="py-3 md:py-4 px-4 md:px-6 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider hidden sm:table-cell">
                      Kelas/Dept
                    </th>
                    <th className="py-3 md:py-4 px-4 md:px-6 font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider text-right">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30 font-body-sm text-body-sm text-on-surface">
                  {paged.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 md:py-12 text-center">
                        <Icon name="group_off" size={32} className="text-outline mx-auto mb-2" />
                        <p className="font-title-sm text-title-sm text-on-surface">
                          Tidak ada pengguna yang cocok
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                          Coba ubah filter atau tambahkan pengguna baru.
                        </p>
                      </td>
                    </tr>
                  )}
                  {paged.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-container-low transition-colors group">
                      <td className="py-3 md:py-4 px-4 md:px-6">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div
                            className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${AVATAR_COLOR[u.role]} flex items-center justify-center font-bold text-[10px] md:text-xs shrink-0`}
                          >
                            {initialsOf(u.name)}
                          </div>
                          <div>
                            <span className="font-semibold text-on-surface group-hover:text-primary transition-colors text-sm md:text-base">
                              {u.name}
                            </span>
                            <span className="block md:hidden font-body-sm text-body-sm text-on-surface-variant text-xs">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 md:py-4 px-4 md:px-6 text-on-surface-variant hidden md:table-cell">{u.email}</td>
                      <td className="py-3 md:py-4 px-4 md:px-6">
                        <span
                          className={`inline-flex items-center px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-[12px] font-medium ${ROLE_BADGE[u.role]}`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 md:py-4 px-4 md:px-6 text-on-surface-variant hidden sm:table-cell">{u.dept}</td>
                      <td className="py-3 md:py-4 px-4 md:px-6 text-right">
                        <button
                          aria-label={`Edit ${u.name}`}
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                        >
                          <Icon name="edit" size={18} />
                        </button>
                        <button
                          aria-label={`Hapus ${u.name}`}
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-on-surface-variant hover:text-error transition-colors ml-1 cursor-pointer"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-t border-outline-variant/50 bg-surface-container-lowest">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Menampilkan {rangeStart}-{rangeEnd} dari {filtered.length} pengguna
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => changePage(safePage - 1)}
                  disabled={safePage <= 1}
                  aria-label="Halaman sebelumnya"
                  className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Icon name="chevron_left" size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => changePage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded font-medium text-sm cursor-pointer transition-colors ${
                      p === safePage
                        ? "bg-primary text-on-primary"
                        : "border border-outline-variant text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => changePage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  aria-label="Halaman berikutnya"
                  className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Icon name="chevron_right" size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Tambah/Edit User */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingId !== null ? "Edit user" : "Tambah user"}
        >
          <div
            className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm"
            onClick={() => !submitting && setOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant">
              <div>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  {editingId !== null ? "Edit User" : "Tambah User Baru"}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {editingId !== null
                    ? "Perbarui data pengguna di bawah ini."
                    : "Lengkapi data pengguna baru di bawah ini."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                aria-label="Tutup"
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label
                  htmlFor="user-name"
                  className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                >
                  NAMA LENGKAP
                </label>
                <input
                  id="user-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Budi Prakoso"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-outline"
                />
              </div>

              <div>
                <label
                  htmlFor="user-email"
                  className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                >
                  EMAIL
                </label>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="nama@smkjp1.sch.id"
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-outline"
                />
              </div>

              <div>
                <label
                  htmlFor="user-password"
                  className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                >
                  PASSWORD
                </label>
                <input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder={
                    editingId !== null
                      ? "Kosongkan jika tidak ingin mengubah"
                      : "Minimal 4 karakter"
                  }
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-outline"
                />
                {editingId !== null && (
                  <p className="text-xs text-on-surface-variant mt-1">
                    Biarkan kosong jika tidak ingin mengubah password.
                  </p>
                )}
              </div>

              {/* Role selection */}
              <div>
                <label
                  htmlFor="user-role"
                  className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                >
                  ROLE
                </label>
                <div className="relative">
                  <select
                    id="user-role"
                    value={form.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                  >
                    {(["Guru", "Siswa", "Admin"] as UserRole[]).map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Kelas / Dept field - dynamic based on role */}
              {isSiswa ? (
                <div>
                  <label
                    htmlFor="user-kelas"
                    className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                  >
                    KELAS
                  </label>
                  <div className="relative">
                    <select
                      id="user-kelas"
                      value={form.dept}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, dept: e.target.value }))
                      }
                      className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                    >
                      <option value="">
                        {kelasLoading
                          ? "Memuat kelas..."
                          : "-- Pilih Kelas --"}
                      </option>
                      {kelasList.map((k) => (
                        <option key={k.id} value={k.name}>
                          {k.name} — {k.level} {k.major}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                  {kelasList.length === 0 && !kelasLoading && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      Belum ada data kelas. Tambahkan kelas terlebih dahulu di menu Manajemen Kelas.
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="user-dept"
                    className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                  >
                    {form.role === "Guru" ? "MATA PELAJARAN" : "DEPARTEMEN"}
                  </label>
                  <input
                    id="user-dept"
                    value={form.dept}
                    onChange={(e) => setForm((f) => ({ ...f, dept: e.target.value }))}
                    placeholder={
                      form.role === "Guru"
                        ? "Contoh: Matematika, Bahasa Indonesia"
                        : "Contoh: IT Support"
                    }
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-outline"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg border border-outline-variant font-title-sm text-title-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={
                  !form.name.trim() ||
                  !form.email.trim() ||
                  submitting ||
                  (editingId === null && (!form.password || form.password.trim().length < 4))
                }
                className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors px-6 py-2.5 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <div className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full"></div>
                ) : (
                  <Icon name="save" size={18} />
                )}
                {editingId !== null ? "Simpan Perubahan" : "Tambah User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
