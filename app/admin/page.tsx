"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";

const Charts = dynamic(() => import("@/components/dashboard/Charts"), {
  ssr: false,
  loading: () => (
    <div className="col-span-1 md:col-span-2 lg:col-span-2 h-[260px] bg-surface rounded-xl shadow-sm border border-outline-variant/30 animate-pulse" />
  ),
});

type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

interface UserRow {
  id: number;
  name: string;
  role: "admin" | "guru" | "siswa";
  created_at: string;
}

interface QuestionRow {
  id: number;
  subject: string;
  status: "published" | "draft";
  author_name: string;
  created_at: string;
}

interface JadwalRow {
  id: number;
  title: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  class_names: string;
  status: ExamStatus;
  question_count?: number;
}

interface HasilSummary {
  kelas: string;
  rata: number;
}

interface ActivityItem {
  icon: string;
  title: string;
  subtitle: string;
  active: boolean;
}

function StatCard({
  label,
  value,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  icon: string;
  tone?: "primary" | "error";
}) {
  const iconBox =
    tone === "error"
      ? "bg-error/10 text-error"
      : "bg-primary/10 text-primary";
  return (
    <div className="bg-surface rounded-xl p-4 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <span className="font-title-sm text-title-sm text-on-surface-variant">{label}</span>
        <div className={`w-8 h-8 rounded-full ${iconBox} flex items-center justify-center`}>
          <Icon name={icon} size={16} />
        </div>
      </div>
      <div className="font-display-lg text-display-lg text-on-surface">{value}</div>
    </div>
  );
}

function parseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function stamp(date: string, time: string) {
  return Number(`${date.slice(0, 10).replace(/-/g, "")}${time.slice(0, 8).replace(/:/g, "")}`);
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

function formatTimeRange(row: JadwalRow) {
  return `${row.start_time.slice(0, 5)} - ${row.end_time.slice(0, 5)}`;
}

function statusBadge(row: JadwalRow) {
  const now = jakartaNowStamp();
  const start = stamp(row.exam_date, row.start_time);
  const end = stamp(row.exam_date, row.end_time);
  if (row.status === "cancelled") return { label: "Batal", className: "bg-error-container text-on-error-container" };
  if (row.status === "completed" || now > end) return { label: "Selesai", className: "bg-surface-variant text-on-surface-variant" };
  if (now >= start && now <= end) return { label: "Aktif", className: "bg-secondary-container text-on-secondary-container" };
  return { label: "Terjadwal", className: "bg-primary-fixed text-on-primary-fixed" };
}

function AdminDashboardContent() {
  const router = useRouter();
  const user = useDashboardUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [schedules, setSchedules] = useState<JadwalRow[]>([]);
  const [summaries, setSummaries] = useState<HasilSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [usersRes, questionsRes, schedulesRes, hasilRes] = await Promise.all([
          fetch("/api/users?limit=1000"),
          fetch("/api/questions?limit=1000"),
          fetch("/api/jadwal?limit=1000"),
          fetch("/api/hasil"),
        ]);

        const [usersData, questionsData, schedulesData, hasilData] = await Promise.all([
          usersRes.json(),
          questionsRes.json(),
          schedulesRes.json(),
          hasilRes.json(),
        ]);

        if (!cancelled) {
          if (usersRes.ok) setUsers(usersData.data ?? []);
          if (questionsRes.ok) setQuestions(questionsData.data ?? []);
          if (schedulesRes.ok) setSchedules(schedulesData.data ?? []);
          if (hasilRes.ok) setSummaries(hasilData.summaries ?? []);
        }
      } catch (error) {
        console.error("Fetch admin dashboard error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeExamCount = useMemo(() => schedules.filter((row) => statusBadge(row).label === "Aktif").length, [schedules]);
  const subjectCount = useMemo(() => new Set(questions.map((q) => q.subject).filter(Boolean)).size, [questions]);
  const latestSchedules = useMemo(() => schedules.slice(0, 5), [schedules]);
  const chartLabels = summaries.slice(0, 6).map((item) => item.kelas);
  const chartScores = summaries.slice(0, 6).map((item) => item.rata);

  const weeklyScheduleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    schedules.forEach((item) => {
      const key = item.exam_date.slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      labels.push(date.toLocaleDateString("id-ID", { weekday: "short" }));
      data.push(counts.get(key) ?? 0);
    }
    return { labels, data };
  }, [schedules]);

  const activities: ActivityItem[] = [
    ...schedules.slice(0, 2).map((item) => ({
      icon: statusBadge(item).label === "Selesai" ? "done" : "assignment",
      active: statusBadge(item).label === "Aktif",
      title: `${item.subject} ${statusBadge(item).label}`,
      subtitle: parseJsonArray(item.class_names).join(", ") || item.title,
    })),
    ...questions.slice(0, 2).map((item) => ({
      icon: "upload_file",
      active: item.status === "published",
      title: "Soal Baru Ditambahkan",
      subtitle: `${item.subject} oleh ${item.author_name || "Guru"}`,
    })),
    ...users.slice(0, 1).map((item) => ({
      icon: "person_add",
      active: false,
      title: "User Baru",
      subtitle: `${item.name} (${item.role})`,
    })),
  ].slice(0, 5);

  return (
    <div className="max-w-[1280px] mx-auto">
      <div className="mb-4 md:mb-stack-lg">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
          Selamat Datang, {user?.name ?? "Admin"}
        </h1>
        <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
          Ringkasan aktivitas hari ini dari data sistem.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-4 md:mb-stack-lg">
        <StatCard label="Total Guru" value={loading ? "..." : String(users.filter((u) => u.role === "guru").length)} icon="person" />
        <StatCard label="Total Siswa" value={loading ? "..." : String(users.filter((u) => u.role === "siswa").length)} icon="group" />
        <StatCard label="Total Mapel" value={loading ? "..." : String(subjectCount)} icon="menu_book" />
        <StatCard label="Ujian Aktif" value={loading ? "..." : String(activeExamCount)} icon="assignment" tone="error" />
        <Charts
          activityLabels={weeklyScheduleCounts.labels}
          activityValues={weeklyScheduleCounts.data}
          scoreLabels={chartLabels}
          scoreValues={chartScores}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="col-span-1 lg:col-span-2 bg-surface rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
          <div className="p-4 md:p-6 border-b border-outline-variant/30 flex justify-between items-center">
            <h2 className="font-title-sm text-title-sm text-on-surface">Jadwal Ujian Terbaru</h2>
            <button onClick={() => router.push("/jadwal")} className="text-primary font-label-caps text-label-caps hover:underline cursor-pointer">
              Lihat Semua
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-sm text-body-sm">
              <thead className="bg-[#F8FAFC] text-on-surface-variant border-b border-outline-variant/30">
                <tr>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold">Mata Pelajaran</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold">Kelas</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold">Waktu</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {latestSchedules.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 md:px-6 py-8 text-center text-on-surface-variant">
                      Belum ada jadwal ujian.
                    </td>
                  </tr>
                )}
                {latestSchedules.map((row) => {
                  const badge = statusBadge(row);
                  return (
                    <tr key={row.id} className="border-b border-outline-variant/10 last:border-b-0 hover:bg-[#F8FAFC] transition-colors">
                      <td className="px-4 md:px-6 py-3 md:py-4 font-medium text-on-surface">{row.subject}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-on-surface-variant">{parseJsonArray(row.class_names).join(", ") || "-"}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4 text-on-surface-variant">{formatTimeRange(row)}</td>
                      <td className="px-4 md:px-6 py-3 md:py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-1 bg-surface rounded-xl p-4 md:p-6 shadow-sm border border-outline-variant/30 flex flex-col">
          <h2 className="font-title-sm text-title-sm text-on-surface mb-4 md:mb-6">Aktivitas Terbaru</h2>
          <div className="flex flex-col gap-4">
            {activities.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">Belum ada aktivitas.</p>
            )}
            {activities.map((item, index) => (
              <div key={`${item.title}-${index}`} className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-container-low transition-colors">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${item.active ? "bg-primary text-on-primary" : "bg-surface-variant text-on-surface-variant"}`}>
                  <Icon name={item.icon} size={16} />
                </div>
                <div className="min-w-0">
                  <p className="font-title-sm text-sm text-on-surface truncate">{item.title}</p>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 truncate">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <DashboardLayout active="dashboard" allowedRoles={["admin"]}>
      <AdminDashboardContent />
    </DashboardLayout>
  );
}
