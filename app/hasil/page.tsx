"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import AdminHasil from "@/components/hasil/AdminHasil";
import GuruHasil from "@/components/hasil/GuruHasil";
import Icon from "@/components/Icon";
import { HOME_BY_ROLE, getSession } from "@/lib/auth";

interface SiswaResult {
  score: number;
  correct_answers: number;
  wrong_answers: number;
  duration_seconds: number;
  topic_performance: { label: string; pct: number }[];
  exam_title: string;
  exam_subject: string;
  exam_date: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function SiswaHasil() {
  const router = useRouter();
  const user = useDashboardUser();
  const [result, setResult] = useState<SiswaResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const session = getSession();
        if (!session?.id) {
          setLoading(false);
          return;
        }

        const res = await fetch(`/api/hasil/siswa?userId=${session.id}`);
        if (!res.ok) throw new Error("Gagal mengambil data");

        const data = await res.json();
        if (!cancelled) {
          setResult(data.result ?? null);
        }
      } catch (err) {
        console.error("Fetch siswa hasil error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-[800px] mx-auto space-y-stack-lg mt-stack-md">
        <div className="text-center space-y-2">
          <div className="h-10 w-64 bg-surface rounded-lg animate-pulse mx-auto" />
          <div className="h-5 w-80 bg-surface rounded-lg animate-pulse mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          <div className="h-64 bg-surface rounded-xl animate-pulse" />
          <div className="md:col-span-2 h-64 bg-surface rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="max-w-[800px] mx-auto space-y-stack-lg mt-stack-md">
        <div className="text-center space-y-2">
          <h1 className="font-display-lg text-display-lg text-on-surface">Belum Ada Hasil</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Anda belum memiliki hasil ujian yang tersedia.
          </p>
        </div>
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

  const lulus = result.score >= 75;

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
          <div className="w-40 h-40 rounded-full border-[12px] border-primary flex flex-col items-center justify-center bg-surface relative z-10 shadow-inner">
            <span className="font-display-lg text-display-lg text-primary leading-none">{result.score}</span>
            <span className="font-label-caps text-label-caps text-outline mt-1">/ 100</span>
          </div>
          <div className={`mt-8 px-6 py-2 rounded-full font-title-sm text-title-sm shadow-sm relative z-10 flex items-center gap-2 ${
            lulus ? "bg-primary text-on-primary" : "bg-error text-on-error"
          }`}>
            <Icon name="verified" filled size={18} />
            {lulus ? "LULUS" : "TIDAK LULUS"}
          </div>
        </div>

        {/* Stats & Chart */}
        <div className="md:col-span-2 flex flex-col gap-gutter">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-surface rounded-xl p-4 border border-outline-variant shadow-sm flex items-start gap-3">
              <div className="p-2 rounded-lg bg-surface-container text-primary">
                <Icon name="check_circle" size={22} />
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">Benar</p>
                <p className="font-headline-md text-headline-md text-on-surface">
                  {result.correct_answers} <span className="font-body-sm text-body-sm text-outline font-normal">soal</span>
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
                  {result.wrong_answers} <span className="font-body-sm text-body-sm text-outline font-normal">soal</span>
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
                  {formatDuration(result.duration_seconds)}
                </p>
              </div>
            </div>
          </div>

          {/* Chart Performa per Topik */}
          {result.topic_performance.length > 0 && (
            <div className="bg-surface rounded-xl p-stack-md border border-outline-variant shadow-sm flex-1 flex flex-col">
              <h3 className="font-title-sm text-title-sm text-on-surface mb-4">Performa per Topik</h3>
              <div className="flex-1 flex items-end gap-2 mt-auto h-32 pt-4">
                {result.topic_performance.map((bar) => (
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
          )}
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

function HasilContent() {
  const user = useDashboardUser();

  if (user?.role === "admin") {
    return <AdminHasil />;
  }
  if (user?.role === "guru") {
    return <GuruHasil />;
  }

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
