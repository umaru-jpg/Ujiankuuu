"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import Icon from "@/components/Icon";
import { getSession } from "@/lib/auth";

// ── Types ──────────────────────────────────────────────────────────────

type ViewMode = "kalender" | "daftar";

type ExamType = "PTS" | "PAS" | "UH" | "UTS" | "UAS" | "other";
type ExamStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

interface JadwalItem {
  id: number;
  title: string;
  subject: string;
  exam_type: ExamType;
  exam_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm:ss
  end_time: string;
  room: string;
  class_names: string; // JSON string
  supervisors: string; // JSON string
  status: ExamStatus;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  creator_name?: string;
  question_count?: number;
  question_ids?: number[];
}

interface ApiQuestion {
  id: number;
  subject: string;
  level: "X" | "XI" | "XII";
  status: "published" | "draft";
  question_type: "multiple_choice" | "essay";
  prompt: string;
  author_name: string;
}

interface QuestionPackage {
  key: string;
  subject: string;
  level: ApiQuestion["level"];
  questions: ApiQuestion[];
  multipleChoice: number;
  essay: number;
}

interface KelasOption {
  id: number;
  name: string;
  level: ApiQuestion["level"];
  major: string;
  homeroom_teacher: string;
  student_count: number;
}

interface KelasGroupOption {
  key: string;
  label: string;
  level: ApiQuestion["level"];
  major: string;
  studentCount: number;
}

interface FormState {
  title: string;
  subject: string;
  exam_type: ExamType;
  exam_date: string;
  start_time: string;
  end_time: string;
  room: string;
  class_names: string; // comma-separated input
  supervisors: string; // comma-separated input
  status: ExamStatus;
  notes: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  subject: "",
  exam_type: "PTS",
  exam_date: "",
  start_time: "",
  end_time: "",
  room: "",
  class_names: "",
  supervisors: "",
  status: "scheduled",
  notes: "",
};

const EXAM_TYPES: ExamType[] = ["PTS", "PAS", "UH", "UTS", "UAS", "other"];
const STATUS_OPTIONS: ExamStatus[] = ["scheduled", "ongoing", "completed", "cancelled"];

