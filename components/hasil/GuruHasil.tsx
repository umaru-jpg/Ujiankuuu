"use client";

import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import StatCard from "@/components/StatCard";
import { getSession } from "@/lib/auth";

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

export default function GuruHasil() {
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "lulus" | "tidak">("all");
  const [sortDesc, setSortDesc] = useState(true);

  // Fetch data from API
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const user = getSession();
        const params = new URLSearchParams();
        if (user?.id) {
          params.set("userId", String(user.id));
        }

        const res = await fetch(`/api/hasil/guru?${params.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil data");

        const data = await res.json();
        if (!cancelled) {
          const examList = data.exams ?? [];
          setExams(examList);
          if (examList.length > 0 && !selectedId) {
            setSelectedId(examList[0].id);
          }
        }
      } catch (err) {
        console.error("Fetch guru hasil error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exam = exams.find((e) => e.id === selectedId) ?? exams[0];

  useEffect(() => {
    setQuery("");
  }, [selectedId]);

  const filtered = useMemo(() => {
    if (!exam) return [];
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
    if (!exam) return { peserta: 0, rata: "0.0", tertinggi: 0, terendah: 0, lulus: 0, pct: 0 };
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

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-4 md:mb-stack-lg">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
            Daftar Nilai Siswa
          </h1>
          <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
            Memuat data...
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-gutter mb-4 md:mb-stack-lg">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse border border-outline-variant" />
          ))}
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-4 md:mb-stack-lg">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
            Daftar Nilai Siswa
          </h1>
          <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
            Pantau dan evaluasi capaian setiap siswa dari ujian yang telah selesai.
          </p>
        </div>
        <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-lg text-center">
          <Icon name="inbox" size={40} className="text-outline mx-auto mb-3" />
          <p className="font-body-md text-body-md text-on-surface-variant">
            Belum ada data hasil ujian yang tersedia.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* ===== Header ===== */}
      <div className="mb-4 md:mb-stack-lg">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
          Daftar Nilai Siswa
        </h1>
        <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
          Pantau dan evaluasi capaian setiap siswa dari ujian yang telah selesai.
        </p>
      </div>

      {/* ===== Filter / Pilih Ujian ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-3 md:p-stack-md mb-4 md:mb-stack-lg">
        <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
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
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 pr-10 font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                {exams.map((e) => (
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
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 pr-10 font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
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
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 bg-surface-container-high rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Statistik ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-gutter mb-4 md:mb-stack-lg">
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
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-3 md:p-stack-md">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-3 md:mb-stack-md">
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
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors font-label-caps text-label-caps text-xs cursor-pointer"
          >
            <Icon name={sortDesc ? "arrow_downward" : "arrow_upward"} size={14} />
            <span className="hidden sm:inline">Urutkan Nilai</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps w-10 md:w-14">No</th>
                <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Nama Siswa</th>
                <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps hidden md:table-cell">NIS</th>
                <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps hidden sm:table-cell">Kelas</th>
                <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Nilai</th>
                <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Status</th>
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
                    <td className="py-3 px-3 md:px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {i + 1}
                    </td>
                    <td className="py-3 px-3 md:px-4">
                      <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface font-medium">
                        {s.name}
                      </p>
                      <p className="md:hidden font-body-sm text-body-sm text-on-surface-variant text-xs">
                        {s.nis} - {s.kelas}
                      </p>
                    </td>
                    <td className="py-3 px-3 md:px-4 font-body-sm text-body-sm text-on-surface-variant hidden md:table-cell">
                      {s.nis}
                    </td>
                    <td className="py-3 px-3 md:px-4 font-body-sm text-body-sm text-on-surface-variant hidden sm:table-cell">
                      {s.kelas}
                    </td>
                    <td className="py-3 px-3 md:px-4">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <span
                          className={`font-title-sm text-title-sm font-bold ${
                            lulus ? "text-primary" : "text-error"
                          }`}
                        >
                          {s.score}
                        </span>
                        <div className="w-12 md:w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden hidden sm:block">
                          <div
                            className={`h-full rounded-full transition-[width] duration-500 ${
                              lulus ? "bg-primary" : "bg-error"
                            }`}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 md:px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-full font-label-caps text-label-caps text-xs ${
                          lulus
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-error-container text-on-error-container"
                        }`}
                      >
                        <Icon name={lulus ? "check" : "close"} size={12} filled />
                        <span className="hidden sm:inline">{lulus ? "Lulus" : "Tidak Lulus"}</span>
                        <span className="sm:hidden">{lulus ? "L" : "TL"}</span>
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 md:py-12 text-center">
                    <Icon name="search_off" size={28} className="text-outline mx-auto mb-2" />
                    <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
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
