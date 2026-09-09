"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import Icon from "@/components/Icon";
import { getSession, type User } from "@/lib/auth";

type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

interface JadwalItem {
  id: number;
  title: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  class_names: string;
  supervisors: string;
  status: ExamStatus;
  question_count?: number;
}

interface SiswaResultItem {
  exam_schedule_id: number;
  score: number;
  exam_subject: string;
}

function parseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string) {
  const date = new Date(`${dateStr.slice(0, 10)}T00:00:00`);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return {
    day: String(date.getDate()),
    month: monthNames[date.getMonth()],
    full: date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
}

function stamp(date: string, time: string) {
  return Number(`${date.slice(0, 10).replace(/-/g, "")}${time.slice(0, 8).replace(/:/g, "")}`);
}

function jakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function jakartaNowStamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return Number(`${value("year")}${value("month")}${value("day")}${value("hour")}${value("minute")}${value("second")}`);
}

function isOpenNow(item: JadwalItem) {
  const now = jakartaNowStamp();
  return item.status !== "cancelled" && item.status !== "completed" &&
    now >= stamp(item.exam_date, item.start_time) &&
    now <= stamp(item.exam_date, item.end_time);
}

function normalizeClassValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function classMatches(scheduleClass: string, studentClass: string) {
  const scheduleValue = normalizeClassValue(scheduleClass);
  const studentValue = normalizeClassValue(studentClass);
  if (!scheduleValue || !studentValue) return false;
  return (
    scheduleValue === studentValue ||
    studentValue.startsWith(`${scheduleValue} `) ||
    scheduleValue.startsWith(`${studentValue} `)
  );
}

function isForStudent(item: JadwalItem, className: string) {
  if (!className) return true;
  return parseJsonArray(item.class_names).some((kelas) => classMatches(kelas, className));
}

function SiswaWelcome({ todayCount }: { todayCount: number }) {
  const user = useDashboardUser();
  const firstName = user?.name?.split(" ")[0] ?? "Siswa";

  return (
    <div className="mb-stack-lg bg-gradient-to-r from-primary to-primary-container rounded-xl p-6 md:p-8 relative overflow-hidden text-on-primary shadow-sm transition-shadow duration-300 hover:shadow-md">
      <div className="relative z-10 max-w-2xl">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-2">
          Selamat Datang, {firstName}
        </h1>
        <p className="font-body-md text-body-md text-on-primary/90 mb-0 max-w-xl">
          Ada {todayCount} jadwal ujian untuk kelas Anda hari ini.
        </p>
      </div>
      <div
        className="absolute right-0 top-0 w-64 h-full opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle at right center, white 0%, transparent 70%)" }}
      />
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
}

