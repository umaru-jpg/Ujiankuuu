"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import Icon from "@/components/Icon";

type Status = "Published" | "Draft";
type Tipe = "Pilihan Ganda" | "Essay";

interface Soal {
  id: number;
  mapel: string;
  kelas: string;
  status: Status;
  pertanyaan: string;
  tipe: Tipe;
  penulis: string;
  color: string;
  /** Id user guru yang membuat soal; admin bisa melihat semua. */
  authorId: number;
}

const INITIAL_SOALS: Soal[] = [
  {
    id: 1,
    mapel: "Matematika",
    kelas: "Kelas 12",
    status: "Published",
    pertanyaan: "Berapa hasil turunan pertama dari fungsi f(x) = 3x^3 - 2x^2 + 5x - 1?",
    tipe: "Pilihan Ganda",
    penulis: "Bu Rina S.",
    color: "from-blue-500 to-indigo-500",
    authorId: 5,
  },
  {
    id: 2,
    mapel: "Bahasa Indonesia",
    kelas: "Kelas 11",
    status: "Draft",
    pertanyaan:
      "Jelaskan perbedaan mendasar antara teks prosedur kompleks dan teks eksplanasi beserta contohnya!",
    tipe: "Essay",
    penulis: "Bpk. Budi Santoso",
    color: "from-emerald-500 to-teal-500",
    authorId: 2,
  },
  {
    id: 3,
    mapel: "Fisika",
    kelas: "Kelas 10",
    status: "Published",
    pertanyaan:
      "Sebuah benda jatuh bebas dari ketinggian 20 m. Jika g = 10 m/s², kecepatan benda saat mencapai tanah adalah...",
    tipe: "Pilihan Ganda",
    penulis: "Bu Rina S.",
    color: "from-violet-500 to-purple-500",
    authorId: 5,
  },
  {
    id: 4,
    mapel: "Bahasa Inggris",
    kelas: "Kelas 12",
    status: "Draft",
    pertanyaan: "Read the passage carefully and identify the main idea of the second paragraph.",
    tipe: "Essay",
    penulis: "Mrs. Anita W.",
    color: "from-rose-500 to-pink-500",
    authorId: 6,
  },
  {
    id: 5,
    mapel: "Bahasa Indonesia",
    kelas: "Kelas 10",
    status: "Published",
    pertanyaan:
      "Analisislah struktur teks laporan hasil observasi tentang sampah plastik yang Anda baca!",
    tipe: "Essay",
    penulis: "Bpk. Budi Santoso",
    color: "from-teal-500 to-cyan-500",
    authorId: 2,
  },
  {
    id: 6,
    mapel: "Bahasa Indonesia",
    kelas: "Kelas 12",
    status: "Draft",
    pertanyaan:
      "Sebutkan tiga kaidah kebahasaan teks editorial dan berikan contoh kalimatnya masing-masing!",
    tipe: "Essay",
    penulis: "Bpk. Budi Santoso",
    color: "from-amber-500 to-orange-500",
    authorId: 2,
  },
];

const MAPEL_FILTERS = [
  "Semua Mata Pelajaran",
  "Matematika",
  "Bahasa Indonesia",
  "Bahasa Inggris",
  "Fisika",
];
const KELAS_FILTERS = ["Semua Kelas", "Kelas 10", "Kelas 11", "Kelas 12"];
const STATUS_FILTERS = ["Semua Status", "Published", "Draft"];

const PAGE_SIZE = 4;

const STORAGE_KEY = "ujiankuuu_bank_soal";

const GURU_COLORS = [
  "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-orange-500",
];

const DEFAULT_MAPELS = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Fisika"];

function loadSoals(): Soal[] {
  if (typeof window === "undefined") return INITIAL_SOALS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_SOALS;
    const parsed = JSON.parse(raw) as Soal[];
    return Array.isArray(parsed) ? parsed : INITIAL_SOALS;
  } catch {
    return INITIAL_SOALS;
  }
}

interface FormState {
  mapel: string;
  kelas: string;
  status: Status;
  tipe: Tipe;
  pertanyaan: string;
}

const EMPTY_FORM: FormState = {
  mapel: "Matematika",
  kelas: "Kelas 10",
  status: "Draft",
  tipe: "Pilihan Ganda",
  pertanyaan: "",
};

