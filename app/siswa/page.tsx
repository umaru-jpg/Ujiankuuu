"use client";

import { useRouter } from "next/navigation";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import Icon from "@/components/Icon";

/** Data statis mock (frontend-only). */
const UPCOMING_EXAMS = [
  {
    day: "15",
    month: "Okt",
    title: "Basis Data Lanjut",
    meta: "Selasa, 10:00 WIB • Ibu Sari",
  },
  {
    day: "18",
    month: "Okt",
    title: "Bahasa Inggris",
    meta: "Jumat, 08:00 WIB • Mr. John",
  },
];

const HISTORY = [
  { title: "Matematika Diskrit", date: "10 Okt 2023", score: 85 },
  { title: "Sistem Operasi", date: "05 Okt 2023", score: 78 },
];

const ANNOUNCEMENTS = [
  {
    tag: "Penting",
    tagClass: "bg-primary/10 text-primary",
    time: "Hari ini",
    title: "Perubahan Jadwal PTS Ganjil 2023/2024",
  },
  {
    tag: "Info",
    tagClass: "bg-surface-container-high text-on-surface-variant",
    time: "Kemarin",
    title: "Tata Tertib Peserta Ujian Berbasis Komputer",
  },
];

/** Lingkaran progres nilai (SVG, stroke-dashoffset untuk persentase). */
function ScoreRing({ value }: { value: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);

  return (
    <div className="relative inline-flex items-center justify-center w-32 h-32 mb-4 z-10">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle
          className="stroke-surface-container-highest"
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          strokeWidth="8"
        />
        <circle
          className="stroke-primary transition-[stroke-dashoffset] duration-700"
          cx="50"
          cy="50"
          fill="transparent"
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          strokeWidth="8"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="font-display-lg text-display-lg text-on-surface">{value}</span>
      </div>
    </div>
  );
}

