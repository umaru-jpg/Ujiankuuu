"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";

type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

interface JadwalRow {
  id: number;
  title: string;
  subject: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  class_names: string;
  supervisors: string;
  status: ExamStatus;
  created_by: number;
}

interface QuestionRow {
  id: number;
  subject: string;
  level: string;
  status: "published" | "draft";
  question_type: "multiple_choice" | "essay";
  prompt: string;
}

interface GuruExamResult {
  id: string;
  mapel: string;
  kelas: string;
  date: string;
  students: {
    nis: string;
    name: string;
    kelas: string;
    score: number;
  }[];
}

interface UserRow {
  id: number;
  role: "admin" | "guru" | "siswa";
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
  };
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

function isActiveExam(item: JadwalRow) {
  const now = jakartaNowStamp();
  return item.status !== "cancelled" && item.status !== "completed" &&
    now >= stamp(item.exam_date, item.start_time) &&
    now <= stamp(item.exam_date, item.end_time);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function difficultyLabel(level: string) {
  if (level === "XII") return { label: "Sulit", className: "text-error" };
  if (level === "XI") return { label: "Sedang", className: "text-tertiary" };
  return { label: "Dasar", className: "text-primary" };
}

function GuruWelcome() {
  const user = useDashboardUser();

  return (
    <div className="mb-stack-lg">
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
        Selamat Datang, {user?.name ?? "Guru"}.
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Berikut adalah ringkasan aktivitas dan jadwal dari data Anda.
      </p>
    </div>
  );
}

function GuruDashboardContent() {
  const router = useRouter();
  const user = useDashboardUser();
  const [schedules, setSchedules] = useState<JadwalRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [examResults, setExamResults] = useState<GuruExamResult[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [jadwalRes, questionRes, hasilRes, usersRes] = await Promise.all([
          fetch("/api/jadwal?limit=1000"),
          fetch(`/api/questions?limit=1000&author_id=${userId}`),
          fetch(`/api/hasil/guru?userId=${userId}`),
          fetch("/api/users?limit=1000"),
        ]);

        const [jadwalData, questionData, hasilData, usersData] = await Promise.all([
          jadwalRes.json(),
          questionRes.json(),
          hasilRes.json(),
          usersRes.json(),
        ]);

        if (!cancelled) {
          if (jadwalRes.ok) setSchedules(jadwalData.data ?? []);
          if (questionRes.ok) setQuestions(questionData.data ?? []);
          if (hasilRes.ok) setExamResults(hasilData.exams ?? []);
          if (usersRes.ok) setUsers(usersData.data ?? []);
        }
      } catch (error) {
        console.error("Fetch guru dashboard error:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const guruSchedules = useMemo(() => {
    if (!user) return [];
    return schedules
      .filter((item) => item.created_by === user.id || parseJsonArray(item.supervisors).includes(user.name))
      .sort((a, b) => stamp(a.exam_date, a.start_time) - stamp(b.exam_date, b.start_time));
  }, [schedules, user]);

  const upcomingSchedules = useMemo(() => {
    const now = jakartaNowStamp();
    return guruSchedules
      .filter((item) => item.status !== "cancelled" && item.status !== "completed")
      .filter((item) => stamp(item.exam_date, item.end_time) >= now)
      .slice(0, 4);
  }, [guruSchedules]);

  const classCount = useMemo(() => {
    const classes = new Set<string>();
    guruSchedules.forEach((item) => parseJsonArray(item.class_names).forEach((kelas) => classes.add(kelas)));
    return classes.size;
  }, [guruSchedules]);

  const resultScores = examResults.flatMap((exam) => exam.students.map((student) => student.score));
  const studentCount = new Set(examResults.flatMap((exam) => exam.students.map((student) => student.nis))).size ||
    users.filter((item) => item.role === "siswa").length;
  const averageScore = average(resultScores);
  const chartValues = examResults.slice(0, 5).map((exam) => average(exam.students.map((student) => student.score)));
  const recentQuestions = questions.slice(0, 5);

  const stats = [
    { label: "Total Kelas", value: classCount, icon: "school", iconClass: "bg-primary-container text-on-primary-container" },
    { label: "Total Siswa", value: studentCount, icon: "group", iconClass: "bg-secondary-container text-on-secondary-container" },
    { label: "Ujian Aktif", value: guruSchedules.filter(isActiveExam).length, icon: "assignment", iconClass: "bg-tertiary-container text-on-tertiary-container" },
    { label: "Rata-rata Nilai", value: averageScore, icon: "task_alt", iconClass: "bg-surface-tint text-on-primary" },
  ];

  return (
    <div className="max-w-container-max mx-auto">
      <GuruWelcome />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-gutter mb-4 md:mb-stack-lg">
        <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-gutter">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface rounded-xl p-3 md:p-4 shadow-sm border border-outline-variant flex items-center gap-3 md:gap-4">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full ${stat.iconClass} flex items-center justify-center`}>
                <Icon name={stat.icon} size={20} />
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">{stat.label}</p>
                <p className="font-headline-md text-headline-md text-on-surface">{loading ? "..." : stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-7 bg-surface rounded-xl shadow-sm border border-outline-variant p-4 md:p-stack-md flex flex-col">
          <div className="flex justify-between items-center mb-3 md:mb-stack-md">
            <h3 className="font-title-sm text-title-sm text-on-surface">Jadwal Ujian Mendatang</h3>
            <button onClick={() => router.push("/jadwal")} className="text-primary font-label-caps text-label-caps hover:underline cursor-pointer">
              Lihat Semua
            </button>
          </div>
          <div className="flex-1 space-y-3 md:space-y-4">
            {upcomingSchedules.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant p-3">Belum ada jadwal mendatang.</p>
            )}
            {upcomingSchedules.map((item) => {
              const date = formatDate(item.exam_date);
              return (
                <div key={item.id} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors">
                  <div className="flex-shrink-0 w-12 h-12 md:w-16 md:h-16 bg-primary-fixed-dim rounded-lg flex flex-col items-center justify-center text-on-primary-fixed">
                    <span className="font-headline-md text-headline-md font-bold leading-none">{date.day}</span>
                    <span className="font-label-caps text-label-caps">{date.month}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-title-sm text-title-sm text-on-surface truncate">
                      {item.subject} - {parseJsonArray(item.class_names).join(", ") || item.title}
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                      <Icon name="schedule" size={16} /> {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} WIB
                    </p>
                  </div>
                  <span className="px-2 md:px-3 py-1 bg-surface-container-high rounded-full font-label-caps text-label-caps text-on-surface text-xs">
                    {isActiveExam(item) ? "Aktif" : "Persiapan"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-surface rounded-xl shadow-sm border border-outline-variant p-4 md:p-stack-md flex flex-col">
          <h3 className="font-title-sm text-title-sm text-on-surface mb-3 md:mb-stack-md">Grafik Performa Siswa</h3>
          <div className="flex-1 flex flex-col items-center justify-center relative min-h-[180px] md:min-h-[250px] bg-surface-container-lowest rounded-lg border border-outline-variant border-dashed">
            <div className="w-full h-full p-3 md:p-4 flex items-end gap-2 justify-between">
              {(chartValues.length > 0 ? chartValues : [0, 0, 0, 0, 0]).map((value, i) => (
                <div
                  key={i}
                  className="w-1/6 rounded-t-sm bg-primary"
                  style={{ height: `${Math.max(4, Math.min(100, value))}%` }}
                />
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="font-label-caps text-label-caps text-on-surface-variant bg-surface px-2 py-1 rounded shadow-sm text-xs">
                Rata-rata nilai per ujian
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-12 bg-surface rounded-xl shadow-sm border border-outline-variant p-4 md:p-stack-md">
          <div className="flex justify-between items-center mb-3 md:mb-stack-md">
            <h3 className="font-title-sm text-title-sm text-on-surface">Daftar Soal Terbaru</h3>
            <button onClick={() => router.push("/bank")} className="bg-primary text-on-primary px-3 md:px-4 py-2 rounded-lg font-label-caps text-label-caps flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors h-10 md:h-11 cursor-pointer">
              <Icon name="add" size={16} /> <span className="hidden sm:inline">Tambah Soal</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant">
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Mata Pelajaran</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps hidden sm:table-cell">Tingkat Kesulitan</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps">Status</th>
                  <th className="py-3 px-3 md:px-4 font-label-caps text-label-caps text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {recentQuestions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-on-surface-variant">Belum ada soal dari akun guru ini.</td>
                  </tr>
                )}
                {recentQuestions.map((q) => {
                  const difficulty = difficultyLabel(q.level);
                  return (
                    <tr key={q.id} className="border-b border-surface-variant hover:bg-surface-container-lowest transition-colors">
                      <td className="py-3 px-3 md:px-4">
                        <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface font-medium line-clamp-1">{q.prompt}</p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">{q.subject}</p>
                      </td>
                      <td className="py-3 px-3 md:px-4 hidden sm:table-cell">
                        <span className={`font-body-sm text-body-sm font-medium ${difficulty.className}`}>{difficulty.label}</span>
                      </td>
                      <td className="py-3 px-3 md:px-4">
                        <span className={`px-2 py-1 rounded text-xs ${q.status === "published" ? "bg-primary-fixed-dim text-on-primary-fixed" : "bg-surface-container-high text-on-surface"}`}>
                          {q.status === "published" ? "Published" : "Draft"}
                        </span>
                      </td>
                      <td className="py-3 px-3 md:px-4 text-right whitespace-nowrap">
                        <button onClick={() => router.push("/bank")} aria-label={`Edit soal ${q.id}`} className="text-primary p-2 hover:bg-primary-fixed-dim rounded-full transition-colors cursor-pointer">
                          <Icon name="edit" size={18} />
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
    </div>
  );
}

export default function GuruPage() {
  return (
    <DashboardLayout active="dashboard" allowedRoles={["guru"]}>
      <GuruDashboardContent />
    </DashboardLayout>
  );
}
