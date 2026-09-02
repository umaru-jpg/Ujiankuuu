"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icon";
import StatCard from "@/components/StatCard";

const AdminHasilCharts = dynamic(() => import("@/components/hasil/AdminHasilCharts"), {
  ssr: false,
  loading: () => (
    <div className="lg:col-span-12 h-[240px] bg-surface rounded-xl shadow-sm border border-outline-variant animate-pulse" />
  ),
});

interface ClassSummary {
  kelas: string;
  peserta: number;
  rata: number;
  tertinggi: number;
  terendah: number;
  lulus: number;
}

interface DistributionItem {
  range_label: string;
  count: number;
}

const KKM = 75;
const PASS_RATE_OK = 75;
const DISTRIBUTION_RANGES = ["≤50", "51-60", "61-70", "71-80", "81-90", "91-100"];

export default function AdminHasil() {
  const [mapel, setMapel] = useState("Semua Mapel");
  const [kelasFilter, setKelasFilter] = useState("Semua Kelas");
  const [periode, setPeriode] = useState("Semester Ganjil 2026/2027");

  const [summaries, setSummaries] = useState<ClassSummary[]>([]);
  const [distribution, setDistribution] = useState<DistributionItem[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [totalExams, setTotalExams] = useState(0);
  const [loading, setLoading] = useState(true);

  const MAPEL_OPTIONS = useMemo(
    () => ["Semua Mapel", ...subjects],
    [subjects]
  );

  // Fetch data from API
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (mapel !== "Semua Mapel") {
          params.set("subject", mapel);
        }

        const res = await fetch(`/api/hasil?${params.toString()}`);
        if (!res.ok) throw new Error("Gagal mengambil data");

        const data = await res.json();
        if (!cancelled) {
          setSummaries(data.summaries ?? []);
          setDistribution(data.distribution ?? []);
          setSubjects(data.subjects ?? []);
          setTotalExams(data.totalExams ?? 0);
        }
      } catch (err) {
        console.error("Fetch admin hasil error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [mapel]);

  const kelasOptions = useMemo(() => {
    return ["Semua Kelas", ...summaries.map((c) => c.kelas)];
  }, [summaries]);

  const filtered = useMemo(
    () =>
      kelasFilter === "Semua Kelas"
        ? summaries
        : summaries.filter((c) => c.kelas === kelasFilter),
    [summaries, kelasFilter]
  );

  const stats = useMemo(() => {
    const peserta = filtered.reduce((a, c) => a + c.peserta, 0);
    const lulus = filtered.reduce((a, c) => a + c.lulus, 0);
    const rata =
      filtered.length > 0
        ? (filtered.reduce((a, c) => a + c.rata, 0) / filtered.length).toFixed(1)
        : "0.0";
    const tertinggi = filtered.length > 0 ? Math.max(...filtered.map((c) => c.tertinggi)) : 0;
    return {
      peserta,
      lulus,
      rata,
      tertinggi,
      pct: peserta > 0 ? Math.round((lulus / peserta) * 100) : 0,
      ujian: totalExams,
    };
  }, [filtered, totalExams]);

  const bestKelas = useMemo(() => {
    if (filtered.length === 0) return null;
    return filtered.reduce((a, c) => (c.rata > a.rata ? c : a));
  }, [filtered]);

  const chartData = useMemo(() => {
    const sorted = [...summaries].sort((a, b) => a.kelas.localeCompare(b.kelas));
    return {
      classLabels: sorted.map((c) => c.kelas),
      classValues: sorted.map((c) => c.rata),
      distributionLabels: DISTRIBUTION_RANGES,
      distributionValues: distribution.map((d) => d.count),
    };
  }, [summaries, distribution]);

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* ===== Header ===== */}
      <div className="mb-4 md:mb-stack-lg">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
          Rekap Hasil Sekolah
        </h1>
        <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
          Pantau capaian ujian seluruh kelas dan jurusan secara menyeluruh.
        </p>
      </div>

      {/* ===== Filter ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-3 md:p-stack-md mb-4 md:mb-stack-lg">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1">
            <label
              htmlFor="admin-mapel"
              className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5"
            >
              Mata Pelajaran
            </label>
            <div className="relative">
              <select
                id="admin-mapel"
                value={mapel}
                onChange={(e) => {
                  setMapel(e.target.value);
                  setKelasFilter("Semua Kelas");
                }}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 pr-10 font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                {MAPEL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
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
              htmlFor="admin-kelas"
              className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5"
            >
              Kelas
            </label>
            <div className="relative">
              <select
                id="admin-kelas"
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 pr-10 font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                {kelasOptions.map((k) => (
                  <option key={k} value={k}>
                    {k}
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
              htmlFor="admin-periode"
              className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5"
            >
              Periode
            </label>
            <div className="relative">
              <select
                id="admin-periode"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 pr-10 font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                <option>Semester Ganjil 2026/2027</option>
                <option>Semester Genap 2025/2026</option>
                <option>Semester Ganjil 2025/2026</option>
              </select>
              <Icon
                name="expand_more"
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== Loading State ===== */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-gutter mb-4 md:mb-stack-lg">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse border border-outline-variant" />
          ))}
        </div>
      )}

      {/* ===== Statistik ===== */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-gutter mb-4 md:mb-stack-lg">
          <StatCard
            label="Total Ujian"
            value={String(stats.ujian)}
            icon="assignment"
            iconClass="bg-primary-container text-on-primary-container"
            sub="ujian telah selesai"
          />
          <StatCard
            label="Total Peserta"
            value={String(stats.peserta)}
            icon="group"
            iconClass="bg-secondary-container text-on-secondary-container"
            sub="seluruh siswa peserta"
          />
          <StatCard
            label="Rata-rata"
            value={stats.rata}
            icon="insights"
            iconClass="bg-tertiary-container text-on-tertiary-container"
            sub="nilai keseluruhan"
          />
          <StatCard
            label="Tingkat Kelulusan"
            value={`${stats.pct}%`}
            icon="task_alt"
            iconClass="bg-surface-tint text-on-primary"
            sub={`${stats.lulus} siswa lulus (KKM ${KKM})`}
          />
        </div>
      )}

      {/* ===== Grafik ===== */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-gutter mb-4 md:mb-stack-lg">
          <AdminHasilCharts
            classLabels={chartData.classLabels}
            classValues={chartData.classValues}
            distributionLabels={chartData.distributionLabels}
            distributionValues={chartData.distributionValues}
          />
        </div>
      )}

      {/* ===== Tabel Rekap per Kelas ===== */}
      {!loading && (
        <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-3 md:p-stack-md">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-3 md:mb-stack-md">
            <div>
              <h3 className="font-title-sm text-title-sm text-on-surface">Rekap per Kelas</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {filtered.length} kelas ditampilkan
              </p>
            </div>
            {bestKelas && (
              <span className="inline-flex items-center gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps text-xs">
                <Icon name="emoji_events" filled size={14} />
                Terbaik: {bestKelas.kelas} (rata-rata {bestKelas.rata})
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Kelas</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps hidden sm:table-cell">Peserta</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Rata-rata</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps hidden md:table-cell">Tertinggi</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps hidden md:table-cell">Terendah</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Kelulusan</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 md:py-12 text-center">
                      <Icon name="inbox" size={28} className="text-outline mx-auto mb-2" />
                      <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
                        Belum ada data hasil ujian untuk filter ini.
                      </p>
                    </td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const pct = c.peserta > 0 ? Math.round((c.lulus / c.peserta) * 100) : 0;
                  const isBest = bestKelas?.kelas === c.kelas;
                  return (
                    <tr
                      key={c.kelas}
                      className="border-b border-surface-variant hover:bg-surface-container-lowest transition-colors"
                    >
                      <td className="py-3 px-3 md:px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface font-medium">
                            {c.kelas}
                          </span>
                          {isBest && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 md:px-2 py-0.5 rounded-full bg-primary-fixed-dim text-on-primary-fixed text-[9px] md:text-[11px] font-bold uppercase tracking-wider">
                              <Icon name="star" filled size={10} />
                              Terbaik
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 md:px-4 font-body-sm text-body-sm text-on-surface-variant hidden sm:table-cell">
                        {c.peserta}
                      </td>
                      <td className="py-3 px-3 md:px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-title-sm text-title-sm font-bold text-primary">
                            {c.rata}
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden hidden sm:block">
                            <div
                              className="h-full rounded-full bg-primary transition-[width] duration-500"
                              style={{ width: `${Math.min(c.rata, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 md:px-4 font-body-sm text-body-sm text-on-surface-variant hidden md:table-cell">
                        {c.tertinggi}
                      </td>
                      <td className="py-3 px-3 md:px-4 font-body-sm text-body-sm text-on-surface-variant hidden md:table-cell">
                        {c.terendah}
                      </td>
                      <td className="py-3 px-3 md:px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-full font-label-caps text-label-caps text-xs ${
                            pct >= PASS_RATE_OK
                              ? "bg-secondary-container text-on-secondary-container"
                              : "bg-surface-container-high text-on-surface"
                          }`}
                        >
                          {pct}%
                        </span>
                      </td>
                      <td className="py-3 px-3 md:px-4 text-right whitespace-nowrap">
                        <button
                          aria-label={`Detail ${c.kelas}`}
                          className="text-primary p-1.5 md:p-2 hover:bg-primary-fixed-dim rounded-full transition-colors"
                        >
                          <Icon name="visibility" size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
