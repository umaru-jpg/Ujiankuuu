"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
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

/** Data mock per mata pelajaran (frontend-only). */
const DATA_BY_MAPEL: Record<string, ClassSummary[]> = {
  Matematika: [
    { kelas: "X-A", peserta: 32, rata: 78.5, tertinggi: 98, terendah: 45, lulus: 25 },
    { kelas: "X-B", peserta: 30, rata: 82.0, tertinggi: 100, terendah: 55, lulus: 26 },
    { kelas: "XI-A", peserta: 28, rata: 75.3, tertinggi: 92, terendah: 40, lulus: 19 },
    { kelas: "XI-B", peserta: 31, rata: 81.4, tertinggi: 99, terendah: 52, lulus: 26 },
    { kelas: "XII-A", peserta: 29, rata: 86.2, tertinggi: 100, terendah: 60, lulus: 27 },
    { kelas: "XII-B", peserta: 27, rata: 79.8, tertinggi: 95, terendah: 48, lulus: 22 },
  ],
  Fisika: [
    { kelas: "X-A", peserta: 31, rata: 74.1, tertinggi: 94, terendah: 38, lulus: 20 },
    { kelas: "X-B", peserta: 29, rata: 79.6, tertinggi: 97, terendah: 50, lulus: 23 },
    { kelas: "XI-A", peserta: 28, rata: 71.8, tertinggi: 90, terendah: 35, lulus: 17 },
    { kelas: "XI-B", peserta: 30, rata: 80.2, tertinggi: 98, terendah: 51, lulus: 25 },
    { kelas: "XII-A", peserta: 28, rata: 84.5, tertinggi: 100, terendah: 58, lulus: 26 },
    { kelas: "XII-B", peserta: 26, rata: 76.9, tertinggi: 93, terendah: 42, lulus: 19 },
  ],
  "Bahasa Indonesia": [
    { kelas: "X-A", peserta: 32, rata: 81.3, tertinggi: 99, terendah: 52, lulus: 27 },
    { kelas: "X-B", peserta: 30, rata: 83.7, tertinggi: 100, terendah: 60, lulus: 27 },
    { kelas: "XI-A", peserta: 28, rata: 78.9, tertinggi: 96, terendah: 48, lulus: 22 },
    { kelas: "XI-B", peserta: 31, rata: 82.6, tertinggi: 100, terendah: 55, lulus: 26 },
    { kelas: "XII-A", peserta: 29, rata: 87.1, tertinggi: 100, terendah: 65, lulus: 28 },
    { kelas: "XII-B", peserta: 27, rata: 80.4, tertinggi: 97, terendah: 50, lulus: 23 },
  ],
  "Basis Data": [
    { kelas: "X-A", peserta: 32, rata: 76.2, terendah: 41, tertinggi: 95, lulus: 23 },
    { kelas: "X-B", peserta: 30, rata: 80.5, terendah: 53, tertinggi: 98, lulus: 25 },
    { kelas: "XI-A", peserta: 28, rata: 72.9, terendah: 36, tertinggi: 91, lulus: 18 },
    { kelas: "XI-B", peserta: 31, rata: 79.1, terendah: 49, tertinggi: 97, lulus: 24 },
    { kelas: "XII-A", peserta: 29, rata: 85.6, terendah: 61, tertinggi: 100, lulus: 27 },
    { kelas: "XII-B", peserta: 27, rata: 77.3, terendah: 44, tertinggi: 94, lulus: 20 },
  ],
};

const MAPEL_OPTIONS = ["Semua Mapel", ...Object.keys(DATA_BY_MAPEL)];
const KKM = 75;
/** Ambang tingkat kelulusan kelas yang dianggap baik (%). */
const PASS_RATE_OK = 75;

/** Rentang distribusi nilai (label + jumlah siswa per mapel terpilih). */
const DISTRIBUTION_RANGES = ["≤50", "51-60", "61-70", "71-80", "81-90", "91-100"];
const DISTRIBUTION_BY_MAPEL: Record<string, number[]> = {
  Matematika: [12, 28, 45, 78, 92, 64],
  Fisika: [18, 35, 52, 70, 80, 44],
  "Bahasa Indonesia": [8, 20, 38, 82, 105, 76],
  "Basis Data": [15, 30, 48, 74, 88, 54],
};

