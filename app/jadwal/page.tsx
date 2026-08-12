"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import Icon from "@/components/Icon";

type ViewMode = "kalender" | "daftar";

interface Schedule {
  id: number;
  dayName: string;
  day: string;
  month: string;
  time: string;
  type: string;
  title: string;
  mapel: string;
  kelas: string;
  ruang: string;
  pengawas: string[];
}

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: 1,
    dayName: "Senin",
    day: "14",
    month: "Okt",
    time: "08:00 - 10:00",
    type: "PTS Ganjil",
    title: "Matematika Lanjut",
    mapel: "Matematika",
    kelas: "Kelas XII RPL 1, XII RPL 2",
    ruang: "Lab Komputer A & B",
    pengawas: ["Budi Santoso", "Siti Aminah"],
  },
  {
    id: 2,
    dayName: "Selasa",
    day: "15",
    month: "Okt",
    time: "10:30 - 12:30",
    type: "PTS Ganjil",
    title: "Fisika Terapan",
    mapel: "Fisika",
    kelas: "Kelas XI TKJ 1",
    ruang: "Lab Fisika",
    pengawas: ["Andi Wijaya"],
  },
  {
    id: 3,
    dayName: "Rabu",
    day: "16",
    month: "Okt",
    time: "08:00 - 10:00",
    type: "UH Harian",
    title: "Bahasa Indonesia",
    mapel: "Bahasa Indonesia",
    kelas: "Kelas X RPL 1, X RPL 2",
    ruang: "Ruang 201 & 202",
    pengawas: ["Dewi Lestari"],
  },
  {
    id: 4,
    dayName: "Kamis",
    day: "17",
    month: "Okt",
    time: "13:00 - 15:00",
    type: "PTS Ganjil",
    title: "Pemrograman Web",
    mapel: "Kejuruan RPL",
    kelas: "Kelas XII RPL 1",
    ruang: "Lab Komputer C",
    pengawas: ["Hendra Gunawan", "Rina Marlina"],
  },
];

const KELAS_FILTERS = ["Semua Kelas", "Kelas X", "Kelas XI", "Kelas XII"];
const MAPEL_FILTERS = ["Semua Mapel", "Matematika", "Bahasa Indonesia", "Kejuruan RPL"];

// Oktober 2023: tanggal 1 jatuh pada hari Minggu (kolom pertama = Minggu).
const KALENDER_DAYS: (number | null)[] = [
  1, 2, 3, 4, 5, 6, 7,
  8, 9, 10, 11, 12, 13, 14,
  15, 16, 17, 18, 19, 20, 21,
  22, 23, 24, 25, 26, 27, 28,
  29, 30, 31, null, null, null, null,
];

/** Kartu tanggal yang dipakai di tampilan siswa & daftar admin. */
function DateBox({ s, compact = false }: { s: Schedule; compact?: boolean }) {
  return (
    <div
      className={`${
        compact ? "min-w-[120px]" : "min-w-[150px]"
      } flex flex-row md:flex-col gap-2 md:gap-1 items-start md:items-center justify-between md:justify-center p-3 bg-surface-bright border border-outline-variant rounded-lg`}
    >
      <div className="text-center">
        <div className="font-label-caps text-label-caps text-primary uppercase">{s.dayName}</div>
        <div className="font-headline-md text-headline-md text-on-surface">
          {s.day} {s.month}
        </div>
      </div>
      <div className="h-8 w-px bg-outline-variant hidden md:block my-1" />
      <div className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant font-medium">
        <Icon name="schedule" size={16} />
        {s.time}
      </div>
    </div>
  );
}