const STATUS_LABEL: Record<ExamStatus, string> = {
  scheduled: "Terjadwal",
  ongoing: "Berlangsung",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

const STATUS_BADGE: Record<ExamStatus, string> = {
  scheduled: "bg-primary-fixed text-on-primary-fixed",
  ongoing: "bg-secondary-fixed text-on-secondary-fixed",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-error-container text-on-error-container",
};

const LEVEL_LABEL: Record<ApiQuestion["level"], string> = {
  X: "Kelas 10",
  XI: "Kelas 11",
  XII: "Kelas 12",
};

// ── Helpers ────────────────────────────────────────────────────────────

function formatDate(dateStr: string): { dayName: string; day: string; month: string } {
  const date = new Date(dateStr + "T00:00:00");
  const dayNames = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return {
    dayName: dayNames[date.getDay()],
    day: String(date.getDate()),
    month: monthNames[date.getMonth()],
  };
}

function formatTimeRange(start: string, end: string): string {
  const s = start.slice(0, 5);
  const e = end.slice(0, 5);
  return `${s} - ${e}`;
}

function parseJsonArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function inferLevelsFromClasses(value: string): ApiQuestion["level"][] {
  const levels = new Set<ApiQuestion["level"]>();
  for (const item of value.split(",").map((part) => part.trim().toLowerCase())) {
    if (!item) continue;
    if (item.startsWith("xii") || item.includes("kelas 12")) levels.add("XII");
    else if (item.startsWith("xi") || item.includes("kelas 11")) levels.add("XI");
    else if (item.startsWith("x") || item.includes("kelas 10")) levels.add("X");
  }
  return Array.from(levels);
}

function formatKelasGroup(level: ApiQuestion["level"], major: string): string {
  const cleanMajor = major.trim();
  return cleanMajor ? `${level} ${cleanMajor}` : level;
}

// ── DateBox Component ──────────────────────────────────────────────────

function DateBox({ dateStr, compact = false }: { dateStr: string; compact?: boolean }) {
  const { dayName, day, month } = formatDate(dateStr);
  return (
    <div
      className={`${
        compact ? "min-w-[100px]" : "min-w-[120px]"
      } flex flex-row md:flex-col gap-2 md:gap-1 items-start md:items-center justify-between md:justify-center p-2 md:p-3 bg-surface-bright border border-outline-variant rounded-lg`}
    >
      <div className="text-center">
        <div className="font-label-caps text-label-caps text-primary uppercase">{dayName}</div>
        <div className="font-headline-md text-headline-md text-on-surface">
          {day} {month}
        </div>
      </div>
      <div className="h-8 w-px bg-outline-variant hidden md:block my-1" />
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────

export default function JadwalPage() {
  const router = useRouter();
  const dashboardUser = useDashboardUser();
  const [sessionUser, setSessionUser] = useState<ReturnType<typeof getSession>>(null);
  const user = dashboardUser ?? sessionUser;
  const isSiswa = user?.role === "siswa";
  const canEdit = user?.role === "admin" || user?.role === "guru";

  const [view, setView] = useState<ViewMode>("daftar");
  const [schedules, setSchedules] = useState<JadwalItem[]>([]);
  const [questions, setQuestions] = useState<ApiQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<number[]>([]);
  const [selectedPackageKey, setSelectedPackageKey] = useState("");
  const [kelasList, setKelasList] = useState<KelasOption[]>([]);
  const [kelasLoading, setKelasLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal states
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JadwalItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleting, setDeleting] = useState<JadwalItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch data from API ────────────────────────────────────────────

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/jadwal?limit=100");
      if (!res.ok) throw new Error("Gagal memuat data");
      const data = await res.json();
      setSchedules(data.data ?? []);
    } catch (err) {
      console.error("Fetch error:", err);
      setToast("Gagal memuat data jadwal ujian.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSessionUser(getSession());
    fetchSchedules();
  }, [fetchSchedules]);

  const fetchQuestions = useCallback(async () => {
    try {
      setQuestionsLoading(true);
      const res = await fetch("/api/questions?limit=1000&status=published");
      if (!res.ok) throw new Error("Gagal memuat bank soal");
      const data = await res.json();
      setQuestions(data.data ?? []);
    } catch (err) {
      console.error("Fetch questions error:", err);
      setToast("Gagal memuat Bank Soal.");
    } finally {
      setQuestionsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canEdit) fetchQuestions();
  }, [canEdit, fetchQuestions]);

  const fetchKelas = useCallback(async () => {
    try {
      setKelasLoading(true);
      const res = await fetch("/api/kelas");
      if (!res.ok) throw new Error("Gagal memuat kelas");
      const data = await res.json();
      setKelasList(data.kelas ?? []);
    } catch (err) {
      console.error("Fetch kelas error:", err);
      setToast("Gagal memuat data kelas.");
    } finally {
      setKelasLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canEdit) fetchKelas();
  }, [canEdit, fetchKelas]);

  // Toast timer cleanup
  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  }

  // ── Filter logic ───────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return schedules.filter((s) => {
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.room.toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [schedules, searchQuery, statusFilter]);

  const questionPackages = useMemo(() => {
    const groups = new Map<string, QuestionPackage>();
    for (const question of questions) {
      const key = `${question.subject}|||${question.level}`;
      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          key,
          subject: question.subject,
          level: question.level,
          questions: [question],
          multipleChoice: question.question_type === "multiple_choice" ? 1 : 0,
          essay: question.question_type === "essay" ? 1 : 0,
        });
        continue;
      }
      existing.questions.push(question);
      existing.multipleChoice += question.question_type === "multiple_choice" ? 1 : 0;
      existing.essay += question.question_type === "essay" ? 1 : 0;
    }
    return Array.from(groups.values()).sort(
      (a, b) => a.subject.localeCompare(b.subject) || a.level.localeCompare(b.level)
    );
  }, [questions]);

  const kelasGroups = useMemo(() => {
    const groups = new Map<string, KelasGroupOption>();
    for (const kelas of kelasList) {
      const major = kelas.major.trim();
      const key = `${kelas.level}|||${major.toLowerCase()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.studentCount += kelas.student_count;
        continue;
      }
      groups.set(key, {
        key,
        label: formatKelasGroup(kelas.level, major),
        level: kelas.level,
        major,
        studentCount: kelas.student_count,
      });
    }
    return Array.from(groups.values()).sort(
      (a, b) => a.level.localeCompare(b.level) || a.major.localeCompare(b.major)
    );
  }, [kelasList]);

  const filteredQuestionPackages = useMemo(() => {
    const levels = inferLevelsFromClasses(form.class_names);
    return questionPackages.filter((pkg) => {
      const selected = pkg.key === selectedPackageKey;
      const matchLevel = levels.length === 0 || levels.includes(pkg.level);
      return selected || matchLevel;
    });
  }, [form.class_names, questionPackages, selectedPackageKey]);

  const selectedPackage = questionPackages.find((pkg) => pkg.key === selectedPackageKey);

  // ── Form handlers ──────────────────────────────────────────────────

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedQuestionIds([]);
    setSelectedPackageKey("");
    setFormError(null);
    setFormOpen(true);
  }

  async function openEdit(item: JadwalItem) {
    setEditing(item);
    let questionIds = item.question_ids ?? [];
    if (questionIds.length === 0) {
      try {
        const res = await fetch(`/api/jadwal/${item.id}`);
        if (res.ok) {
          const data = await res.json();
          questionIds = data.question_ids ?? [];
        }
      } catch (err) {
        console.error("Fetch schedule detail error:", err);
      }
    }
    const classNames = parseJsonArray(item.class_names).join(", ");
    const supervisors = parseJsonArray(item.supervisors).join(", ");
    setForm({
      title: item.title,
      subject: item.subject,
      exam_type: item.exam_type,
      exam_date: item.exam_date,
      start_time: item.start_time.slice(0, 5),
      end_time: item.end_time.slice(0, 5),
      room: item.room,
      class_names: classNames,
      supervisors: supervisors,
      status: item.status,
      notes: item.notes ?? "",
    });
    setSelectedQuestionIds(questionIds);
    const matchedPackage = questionPackages.find((pkg) => {
      const ids = pkg.questions.map((question) => question.id).sort((a, b) => a - b);
      const selectedIds = [...questionIds].sort((a, b) => a - b);
      return ids.length === selectedIds.length && ids.every((id, idx) => id === selectedIds[idx]);
    });
    setSelectedPackageKey(matchedPackage?.key ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  function validate(): string | null {
    if (!form.title.trim()) return "Judul ujian wajib diisi.";
    if (!form.subject.trim()) return "Mata pelajaran wajib diisi.";
    if (!form.exam_date) return "Tanggal ujian wajib diisi.";
    if (!form.start_time) return "Jam mulai wajib diisi.";
    if (!form.end_time) return "Jam selesai wajib diisi.";
    if (!form.room.trim()) return "Ruangan wajib diisi.";
    if (!form.class_names.trim()) return "Kelas wajib diisi.";
    if (!form.supervisors.trim()) return "Pengawas wajib diisi.";
    if (selectedQuestionIds.length === 0) return "Pilih minimal 1 soal dari Bank Soal.";
    if (form.end_time <= form.start_time) return "Jam selesai harus lebih besar dari jam mulai.";
    return null;
  }

  function selectPackage(pkg: QuestionPackage) {
    setSelectedPackageKey(pkg.key);
    setSelectedQuestionIds(pkg.questions.map((question) => question.id));
    setForm((prev) => ({
      ...prev,
      subject: pkg.subject,
    }));
  }

  function selectedClasses(): string[] {
    return form.class_names.split(",").map((c) => c.trim()).filter(Boolean);
  }

  function toggleKelas(label: string) {
    const current = selectedClasses();
    const next = current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label];
    setForm((prev) => ({ ...prev, class_names: next.join(", ") }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }

    const session = getSession();
    if (!session) {
      setToast("Sesi habis, silakan login kembali.");
      return;
    }

    const payload = {
      title: form.title.trim(),
      subject: form.subject.trim(),
      exam_type: form.exam_type,
      exam_date: form.exam_date,
      start_time: form.start_time.length === 5 ? form.start_time + ":00" : form.start_time,
      end_time: form.end_time.length === 5 ? form.end_time + ":00" : form.end_time,
      room: form.room.trim(),
      class_names: form.class_names.split(",").map((c) => c.trim()).filter(Boolean),
      supervisors: form.supervisors.split(",").map((s) => s.trim()).filter(Boolean),
      status: form.status,
      notes: form.notes.trim() || null,
      created_by: session.id,
      question_ids: selectedQuestionIds,
    };

    try {
      setSubmitting(true);
      let res: Response;

      if (editing) {
        res = await fetch(`/api/jadwal/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/jadwal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || "Terjadi kesalahan.");
        return;
      }

      showToast(editing ? "Jadwal berhasil diperbarui." : "Jadwal berhasil dibuat.");
      setFormOpen(false);
      fetchSchedules();
    } catch (error) {
      console.error("Submit error:", error);
      setFormError("Gagal menyimpan data. Periksa koneksi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/jadwal/${deleting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Gagal menghapus jadwal.");
        return;
      }
      showToast("Jadwal berhasil dihapus.");
      setDeleting(null);
      fetchSchedules();
    } catch (error) {
      console.error("Delete error:", error);
      showToast("Gagal menghapus jadwal.");
    }
  }

  // ── Input styles ───────────────────────────────────────────────────

  const inputClass =
    "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 font-body-sm text-body-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all";
  const labelClass = "font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5";

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <DashboardLayout active="jadwal">
      <div className="max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-stack-lg">
          <div>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
              Jadwal Ujian
            </h1>
            <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant">
              {isSiswa
                ? "Berikut jadwal ujian kamu minggu ini."
                : "Kelola jadwal ujian, alokasi waktu, dan pengawas."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isSiswa && (
              <>
                <div className="flex bg-surface-container-low rounded-lg p-1 border border-outline-variant">
                  <button
                    onClick={() => setView("kalender")}
                    className={`px-3 md:px-4 py-2 rounded-md font-title-sm text-title-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
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
                    className={`px-3 md:px-4 py-2 rounded-md font-title-sm text-title-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95 ${
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
              </>
            )}
            <span className="font-body-sm text-body-sm text-on-surface-variant hidden sm:inline">
              {filtered.length} jadwal
            </span>
          </div>
        </div>

        {/* Admin/Guru Toolbar */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4 md:mb-stack-lg">
            <div className="flex-1 relative">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari jadwal..."
                className="w-full pl-9 md:pl-10 pr-4 py-2 md:py-2.5 bg-surface-container-high rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-surface-container-low border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 font-body-sm text-body-sm focus:ring-2 focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="all">Semua Status</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button
              onClick={openAdd}
              className="bg-primary text-on-primary px-4 md:px-6 py-2.5 rounded-lg font-title-sm text-title-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors shadow-sm min-h-[44px] cursor-pointer active:scale-95"
            >
              <Icon name="add" size={20} />
              <span className="hidden sm:inline">Tambah Jadwal</span>
              <span className="sm:hidden">Baru</span>
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-8 md:p-12 text-center">
            <Icon name="event_busy" size={40} className="text-outline mx-auto mb-3" />
            <p className="font-title-sm text-title-sm text-on-surface">Tidak ada jadwal ujian</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {canEdit ? "Klik \"Tambah Jadwal\" untuk membuat jadwal baru." : "Belum ada jadwal ujian yang tersedia."}
            </p>
          </div>
        )}

        {/* Tampilan Siswa */}
        {!loading && isSiswa && filtered.length > 0 && (
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-outline-variant bg-surface-bright flex items-center justify-between">
              <span className="font-title-sm text-title-sm text-on-surface">
                Jadwal Ujian Terdekat
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {filtered.length} jadwal aktif
              </span>
            </div>
            {filtered.map((s) => {
              const classNames = parseJsonArray(s.class_names).join(", ");
              const supervisors = parseJsonArray(s.supervisors).join(", ");
              return (
                <div key={s.id} className="p-4 md:p-6 hover:bg-surface-container-low transition-colors border-b border-outline-variant last:border-b-0">
                  <div className="flex flex-col md:flex-row gap-4 md:items-center">
                    <DateBox dateStr={s.exam_date} compact />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-1 rounded text-[11px] font-semibold uppercase tracking-wider ${STATUS_BADGE[s.status]}`}>
                          {s.exam_type}
                        </span>
                        <h3 className="font-title-sm text-title-sm text-on-surface font-bold">{s.title}</h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[s.status]}`}>
                          {STATUS_LABEL[s.status]}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-3 md:gap-4">
                        <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                          <Icon name="schedule" size={16} />
                          {formatTimeRange(s.start_time, s.end_time)}
                        </span>
                        <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                          <Icon name="school" size={16} />
                          {classNames}
                        </span>
                        <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                          <Icon name="meeting_room" size={16} />
                          {s.room}
                        </span>
                        <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                          <Icon name="quiz" size={16} />
                          {s.question_count ?? 0} soal
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-label-caps text-label-caps text-on-surface-variant">PENGAWAS:</span>
                        <span className="font-body-sm text-body-sm text-on-surface">{supervisors}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/ujian?scheduleId=${s.id}`)}
                      className="inline-flex items-center justify-center gap-2 bg-primary text-on-primary font-title-sm text-title-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 active:scale-95 transition-all shadow-sm min-h-[44px] cursor-pointer"
                    >
                      Mulai Ujian
                      <Icon name="arrow_forward" size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tampilan Admin/Guru: List View */}
        {!loading && canEdit && view === "daftar" && filtered.length > 0 && (
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="divide-y divide-outline-variant">
              {filtered.map((s) => {
                const classNames = parseJsonArray(s.class_names).join(", ");
                const supervisors = parseJsonArray(s.supervisors).join(", ");
                return (
                  <div key={s.id} className="p-4 hover:bg-surface-container-low transition-colors group">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center">
                      <DateBox dateStr={s.exam_date} />
                      <div className="flex-1 flex flex-col gap-2 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-1 bg-secondary-fixed text-on-secondary-fixed rounded text-[11px] font-semibold uppercase tracking-wider">
                            {s.exam_type}
                          </span>
                          <h3 className="font-title-sm text-title-sm text-on-surface font-bold truncate">{s.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_BADGE[s.status]}`}>
                            {STATUS_LABEL[s.status]}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 md:gap-4">
                          <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                            <Icon name="schedule" size={16} />
                            {formatTimeRange(s.start_time, s.end_time)}
                          </span>
                          <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                            <Icon name="school" size={16} />
                            {classNames}
                          </span>
                          <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                            <Icon name="meeting_room" size={16} />
                            {s.room}
                          </span>
                          <span className="flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant">
                            <Icon name="quiz" size={16} />
                            {s.question_count ?? 0} soal
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-label-caps text-label-caps text-on-surface-variant">PENGAWAS:</span>
                          <span className="font-body-sm text-body-sm text-on-surface">{supervisors}</span>
                        </div>
                      </div>
                      <div className="flex flex-row md:flex-col gap-2 mt-2 md:mt-0">
                        <button
                          onClick={() => openEdit(s)}
                          className="px-3 py-2 border border-outline-variant rounded-lg font-title-sm text-title-sm text-primary hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95 flex items-center gap-1"
                        >
                          <Icon name="edit" size={16} />
                          <span className="hidden md:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => setDeleting(s)}
                          className="p-2 border border-outline-variant rounded-lg text-on-surface-variant hover:text-error hover:border-error hover:bg-error-container transition-colors cursor-pointer active:scale-95"
                          aria-label={`Hapus jadwal ${s.title}`}
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tampilan Admin/Guru: Calendar View */}
        {!loading && canEdit && view === "kalender" && filtered.length > 0 && (
          <div className="bg-surface border border-outline-variant rounded-xl shadow-sm p-4 md:p-6">
            <div className="mb-4">
              <h3 className="font-title-sm text-title-sm text-on-surface font-semibold">Kalender Ujian</h3>
            </div>
            <div className="space-y-3">
              {filtered.map((s) => {
                const classNames = parseJsonArray(s.class_names).join(", ");
                const { dayName, day, month } = formatDate(s.exam_date);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors cursor-pointer"
                    onClick={() => openEdit(s)}
                  >
                    <div className="w-14 h-14 bg-primary-fixed-dim rounded-lg flex flex-col items-center justify-center text-on-primary-fixed shrink-0">
                      <span className="font-headline-md text-headline-md font-bold leading-none">{day}</span>
                      <span className="font-label-caps text-label-caps text-[10px]">{month}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-title-sm text-title-sm text-on-surface truncate">{s.title}</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-2 flex-wrap">
                        <span>{dayName}</span>
                        <span className="text-outline">•</span>
                        <span>{formatTimeRange(s.start_time, s.end_time)}</span>
                        <span className="text-outline">•</span>
                        <span>{classNames}</span>
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold ${STATUS_BADGE[s.status]}`}>
                      {STATUS_LABEL[s.status]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ===== Modal Tambah/Edit ===== */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setFormOpen(false)}
        >
          <div className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm" />
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-4 md:p-6 pb-3 md:pb-4 border-b border-outline-variant">
              <div>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  {editing ? "Edit Jadwal Ujian" : "Tambah Jadwal Ujian"}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {editing ? "Perbarui data jadwal ujian." : "Isi data jadwal ujian baru."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4">
              <div>
                <label className={labelClass}>Judul Ujian</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="contoh: Ujian Akhir Semester"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Mata Pelajaran</label>
                  <input
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="contoh: Matematika"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Jenis Ujian</label>
                  <select
                    value={form.exam_type}
                    onChange={(e) => setForm({ ...form, exam_type: e.target.value as ExamType })}
                    className={`${inputClass} cursor-pointer`}
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Tanggal Ujian</label>
                <input
                  type="date"
                  value={form.exam_date}
                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Jam Mulai</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Jam Selesai</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Ruangan</label>
                <input
                  value={form.room}
                  onChange={(e) => setForm({ ...form, room: e.target.value })}
                  placeholder="contoh: Lab Komputer A"
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className={labelClass}>Kelas</label>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {selectedClasses().length} dipilih
                  </span>
                </div>
                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden">
                  <div className="max-h-44 overflow-y-auto divide-y divide-outline-variant/50">
                    {kelasLoading && (
                      <div className="p-4 font-body-sm text-body-sm text-on-surface-variant">
                        Memuat kelas...
                      </div>
                    )}
                    {!kelasLoading && kelasGroups.length === 0 && (
                      <div className="p-4 font-body-sm text-body-sm text-on-surface-variant">
                        Belum ada data kelas. Tambahkan kelas terlebih dahulu di menu Kelas.
                      </div>
                    )}
                    {!kelasLoading && kelasGroups.map((kelas) => {
                      const selected = selectedClasses().includes(kelas.label);
                      return (
                        <label
                          key={kelas.key}
                          className="flex items-center gap-3 p-3 hover:bg-surface-container-low cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleKelas(kelas.label)}
                            className="h-4 w-4 rounded border-outline text-primary focus:ring-primary"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block font-title-sm text-title-sm text-on-surface">
                              {kelas.label}
                            </span>
                            <span className="block font-body-sm text-body-sm text-on-surface-variant">
                              {kelas.studentCount} siswa
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Pengawas (pisahkan koma)</label>
                <input
                  value={form.supervisors}
                  onChange={(e) => setForm({ ...form, supervisors: e.target.value })}
                  placeholder="contoh: Budi Santoso, Siti Aminah"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ExamStatus })}
                  className={`${inputClass} cursor-pointer`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className={labelClass}>Paket Soal dari Bank Soal</label>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {selectedPackage ? `${selectedPackage.questions.length} soal` : `${selectedQuestionIds.length} soal`}
                  </span>
                </div>
                <div className="rounded-lg border border-outline-variant bg-surface-container-lowest overflow-hidden">
                  <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/50">
                    {questionsLoading && (
                      <div className="p-4 font-body-sm text-body-sm text-on-surface-variant">
                        Memuat paket soal...
                      </div>
                    )}
                    {!questionsLoading && filteredQuestionPackages.length === 0 && (
                      <div className="p-4 font-body-sm text-body-sm text-on-surface-variant">
                        Tidak ada paket soal published yang cocok dengan mata pelajaran dan kelas.
                      </div>
                    )}
                    {!questionsLoading && filteredQuestionPackages.map((pkg) => {
                      const selected = selectedPackageKey === pkg.key;
                      return (
                        <button
                          type="button"
                          key={pkg.key}
                          onClick={() => selectPackage(pkg)}
                          className="flex items-start gap-3 p-3 hover:bg-surface-container-low cursor-pointer"
                        >
                          <span
                            className={`mt-1 h-4 w-4 rounded-full border-2 shrink-0 ${
                              selected ? "border-primary bg-primary" : "border-outline"
                            }`}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-left font-title-sm text-title-sm text-on-surface">
                              {pkg.subject} - {LEVEL_LABEL[pkg.level]}
                            </span>
                            <span className="mt-1 flex flex-wrap gap-2 text-left font-body-sm text-body-sm text-on-surface-variant">
                              <span>{pkg.questions.length} soal published</span>
                              <span>{pkg.multipleChoice} PG</span>
                              <span>{pkg.essay} Essay</span>
                              <span>{Array.from(new Set(pkg.questions.map((question) => question.author_name))).slice(0, 2).join(", ")}</span>
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {!selectedPackage && selectedQuestionIds.length > 0 && (
                  <p className="mt-2 font-body-sm text-body-sm text-on-surface-variant">
                    Jadwal ini memakai pilihan soal lama. Pilih paket untuk mengganti semua soal dari grup Bank Soal.
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Catatan (opsional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan tambahan..."
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {formError && (
                <p className="flex items-center gap-2 font-body-sm text-body-sm text-error bg-error-container/50 rounded-lg px-3 py-2">
                  <Icon name="error" size={16} filled />
                  {formError}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 p-4 md:p-6 pt-2 md:pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="px-4 md:px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container font-label-caps text-label-caps transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 md:px-6 py-2.5 rounded-lg bg-primary text-on-primary font-label-caps text-label-caps hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editing ? "Simpan Perubahan" : "Tambah Jadwal"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== Modal Konfirmasi Hapus ===== */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setDeleting(null)}
        >
          <div className="absolute inset-0 bg-inverse-surface/50 backdrop-blur-sm" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-surface rounded-xl shadow-xl border border-outline-variant w-full max-w-sm p-6 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto mb-4">
              <Icon name="delete" size={28} filled />
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Hapus Jadwal?</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
              Jadwal &quot;{deleting.title}&quot; akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container font-label-caps text-label-caps transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-5 py-2.5 rounded-lg bg-error text-on-error font-label-caps text-label-caps hover:bg-error/90 transition-colors cursor-pointer"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Toast ===== */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[60] flex items-center gap-2 bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-lg shadow-xl font-body-sm text-body-sm"
        >
          <Icon name="check_circle" size={18} filled className="text-inverse-primary" />
          {toast}
        </div>
      )}
    </DashboardLayout>
  );
}