export default function AdminHasil() {
  const [mapel, setMapel] = useState("Semua Mapel");
  const [kelasFilter, setKelasFilter] = useState("Semua Kelas");
  const [periode, setPeriode] = useState("Semester Ganjil 2026/2027");

  const kelasOptions = useMemo(() => {
    const base = mapel === "Semua Mapel" ? DATA_BY_MAPEL.Matematika : DATA_BY_MAPEL[mapel];
    return ["Semua Kelas", ...base.map((c) => c.kelas)];
  }, [mapel]);

  const summaries = useMemo(() => {
    if (mapel === "Semua Mapel") {
      // Gabungkan semua mapel: rata-rata per kelas = rata-rata dari semua mapel.
      const all = DATA_BY_MAPEL;
      const kelasList = all.Matematika.map((c) => c.kelas);
      const kelasSet = kelasList.filter((k, i) => kelasList.indexOf(k) === i);
      return kelasSet.map((kelas) => {
        const rows = Object.values(all)
          .map((list) => list.find((c) => c.kelas === kelas))
          .filter((c): c is ClassSummary => Boolean(c));
        const rata = rows.reduce((a, c) => a + c.rata, 0) / rows.length;
        const peserta = rows[0]?.peserta ?? 0;
        const lulus = rows.reduce((a, c) => a + c.lulus, 0) / rows.length;
        return {
          kelas,
          peserta,
          rata: Math.round(rata * 10) / 10,
          tertinggi: Math.max(...rows.map((c) => c.tertinggi)),
          terendah: Math.min(...rows.map((c) => c.terendah)),
          lulus: Math.round(lulus),
        } satisfies ClassSummary;
      });
    }
    return DATA_BY_MAPEL[mapel];
  }, [mapel]);

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
      ujian: mapel === "Semua Mapel" ? Object.keys(DATA_BY_MAPEL).length * 6 : summaries.length,
    };
  }, [filtered, mapel, summaries.length]);

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
      distributionValues:
        mapel === "Semua Mapel"
          ? Object.values(DISTRIBUTION_BY_MAPEL).reduce((acc, arr) =>
              acc.map((v, i) => v + arr[i])
            )
          : DISTRIBUTION_BY_MAPEL[mapel],
    };
  }, [mapel, summaries]);

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* ===== Header ===== */}
      <div className="mb-stack-lg">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
          Rekap Hasil Sekolah
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Pantau capaian ujian seluruh kelas dan jurusan secara menyeluruh.
        </p>
      </div>

      {/* ===== Filter ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md mb-stack-lg">
        <div className="flex flex-col md:flex-row gap-4">
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
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
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
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
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
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
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

      {/* ===== Statistik ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
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

      {/* ===== Grafik ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-stack-lg">
        <AdminHasilCharts
          classLabels={chartData.classLabels}
          classValues={chartData.classValues}
          distributionLabels={chartData.distributionLabels}
          distributionValues={chartData.distributionValues}
        />
      </div>

      {/* ===== Tabel Rekap per Kelas ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-stack-md">
          <div>
            <h3 className="font-title-sm text-title-sm text-on-surface">Rekap per Kelas</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {filtered.length} kelas ditampilkan
            </p>
          </div>
          {bestKelas && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container text-on-secondary-container font-label-caps text-label-caps">
              <Icon name="emoji_events" filled size={16} />
              Terbaik: {bestKelas.kelas} (rata-rata {bestKelas.rata})
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="py-3 px-4 font-label-caps text-label-caps">Kelas</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Peserta</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Rata-rata</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Tertinggi</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Terendah</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Kelulusan</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const pct = c.peserta > 0 ? Math.round((c.lulus / c.peserta) * 100) : 0;
                const isBest = bestKelas?.kelas === c.kelas;
                return (
                  <tr
                    key={c.kelas}
                    className="border-b border-surface-variant hover:bg-surface-container-lowest transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-body-md text-body-md text-on-surface font-medium">
                          {c.kelas}
                        </span>
                        {isBest && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary-fixed-dim text-on-primary-fixed text-[11px] font-bold uppercase tracking-wider">
                            <Icon name="star" filled size={12} />
                            Terbaik
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {c.peserta}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-title-sm text-title-sm font-bold text-primary">
                          {c.rata}
                        </span>
                        <div className="w-16 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-500"
                            style={{ width: `${Math.min(c.rata, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {c.tertinggi}
                    </td>
                    <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                      {c.terendah}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-caps text-label-caps ${
                          pct >= PASS_RATE_OK
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        {pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        aria-label={`Detail ${c.kelas}`}
                        className="text-primary p-2 hover:bg-primary-fixed-dim rounded-full transition-colors"
                      >
                        <Icon name="visibility" size={20} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