export default function BankSoalPage() {
  const user = useDashboardUser();
  const [soals, setSoals] = useState<Soal[]>(INITIAL_SOALS);
  const [mapelFilter, setMapelFilter] = useState(MAPEL_FILTERS[0]);
  const [kelasFilter, setKelasFilter] = useState(KELAS_FILTERS[0]);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS[0]);
  const [page, setPage] = useState(1);

  // Modal buat soal
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    setSoals(loadSoals());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(soals));
    }
  }, [soals]);

  /** Guru hanya melihat soal miliknya; admin melihat semua soal. */
  const isAdmin = user?.role === "admin";

  const filtered = useMemo(() => {
    return soals.filter((s) => {
      if (!isAdmin && s.authorId !== user?.id) return false;
      const matchMapel = mapelFilter === "Semua Mata Pelajaran" || s.mapel === mapelFilter;
      const matchKelas = kelasFilter === "Semua Kelas" || s.kelas === kelasFilter;
      const matchStatus = statusFilter === "Semua Status" || s.status === statusFilter;
      return matchMapel && matchKelas && matchStatus;
    });
  }, [soals, mapelFilter, kelasFilter, statusFilter, isAdmin, user?.id]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changePage(next: number) {
    setPage(Math.min(Math.max(1, next), totalPages));
  }

  function resetPage(fn: (v: string) => void) {
    return (v: string) => {
      fn(v);
      setPage(1);
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pertanyaan.trim()) return;
    const nextId = soals.length ? Math.max(...soals.map((s) => s.id)) + 1 : 1;
    const newSoal: Soal = {
      id: nextId,
      mapel: form.mapel,
      kelas: form.kelas,
      status: form.status,
      tipe: form.tipe,
      pertanyaan: form.pertanyaan.trim(),
      penulis: user?.name ?? "Guru",
      color: GURU_COLORS[(user?.id ?? 1) % GURU_COLORS.length],
      authorId: user?.id ?? 0,
    };
    setSoals((prev) => [newSoal, ...prev]);
    setForm(EMPTY_FORM);
    setOpen(false);
    setPage(1);
  }

  return (
    <DashboardLayout active="bank" allowedRoles={["admin", "guru"]}>
      <div className="max-w-[1280px] mx-auto">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-stack-lg">
          <div>
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
              Manajemen Bank Soal
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              {isAdmin
                ? "Kelola, filter, dan buat soal ujian baru untuk berbagai mata pelajaran."
                : "Kelola dan buat soal ujian dari soal yang Anda buat sendiri."}
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors px-6 py-3 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm whitespace-nowrap min-h-[44px] cursor-pointer active:scale-95 duration-200"
          >
            <Icon name="add" />
            Buat Soal Baru
          </button>
        </div>

        {/* Filters */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant shadow-sm mb-stack-lg flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              MATA PELAJARAN
            </label>
            <div className="relative">
              <select
                value={mapelFilter}
                onChange={(e) => resetPage(setMapelFilter)(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
              >
                {MAPEL_FILTERS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              KELAS
            </label>
            <div className="relative">
              <select
                value={kelasFilter}
                onChange={(e) => resetPage(setKelasFilter)(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
              >
                {KELAS_FILTERS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
              STATUS
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => resetPage(setStatusFilter)(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Bento Grid List of Questions */}
        {paged.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-12 text-center">
            <Icon name="quiz" size={40} className="text-outline mx-auto mb-3" />
            <p className="font-title-sm text-title-sm text-on-surface">Tidak ada soal yang cocok</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {isAdmin
                ? "Coba ubah filter atau buat soal baru."
                : "Belum ada soal yang Anda buat. Klik \"Buat Soal Baru\" untuk mulai."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
            {paged.map((soal) => (
              <div
                key={soal.id}
                className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-secondary-container text-on-secondary-fixed font-label-caps text-label-caps">
                      {soal.mapel.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-label-caps text-label-caps">
                      {soal.kelas.toUpperCase()}
                    </span>
                  </div>
                  {soal.status === "Published" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-100 text-green-800 font-label-caps text-label-caps border border-green-200">
                      {soal.status.toUpperCase()}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-highest text-on-surface-variant font-label-caps text-label-caps border border-outline-variant">
                      {soal.status.toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="font-title-sm text-title-sm text-on-surface mb-2 line-clamp-2">
                  {soal.pertanyaan}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 flex items-center gap-1">
                  <Icon
                    name={soal.tipe === "Pilihan Ganda" ? "radio_button_checked" : "subject"}
                    size={16}
                  />
                  {soal.tipe}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-outline-variant/50 mt-auto">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-full border-2 border-surface object-cover bg-gradient-to-br ${soal.color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                    >
                      {soal.penulis
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .replace(/\./g, "")
                        .slice(0, 2)}
                    </div>
                    <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                      {soal.penulis}
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      aria-label={`Edit soal ${soal.pertanyaan}`}
                      className="p-1.5 text-secondary hover:text-primary hover:bg-surface-container rounded-md transition-colors cursor-pointer"
                    >
                      <Icon name="edit" size={20} />
                    </button>
                    <button
                      aria-label={`Hapus soal ${soal.pertanyaan}`}
                      onClick={() =>
                        setSoals((prev) => prev.filter((x) => x.id !== soal.id))
                      }
                      className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-md transition-colors cursor-pointer"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination (Simple) */}
        <div className="flex items-center justify-center gap-2 mt-stack-lg">
          <button
            onClick={() => changePage(safePage - 1)}
            disabled={safePage <= 1}
            className="p-2 border border-outline-variant rounded-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Icon name="chevron_left" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => changePage(p)}
              className={`w-10 h-10 rounded-md font-title-sm text-title-sm cursor-pointer transition-colors ${
                p === safePage
                  ? "bg-primary text-on-primary"
                  : "border border-outline-variant text-on-surface hover:bg-surface-container"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => changePage(safePage + 1)}
            disabled={safePage >= totalPages}
            className="p-2 border border-outline-variant rounded-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Icon name="chevron_right" />
          </button>
        </div>
      </div>

      {/* Modal Buat Soal Baru */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Buat soal baru"
        >
          <div
            className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant">
              <div>
                <h3 className="font-title-sm text-title-sm text-on-surface">Buat Soal Baru</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Soal akan disimpan di bank soal Anda.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Tutup"
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="soal-mapel"
                    className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                  >
                    MATA PELAJARAN
                  </label>
                  <div className="relative">
                    <select
                      id="soal-mapel"
                      value={form.mapel}
                      onChange={(e) => setForm((f) => ({ ...f, mapel: e.target.value }))}
                      className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                    >
                      {DEFAULT_MAPELS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="soal-kelas"
                    className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                  >
                    KELAS
                  </label>
                  <div className="relative">
                    <select
                      id="soal-kelas"
                      value={form.kelas}
                      onChange={(e) => setForm((f) => ({ ...f, kelas: e.target.value }))}
                      className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                    >
                      {KELAS_FILTERS.slice(1).map((k) => (
                        <option key={k}>{k}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    JENIS SOAL
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {(["Pilihan Ganda", "Essay"] as Tipe[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, tipe: t }))}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-body-sm text-body-sm transition-colors cursor-pointer ${
                          form.tipe === t
                            ? "border-primary bg-primary-container text-on-primary-container"
                            : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        <Icon
                          name={t === "Pilihan Ganda" ? "radio_button_checked" : "subject"}
                          size={16}
                        />
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    STATUS
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {(["Published", "Draft"] as Status[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, status: s }))}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border font-body-sm text-body-sm transition-colors cursor-pointer ${
                          form.status === s
                            ? "border-primary bg-primary-container text-on-primary-container"
                            : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        <Icon name={s === "Published" ? "publish" : "drafts"} size={16} />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="soal-pertanyaan"
                  className="block font-label-caps text-label-caps text-on-surface-variant mb-2"
                >
                  PERTANYAAN
                </label>
                <textarea
                  id="soal-pertanyaan"
                  rows={4}
                  value={form.pertanyaan}
                  onChange={(e) => setForm((f) => ({ ...f, pertanyaan: e.target.value }))}
                  placeholder="Tulis pertanyaan soal di sini..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none text-on-surface placeholder:text-outline"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 pt-4 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-outline-variant font-title-sm text-title-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!form.pertanyaan.trim()}
                className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors px-6 py-2.5 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Icon name="save" size={18} />
                Simpan Soal
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
}