export default function JadwalPage() {
  const router = useRouter();
  const user = useDashboardUser();
  const isSiswa = user?.role === "siswa";

  const [view, setView] = useState<ViewMode>("daftar");
  const [kelasFilter, setKelasFilter] = useState(KELAS_FILTERS[0]);
  const [mapelFilter, setMapelFilter] = useState(MAPEL_FILTERS[0]);
  const [schedules, setSchedules] = useState<Schedule[]>(INITIAL_SCHEDULES);

  const filtered = useMemo(() => {
    return schedules.filter((s) => {
      // Cocokkan per kelas (X, XI, XII) dengan batas kata agar "X" tidak cocok dengan "XII".
      const matchKelas =
        kelasFilter === "Semua Kelas" ||
        s.kelas
          .split(",")
          .some((k) => k.trim().split(/\s+/).includes(kelasFilter.replace("Kelas ", "")));
      const matchMapel = mapelFilter === "Semua Mapel" || s.mapel === mapelFilter;
      return matchKelas && matchMapel;
    });
  }, [schedules, kelasFilter, mapelFilter]);

  const examDays = new Set(schedules.map((s) => parseInt(s.day, 10)));

  return (
    <DashboardLayout active="jadwal">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-stack-lg">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
              Jadwal Ujian
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {isSiswa
                ? "Berikut jadwal ujian kamu minggu ini."
                : "Kelola jadwal ujian, alokasi waktu, dan pengawas."}
            </p>
          </div>
          {!isSiswa && (
            <div className="flex items-center gap-3">
              <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant">
                <button
                  onClick={() => setView("kalender")}
                  className={`px-4 py-2 rounded-md font-title-sm text-title-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                    view === "kalender"
                      ? "bg-surface shadow-sm text-on-surface"
                      : "text-on-surface-variant hover:bg-surface-variant"
                  }`}
                >
                  <Icon name="calendar_view_month" size={20} />
                  <span className="hidden sm:inline">Kalender</span>
                </button>
                <button
                  onClick={() => setView("daftar")}
                  className={`px-4 py-2 rounded-md font-title-sm text-title-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
                    view === "daftar"
                      ? "bg-surface shadow-sm text-on-surface"
                      : "text-on-surface-variant hover:bg-surface-variant"
                  }`}
                >
                  <Icon name="view_list" size={20} />
                  <span className="hidden sm:inline">Daftar</span>
                </button>
              </div>
              <div className="w-px h-8 bg-outline-variant hidden sm:block" />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {filtered.length} jadwal minggu ini
              </span>
            </div>
          )}
        </div>

        {/* ===== Tampilan Siswa: 1 contoh jadwal + Mulai Ujian ===== */}
        {isSiswa ? (
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex items-center justify-between">
              <span className="font-title-sm text-title-sm text-on-surface">
                Ujian Terdekat Anda
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                1 jadwal aktif minggu ini
              </span>
            </div>
            {schedules.slice(0, 1).map((s) => (
              <div key={s.id} className="p-4 md:p-6 hover:bg-surface-container-low transition-colors">
                <div className="flex flex-col md:flex-row gap-4 md:items-center">
                  <DateBox s={s} compact />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed rounded text-[12px] font-semibold uppercase tracking-wider">
                        {s.type}
                      </span>
                      <h3 className="font-title-sm text-title-sm text-on-surface font-bold text-lg">
                        {s.title}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-4 mt-1">
                      <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                        <Icon name="school" size={18} />
                        <span>{s.kelas}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                        <Icon name="meeting_room" size={18} />
                        <span>{s.ruang}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-label-caps text-label-caps text-on-surface-variant">
                        PENGAWAS:
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface">
                        {s.pengawas.join(", ")}
                      </span>
                    </div>
                  </div>
                  <div className="flex md:flex-col items-center justify-end">
                    <button
                      onClick={() => router.push("/ujian")}
                      className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-title-sm text-title-sm font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-200 shadow-sm min-h-[44px] cursor-pointer w-full"
                    >
                      Mulai Ujian
                      <Icon name="arrow_forward" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ===== Tampilan Admin/Guru: kelola penuh ===== */
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Icon name="filter_list" className="text-on-surface-variant" size={20} />
                <span className="font-title-sm text-title-sm text-on-surface">Filter:</span>
              </div>
              <select
                name="kelasFilter"
                value={kelasFilter}
                onChange={(e) => setKelasFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {KELAS_FILTERS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <select
                name="mapelFilter"
                value={mapelFilter}
                onChange={(e) => setMapelFilter(e.target.value)}
                className="bg-surface-container-low border border-outline-variant rounded-lg px-3 py-2 font-body-sm text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
              >
                {MAPEL_FILTERS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <div className="flex-1" />
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Menampilkan {filtered.length} jadwal aktif minggu ini
              </span>
            </div>

            {view === "daftar" ? (
              /* ==== List view ==== */
              <div className="divide-y divide-outline-variant">
                {filtered.length === 0 && (
                  <p className="p-8 text-center font-body-md text-body-md text-on-surface-variant">
                    Tidak ada jadwal yang cocok dengan filter.
                  </p>
                )}
                {filtered.map((s) => (
                  <div key={s.id} className="p-4 hover:bg-surface-container-low transition-colors group">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                      <DateBox s={s} />
                      {/* Details */}
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed rounded text-[12px] font-semibold uppercase tracking-wider">
                            {s.type}
                          </span>
                          <h3 className="font-title-sm text-title-sm text-on-surface font-bold text-lg">
                            {s.title}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-1">
                          <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                            <Icon name="school" size={18} />
                            <span>{s.kelas}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
                            <Icon name="meeting_room" size={18} />
                            <span>{s.ruang}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="font-label-caps text-label-caps text-on-surface-variant">
                            PENGAWAS:
                          </span>
                          <div className="flex -space-x-2">
                            {s.pengawas.map((p, i) => (
                              <div
                                key={p}
                                title={p}
                                className={`w-7 h-7 rounded-full border-2 border-surface flex items-center justify-center text-[10px] font-bold text-white ${
                                  i % 2 === 0 ? "bg-primary" : "bg-tertiary"
                                }`}
                              >
                                {p.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                              </div>
                            ))}
                          </div>
                          <span className="font-body-sm text-body-sm text-on-surface ml-1">
                            {s.pengawas.join(", ")}
                          </span>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-row md:flex-col gap-2 mt-4 md:mt-0 justify-end">
                        <button className="px-4 py-2 border border-outline-variant rounded-lg font-title-sm text-title-sm text-primary hover:bg-surface-container-low transition-colors w-full md:w-auto text-center cursor-pointer active:scale-95">
                          Edit
                        </button>
                        <button
                          aria-label={`Hapus jadwal ${s.title}`}
                          onClick={() => setSchedules((prev) => prev.filter((x) => x.id !== s.id))}
                          className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:text-error hover:border-error hover:bg-error-container transition-colors hidden md:block cursor-pointer active:scale-95"
                        >
                          <Icon name="delete" size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* ==== Calendar view ==== */
              <div className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">Oktober 2023</h3>
                  <div className="flex items-center gap-2">
                    <button className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95">
                      <Icon name="chevron_left" size={18} />
                    </button>
                    <button className="p-2 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95">
                      <Icon name="chevron_right" size={18} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((d) => (
                    <div
                      key={d}
                      className="text-center font-label-caps text-label-caps text-on-surface-variant py-2"
                    >
                      {d}
                    </div>
                  ))}
                  {KALENDER_DAYS.map((day, i) =>
                    day === null ? (
                      <div key={`empty-${i}`} className="h-12 md:h-16 rounded-lg" />
                    ) : (
                      <button
                        key={day}
                        className={`h-12 md:h-16 rounded-lg border transition-colors flex flex-col items-center justify-center cursor-pointer active:scale-95 ${
                          examDays.has(day)
                            ? "bg-primary-fixed text-on-primary-fixed border-primary hover:bg-primary-fixed-dim"
                            : "border-outline-variant text-on-surface hover:bg-surface-container-low"
                        }`}
                      >
                        <span className="font-title-sm text-title-sm font-semibold">{day}</span>
                        {examDays.has(day) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1" />
                        )}
                      </button>
                    )
                  )}
                </div>
                <div className="flex items-center gap-4 mt-4 font-body-sm text-body-sm text-on-surface-variant">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-primary-fixed border border-primary inline-block" />{" "}
                    Ada ujian
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded border border-outline-variant inline-block" />{" "}
                    Tidak ada
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </DashboardLayout>
  );
}