export default function SiswaPage() {
  const router = useRouter();
  const user = useDashboardUser();
  const firstName = user?.name?.split(" ")[0] ?? "Siswa";

  return (
    <DashboardLayout active="dashboard" allowedRoles={["siswa"]}>
      <div className="max-w-[1280px] mx-auto">
        {/* ===== Welcome Banner ===== */}
        <div className="mb-stack-lg bg-gradient-to-r from-primary to-primary-container rounded-xl p-6 md:p-8 relative overflow-hidden text-on-primary shadow-sm transition-shadow duration-300 hover:shadow-md">
          <div className="relative z-10 max-w-2xl">
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-2">
              Selamat Datang, {firstName}! 👋
            </h1>
            <p className="font-body-md text-body-md text-on-primary/90 mb-0 max-w-xl">
              Persiapkan dirimu. Ada 1 ujian menantimu hari ini. Tetap fokus dan berikan yang terbaik!
            </p>
          </div>
          {/* Abstract BG Elements */}
          <div
            className="absolute right-0 top-0 w-64 h-full opacity-20 pointer-events-none"
            style={{ background: "radial-gradient(circle at right center, white 0%, transparent 70%)" }}
          />
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          {/* ===== Left Column (Main Focus) ===== */}
          <div className="lg:col-span-2 space-y-stack-lg">
            {/* --- Jadwal Ujian Hari Ini --- */}
            <section>
              <div className="flex items-center justify-between mb-stack-md">
                <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                  <Icon name="schedule" className="text-primary" size={24} />
                  Jadwal Ujian Hari Ini
                </h2>
              </div>
              <div className="bg-surface rounded-xl p-6 border border-outline-variant border-l-4 border-l-primary shadow-sm transition-shadow duration-300 hover:shadow-md relative overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-error-container text-on-error-container font-label-caps text-label-caps mb-3">
                      <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                      SEGERA MULAI
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
                      Pemrograman Web Bergerak
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1">
                        <Icon name="person" size={16} /> Bpk. Hendra
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="timer" size={16} /> 90 Menit
                      </span>
                      <span className="flex items-center gap-1">
                        <Icon name="list_alt" size={16} /> 40 Soal Pilihan Ganda
                      </span>
                    </p>
                  </div>
                  <div className="w-full md:w-auto text-right">
                    <p className="font-title-sm text-title-sm text-on-surface mb-2">08:00 - 09:30 WIB</p>
                    <button
                      onClick={() => router.push("/ujian")}
                      className="w-full md:w-auto bg-primary text-on-primary font-title-sm text-title-sm py-3 px-8 rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
                    >
                      Mulai Ujian
                      <Icon name="arrow_forward" size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* --- Ujian Akan Datang & Riwayat Terbaru --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
              {/* Upcoming */}
              <section className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                  <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
                    Ujian Akan Datang
                  </h3>
                  <button className="text-primary text-sm hover:underline font-body-sm text-body-sm cursor-pointer">
                    Lihat Semua
                  </button>
                </div>
                <div className="p-2 flex-1">
                  {UPCOMING_EXAMS.map((exam, i) => (
                    <div
                      key={exam.title}
                      className={`flex items-start gap-4 p-3 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer ${
                        i < UPCOMING_EXAMS.length - 1 ? "border-b border-surface-variant" : ""
                      }`}
                    >
                      <div className="w-12 h-12 rounded-lg bg-primary-container flex flex-col items-center justify-center text-on-primary font-bold shrink-0">
                        <div className="text-center leading-tight">
                          <div className="text-xs font-semibold uppercase">{exam.month}</div>
                          <div className="text-lg leading-none">{exam.day}</div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-title-sm text-title-sm text-on-surface mb-0.5 truncate">
                          {exam.title}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                          {exam.meta}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* History */}
              <section className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
                <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                  <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
                    Riwayat Terbaru
                  </h3>
                  <button className="text-primary text-sm hover:underline font-body-sm text-body-sm cursor-pointer">
                    Detail
                  </button>
                </div>
                <div className="p-2 flex-1">
                  {HISTORY.map((item, i) => (
                    <div
                      key={item.title}
                      className={`flex items-center justify-between p-3 hover:bg-surface-container-low rounded-lg transition-colors ${
                        i < HISTORY.length - 1 ? "border-b border-surface-variant" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <h4 className="font-title-sm text-title-sm text-on-surface mb-0.5 truncate">
                          {item.title}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                          {item.date}
                        </p>
                      </div>
                      <div
                        className={`px-3 py-1 rounded-full font-title-sm text-title-sm font-bold shrink-0 ${
                          item.score >= 80
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-surface-container-high text-on-surface"
                        }`}
                      >
                        {item.score}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>

          {/* ===== Right Column (Stats & Announcements) ===== */}
          <div className="space-y-stack-lg">
            {/* --- Rata-rata Nilai --- */}
            <section className="bg-surface rounded-xl border border-outline-variant p-6 shadow-sm text-center relative overflow-hidden transition-shadow duration-300 hover:shadow-md">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-xl" />
              <h3 className="font-title-sm text-title-sm text-on-surface-variant mb-6 relative z-10">
                Rata-rata Nilai Semester Ini
              </h3>
              <ScoreRing value={82} />
              <p className="font-body-sm text-body-sm text-on-surface-variant relative z-10">
                Dari 12 Ujian Terselesaikan
              </p>
              <div className="mt-6 pt-6 border-t border-outline-variant flex justify-around relative z-10">
                <div className="text-center">
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-xs mb-1">Tertinggi</p>
                  <p className="font-title-sm text-title-sm text-on-surface font-semibold text-primary">95</p>
                </div>
                <div className="w-px bg-outline-variant" />
                <div className="text-center">
                  <p className="font-body-sm text-body-sm text-on-surface-variant text-xs mb-1">Terendah</p>
                  <p className="font-title-sm text-title-sm text-on-surface font-semibold text-on-surface-variant">68</p>
                </div>
              </div>
            </section>

            {/* --- Pengumuman Sekolah --- */}
            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-md">
              <div className="p-5 border-b border-outline-variant bg-surface-bright flex items-center gap-2">
                <Icon name="campaign" className="text-primary" size={22} />
                <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
                  Pengumuman Sekolah
                </h3>
              </div>
              <div className="p-5 space-y-4">
                {ANNOUNCEMENTS.map((a, i) => (
                  <div key={a.title}>
                    {i > 0 && <div className="w-full h-px bg-outline-variant mb-4" />}
                    <div className="group cursor-pointer">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${a.tagClass}`}
                        >
                          {a.tag}
                        </span>
                        <span className="text-xs text-on-surface-variant">{a.time}</span>
                      </div>
                      <h4 className="font-title-sm text-title-sm text-on-surface group-hover:text-primary transition-colors leading-tight">
                        {a.title}
                      </h4>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
