"use client";

import { useRouter } from "next/navigation";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import AdminHasil from "@/components/hasil/AdminHasil";
import GuruHasil from "@/components/hasil/GuruHasil";
import Icon from "@/components/Icon";
import { HOME_BY_ROLE } from "@/lib/auth";

/** Performa per topik (mock). */
const TOPIC_BARS = [
  { label: "Aljabar", pct: 90 },
  { label: "Geometri", pct: 75 },
  { label: "Logika", pct: 100 },
  { label: "Statistik", pct: 60 },
];

/** Tampilan hasil untuk siswa: perayaan nilai pribadi setelah mengerjakan ujian. */
function SiswaHasil() {
  const router = useRouter();
  const user = useDashboardUser();

  return (
    <div className="max-w-[800px] mx-auto space-y-stack-lg mt-stack-md">
      {/* ===== Hero / Celebration ===== */}
      <div className="text-center space-y-2">
        <h1 className="font-display-lg text-display-lg text-on-surface">Ujian Selesai!</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Kerja bagus! Berikut adalah hasil dari evaluasi Anda hari ini.
        </p>
      </div>

      {/* ===== Bento Grid ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {/* Kartu Nilai Akhir */}
        <div className="md:col-span-1 bg-surface rounded-xl p-stack-lg shadow-sm border border-outline-variant flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary-container/10 to-transparent pointer-events-none" />
          <p className="font-title-sm text-title-sm text-on-surface-variant mb-6 relative z-10">
            Nilai Akhir
          </p>
          {/* Circular score */}
          <div className="w-40 h-40 rounded-full border-[12px] border-primary flex flex-col items-center justify-center bg-surface relative z-10 shadow-inner">
            <span className="font-display-lg text-display-lg text-primary leading-none">85</span>
            <span className="font-label-caps text-label-caps text-outline mt-1">/ 100</span>
          </div>
          {/* Status badge */}
          <div className="mt-8 px-6 py-2 rounded-full bg-primary text-on-primary font-title-sm text-title-sm shadow-sm relative z-10 flex items-center gap-2">
            <Icon name="verified" filled size={18} />
            LULUS
          </div>
        </div>

        {/* Stats & Chart */}
        <div className="md:col-span-2 flex flex-col gap-gutter">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-surface-container text-primary">
                <Icon name="check_circle" size={22} />
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">Benar</p>
                <p className="font-headline-md text-headline-md text-on-surface">
                  42 <span className="font-body-sm text-body-sm text-outline font-normal">soal</span>
                </p>
              </div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-error-container text-on-error-container">
                <Icon name="cancel" size={22} />
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">Salah</p>
                <p className="font-headline-md text-headline-md text-on-surface">
                  8 <span className="font-body-sm text-body-sm text-outline font-normal">soal</span>
                </p>
              </div>
            </div>
            <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm flex items-start gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-secondary-container text-on-secondary-container">
                <Icon name="schedule" size={22} />
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">Waktu</p>
                <p className="font-headline-md text-headline-md text-on-surface">
                  45<span className="font-body-sm text-body-sm text-outline font-normal">m</span> 12
                  <span className="font-body-sm text-body-sm text-outline font-normal">s</span>
                </p>
              </div>
            </div>
          </div>

          {/* Chart Performa per Topik */}
          <div className="bg-surface rounded-xl p-stack-md border border-outline-variant shadow-sm flex-1 flex flex-col">
            <h3 className="font-title-sm text-title-sm text-on-surface mb-4">Performa per Topik</h3>
            <div className="flex-1 flex items-end gap-2 mt-auto h-32 pt-4">
              {TOPIC_BARS.map((bar) => (
                <div key={bar.label} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full bg-surface-container rounded-t-sm relative flex items-end justify-center h-full">
                    <div
                      className="w-full bg-primary rounded-t-sm chart-bar opacity-80 group-hover:opacity-100 transition-opacity"
                      style={{ height: `${bar.pct}%` }}
                    />
                    <span className="absolute -top-6 font-label-caps text-label-caps text-on-surface opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.pct}%
                    </span>
                  </div>
                  <span className="font-label-caps text-label-caps text-outline text-center truncate w-full">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Action ===== */}
      <div className="flex justify-center pt-stack-md">
        <button
          onClick={() => router.push(HOME_BY_ROLE[user?.role ?? "siswa"])}
          className="bg-primary text-on-primary hover:bg-primary-container transition-colors px-8 py-3 rounded-lg font-title-sm text-title-sm shadow-sm flex items-center gap-2 active:scale-95 duration-200 cursor-pointer"
        >
          Kembali ke Dashboard
          <Icon name="arrow_forward" size={20} />
        </button>
      </div>
    </div>
  );
}

/**
 * Memilih tampilan berdasarkan role.
 * Penting: dirender DI DALAM DashboardLayout agar useDashboardUser()
 * membaca context user yang benar (di tingkat halaman, context belum tersedia).
 */
function HasilContent() {
  const user = useDashboardUser();

  // Admin: rekap sekolah. Guru: daftar nilai per siswa untuk kelas yang diajar.
  if (user?.role === "admin") {
    return <AdminHasil />;
  }
  if (user?.role === "guru") {
    return <GuruHasil />;
  }

  // Siswa: latar full-bleed (menutupi padding <main>) agar tampilan tetap seperti desain awal.
  return (
    <div className="-m-4 md:-m-margin-desktop bg-surface-container-low p-4 md:p-margin-desktop">
      <SiswaHasil />
    </div>
  );
}

export default function HasilPage() {
  return (
    <DashboardLayout active="hasil">
      <HasilContent />
    </DashboardLayout>
  );
}
