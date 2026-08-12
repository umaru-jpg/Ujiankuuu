"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import StatCard from "@/components/StatCard";

/** KKM (Kriteria Ketuntasan Minimal) untuk status Lulus/Tidak. */
const KKM = 75;

interface StudentResult {
  nis: string;
  name: string;
  kelas: string;
  score: number;
}

interface ExamResult {
  id: string;
  mapel: string;
  kelas: string;
  date: string;
  students: StudentResult[];
}

/** Data mock hasil ujian (frontend-only). */
const EXAMS: ExamResult[] = [
  {
    id: "mtk-xa",
    mapel: "Matematika Dasar",
    kelas: "X-A",
    date: "15 Okt 2026",
    students: [
      { nis: "2026001", name: "Ahmad Fauzi", kelas: "X-A", score: 92 },
      { nis: "2026002", name: "Bunga Lestari", kelas: "X-A", score: 88 },
      { nis: "2026003", name: "Citra Dewi", kelas: "X-A", score: 76 },
      { nis: "2026004", name: "Dimas Prasetyo", kelas: "X-A", score: 95 },
      { nis: "2026005", name: "Eka Saputri", kelas: "X-A", score: 61 },
      { nis: "2026006", name: "Fajar Ramadhan", kelas: "X-A", score: 80 },
      { nis: "2026007", name: "Gita Permatasari", kelas: "X-A", score: 72 },
      { nis: "2026008", name: "Hendra Wijaya", kelas: "X-A", score: 54 },
      { nis: "2026009", name: "Intan Ayu", kelas: "X-A", score: 89 },
      { nis: "2026010", name: "Joko Susilo", kelas: "X-A", score: 66 },
    ],
  },
  {
    id: "fis-xib",
    mapel: "Fisika Terapan",
    kelas: "XI-B",
    date: "16 Okt 2026",
    students: [
      { nis: "2024001", name: "Kevin Hartono", kelas: "XI-B", score: 84 },
      { nis: "2024002", name: "Laras Melati", kelas: "XI-B", score: 91 },
      { nis: "2024003", name: "Maya Anggraini", kelas: "XI-B", score: 58 },
      { nis: "2024004", name: "Naufal Hakim", kelas: "XI-B", score: 77 },
      { nis: "2024005", name: "Olivia Chandra", kelas: "XI-B", score: 95 },
      { nis: "2024006", name: "Putra Wijaya", kelas: "XI-B", score: 69 },
      { nis: "2024007", name: "Ratna Sari", kelas: "XI-B", score: 82 },
      { nis: "2024008", name: "Surya Pratama", kelas: "XI-B", score: 47 },
    ],
  },
];

export default function GuruHasil() {
  const [selectedId, setSelectedId] = useState(EXAMS[0].id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "lulus" | "tidak">("all");
  const [sortDesc, setSortDesc] = useState(true);

  const exam = EXAMS.find((e) => e.id === selectedId) ?? EXAMS[0];

  // Reset pencarian saat berpindah ujian agar tidak menampilkan hasil kosong secara membingungkan.
  useEffect(() => {
    setQuery("");
  }, [selectedId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = exam.students.filter((s) => {
      const matchQuery = !q || s.name.toLowerCase().includes(q) || s.nis.includes(q);
      const lulus = s.score >= KKM;
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "lulus" && lulus) ||
        (statusFilter === "tidak" && !lulus);
      return matchQuery && matchStatus;
    });
    list = [...list].sort((a, b) => (sortDesc ? b.score - a.score : a.score - b.score));
    return list;
  }, [exam, query, statusFilter, sortDesc]);

  const stats = useMemo(() => {
    const scores = exam.students.map((s) => s.score);
    const count = scores.length;
    const rata = count ? (scores.reduce((a, b) => a + b, 0) / count).toFixed(1) : "0.0";
    const lulus = exam.students.filter((s) => s.score >= KKM).length;
    return {
      peserta: count,
      rata,
      tertinggi: count ? Math.max(...scores) : 0,
      terendah: count ? Math.min(...scores) : 0,
      lulus,
      pct: count ? Math.round((lulus / count) * 100) : 0,
    };
  }, [exam]);

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* ===== Header ===== */}
      <div className="mb-stack-lg">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
          Daftar Nilai Siswa
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Pantau dan evaluasi capaian setiap siswa dari ujian yang telah selesai.
        </p>
      </div>

      {/* ===== Filter / Pilih Ujian ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md mb-stack-lg">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          <div className="flex-1">
            <label
              htmlFor="exam-select"
              className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5"
            >
              Pilih Ujian
            </label>
            <div className="relative">
              <select
                id="exam-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                {EXAMS.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.mapel} - {e.kelas} ({e.date})
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label
              htmlFor="status-select"
              className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5"
            >
              Status
            </label>
            <div className="relative">
              <select
                id="status-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="lulus">Lulus</option>
                <option value="tidak">Tidak Lulus</option>
              </select>
              <Icon
                name="expand_more"
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
          </div>
          <div className="flex-1">
            <label
              htmlFor="search-input"
              className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5"
            >
              Cari Siswa
            </label>
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                id="search-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nama atau NIS..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Statistik ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        <StatCard
          label="Peserta"
          value={String(stats.peserta)}
          icon="group"
          iconClass="bg-primary-container text-on-primary-container"
          sub={`${stats.lulus} lulus dari ${stats.peserta} siswa`}
        />
        <StatCard
          label="Rata-rata"
          value={stats.rata}
          icon="insights"
          iconClass="bg-secondary-container text-on-secondary-container"
          sub="dari 100"
        />
        <StatCard
          label="Tertinggi"
          value={String(stats.tertinggi)}
          icon="trending_up"
          iconClass="bg-tertiary-container text-on-tertiary-container"
          sub="nilai maksimum"
        />
        <StatCard
          label="Tingkat Kelulusan"
          value={`${stats.pct}%`}
          icon="task_alt"
          iconClass="bg-surface-tint text-on-primary"
          sub={`KKM ${KKM}`}
        />
      </div>

      {/* ===== Tabel Nilai Per Siswa ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-stack-md">
          <div>
            <h3 className="font-title-sm text-title-sm text-on-surface">
              Nilai {exam.mapel} - Kelas {exam.kelas}
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {filtered.length} siswa ditampilkan
            </p>
          </div>
          <button
            onClick={() => setSortDesc((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-label-caps text-label-caps cursor-pointer"
          >
            <Icon name={sortDesc ? "arrow_downward" : "arrow_upward"} size={16} />
            Urutkan Nilai
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="py-3 px-4 font-label-caps text-label-caps w-14">No</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Nama Siswa</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">NIS</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Kelas</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Nilai</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const lulus = s.score >= KKM;
                return (
                  <tr
                    key={s.nis}
                    className="border-b border-surface-variant hover:bg-surface-container-lowest transition-colors"
                  >
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {i + 1}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-body-md text-body-md text-on-surface font-medium">
                        {s.name}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {s.nis}
                    </td>
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {s.kelas}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-title-sm text-title-sm font-bold ${
                            lulus ? "text-primary" : "text-error"
                          }`}
                        >
                          {s.score}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${
                              lulus ? "bg-primary" : "bg-error"
                            }`}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-caps text-label-caps ${
                          lulus
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-error-container text-on-error-container"
                        }`}
                      >
                        <Icon name={lulus ? "check" : "close"} size={14} filled />
                        {lulus ? "Lulus" : "Tidak Lulus"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Icon name="search_off" size={32} className="text-outline mx-auto mb-2" />
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Tidak ada siswa yang cocok dengan filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