export default function SiswaPage() {
  const router = useRouter();
  const dashboardUser = useDashboardUser();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const user = dashboardUser ?? sessionUser;
  const [schedules, setSchedules] = useState<JadwalItem[]>([]);
  const [results, setResults] = useState<SiswaResultItem[]>([]);
  const [completedScheduleIds, setCompletedScheduleIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const className = user?.department || user?.title || "";

  useEffect(() => {
    const session = getSession();
    setSessionUser(session);

    async function fetchDashboardData() {
      try {
        setLoading(true);
        const schedulesRequest = fetch("/api/jadwal?limit=100");
        const resultsRequest = session?.id
          ? fetch(`/api/hasil/siswa?userId=${session.id}&all=true`)
          : null;

        const schedulesRes = await schedulesRequest;
        const schedulesData = await schedulesRes.json();
        if (schedulesRes.ok) setSchedules(schedulesData.data ?? []);

        if (resultsRequest) {
          const resultsRes = await resultsRequest;
          const resultsData = await resultsRes.json();
          if (resultsRes.ok) {
            const resultItems = (resultsData.results ?? []) as SiswaResultItem[];
            setResults(resultItems);
            setCompletedScheduleIds(
              new Set(
                resultItems
                  .map((item: SiswaResultItem) => Number(item.exam_schedule_id))
                  .filter((id: number) => Number.isInteger(id) && id > 0)
              )
            );
          }
        }
      } catch (err) {
        console.error("Fetch siswa schedules error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const visibleSchedules = useMemo(() => {
    return schedules
      .filter((item) => isForStudent(item, className))
      .filter((item) => item.status !== "cancelled")
      .filter((item) => !completedScheduleIds.has(item.id))
      .sort((a, b) => stamp(a.exam_date, a.start_time) - stamp(b.exam_date, b.start_time));
  }, [schedules, className, completedScheduleIds]);

  const todaySchedules = visibleSchedules.filter((item) => item.exam_date.slice(0, 10) === jakartaToday());
  const activeExam = todaySchedules.find(isOpenNow) ?? todaySchedules[0] ?? visibleSchedules[0];
  const upcoming = visibleSchedules.filter((item) => item.id !== activeExam?.id).slice(0, 4);
  const averageScore = results.length > 0
    ? Math.round(results.reduce((sum, item) => sum + Number(item.score || 0), 0) / results.length)
    : 0;

  return (
    <DashboardLayout active="dashboard" allowedRoles={["siswa"]}>
      <div className="max-w-[1280px] mx-auto">
        <SiswaWelcome todayCount={todaySchedules.length} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-gutter">
          <div className="lg:col-span-2 space-y-3 md:space-y-stack-lg">
            <section>
              <div className="flex items-center justify-between mb-3 md:mb-stack-md">
                <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
                  <Icon name="schedule" className="text-primary" size={24} />
                  Jadwal Ujian Terdekat
                </h2>
              </div>

              <div className="bg-surface rounded-xl p-4 md:p-6 border border-outline-variant border-l-4 border-l-primary shadow-sm relative overflow-hidden">
                {loading && (
                  <p className="font-body-md text-body-md text-on-surface-variant">Memuat jadwal...</p>
                )}
                {!loading && !activeExam && (
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    Belum ada jadwal ujian untuk kelas Anda.
                  </p>
                )}
                {!loading && activeExam && (
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
                    <div>
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-label-caps text-label-caps mb-3 ${
                        isOpenNow(activeExam)
                          ? "bg-error-container text-on-error-container"
                          : "bg-surface-container-high text-on-surface-variant"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOpenNow(activeExam) ? "bg-error animate-pulse" : "bg-outline"}`} />
                        {isOpenNow(activeExam) ? "BISA DIMULAI" : "TERJADWAL"}
                      </div>
                      <h3 className="font-headline-md text-headline-md text-on-surface mb-1">
                        {activeExam.title}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Icon name="person" size={16} /> {parseJsonArray(activeExam.supervisors).join(", ") || "-"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="meeting_room" size={16} /> {activeExam.room}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="list_alt" size={16} /> {activeExam.question_count ?? 0} soal
                        </span>
                      </p>
                    </div>
                    <div className="w-full md:w-auto text-right">
                      <p className="font-title-sm text-title-sm text-on-surface mb-2">
                        {formatDate(activeExam.exam_date).full}, {activeExam.start_time.slice(0, 5)} - {activeExam.end_time.slice(0, 5)} WIB
                      </p>
                      <button
                        onClick={() => router.push(`/ujian?scheduleId=${activeExam.id}`)}
                        disabled={!isOpenNow(activeExam)}
                        className="w-full md:w-auto bg-primary text-on-primary font-title-sm text-title-sm py-3 px-6 md:px-8 rounded-lg hover:bg-primary/90 active:scale-95 transition-all duration-200 shadow-sm flex items-center justify-center gap-2 min-h-[44px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Mulai Ujian
                        <Icon name="arrow_forward" size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 md:p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
                  Ujian Akan Datang
                </h3>
                <button
                  onClick={() => router.push("/jadwal")}
                  className="text-primary text-sm hover:underline font-body-sm text-body-sm cursor-pointer"
                >
                  Lihat Semua
                </button>
              </div>
              <div className="p-2 flex-1">
                {upcoming.length === 0 && (
                  <p className="p-3 font-body-sm text-body-sm text-on-surface-variant">
                    Tidak ada jadwal lain.
                  </p>
                )}
                {upcoming.map((exam, i) => {
                  const date = formatDate(exam.exam_date);
                  return (
                    <div
                      key={exam.id}
                      className={`flex items-start gap-3 md:gap-4 p-3 hover:bg-surface-container-low rounded-lg transition-colors cursor-pointer ${
                        i < upcoming.length - 1 ? "border-b border-surface-variant" : ""
                      }`}
                      onClick={() => router.push("/jadwal")}
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-primary-container flex flex-col items-center justify-center text-on-primary font-bold shrink-0">
                        <div className="text-center leading-tight">
                          <div className="text-[10px] md:text-xs font-semibold uppercase">{date.month}</div>
                          <div className="text-sm md:text-lg leading-none">{date.day}</div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-title-sm text-title-sm text-on-surface mb-0.5 truncate">
                          {exam.title}
                        </h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant text-xs">
                          {exam.start_time.slice(0, 5)} WIB - {exam.subject}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          <div className="space-y-3 md:space-y-stack-lg">
            <section className="bg-surface rounded-xl border border-outline-variant p-4 md:p-6 shadow-sm text-center relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-xl" />
              <h3 className="font-title-sm text-title-sm text-on-surface-variant mb-4 md:mb-6 relative z-10">
                Ringkasan Jadwal
              </h3>
              <div className="relative z-10 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">Hari Ini</p>
                  <p className="font-headline-md text-headline-md text-on-surface">{todaySchedules.length}</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">Belum</p>
                  <p className="font-headline-md text-headline-md text-on-surface">{visibleSchedules.length}</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">Selesai</p>
                  <p className="font-headline-md text-headline-md text-on-surface">{results.length}</p>
                </div>
                <div className="rounded-lg bg-surface-container-low p-3">
                  <p className="font-label-caps text-label-caps text-on-surface-variant">Rata-rata</p>
                  <p className="font-headline-md text-headline-md text-on-surface">{averageScore}</p>
                </div>
              </div>
            </section>

            <section className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
              <div className="p-4 md:p-5 border-b border-outline-variant bg-surface-bright flex items-center gap-2">
                <Icon name="assessment" className="text-primary" size={20} />
                <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">
                  Hasil Terbaru
                </h3>
              </div>
              <div className="p-4 md:p-5">
                {results.length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Belum ada hasil ujian.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {results.slice(0, 3).map((result) => (
                      <button
                        key={result.exam_schedule_id}
                        type="button"
                        onClick={() => router.push("/hasil")}
                        className="w-full flex items-center justify-between gap-3 rounded-lg bg-surface-container-low p-3 text-left hover:bg-surface-container transition-colors cursor-pointer"
                      >
                        <span className="min-w-0">
                          <span className="block font-title-sm text-title-sm text-on-surface truncate">
                            {result.exam_subject}
                          </span>
                          <span className="block font-body-sm text-body-sm text-on-surface-variant">
                            Sudah dikerjakan
                          </span>
                        </span>
                        <span className="font-headline-md text-headline-md text-primary">
                          {result.score}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
