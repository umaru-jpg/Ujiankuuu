"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { getSession, HOME_BY_ROLE, type User } from "@/lib/auth";

interface ExamSchedule {
  id: number;
  title: string;
  subject: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
}

interface ExamQuestion {
  id: number;
  question_type: "multiple_choice" | "essay";
  prompt: string;
  options: { id: number; option_text: string; sort_order: number }[];
}

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function UjianPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [schedule, setSchedule] = useState<ExamSchedule | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState(1);
  const [answers, setAnswers] = useState<Record<number, { option_id?: number; answer_text?: string }>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    if (session.role !== "siswa") {
      router.replace(HOME_BY_ROLE[session.role]);
      return;
    }
    const activeSession = session;

    const scheduleId = new URLSearchParams(window.location.search).get("scheduleId");
    if (!scheduleId) {
      setError("Pilih jadwal ujian terlebih dahulu dari dashboard atau menu Jadwal.");
      setUser(session);
      setReady(true);
      return;
    }

    async function fetchExam() {
      try {
        const res = await fetch(`/api/ujian/${scheduleId}?userId=${activeSession.id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.message || "Ujian belum bisa dibuka.");
          return;
        }

        setSchedule(data.schedule);
        setQuestions(data.questions ?? []);
        setSecondsLeft(data.schedule.duration_seconds ?? 0);
      } catch (err) {
        console.error("Fetch ujian error:", err);
        setError("Gagal membuka ujian. Periksa koneksi backend.");
      } finally {
        setUser(activeSession);
        setReady(true);
      }
    }

    fetchExam();
  }, [router]);

  useEffect(() => {
    if (!ready || error || submitted || questions.length === 0) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
      setSecondsLeft((s) => {
        if (s <= 1 && timerRef.current) clearInterval(timerRef.current);
        return s > 0 ? s - 1 : 0;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ready, error, submitted, questions.length]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const q = questions[current - 1];
  const selectedAnswer = q ? answers[q.id] : undefined;
  const isFlagged = flagged.has(current);

  function selectOption(questionId: number, optionId: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: { option_id: optionId } }));
  }

  function setEssayAnswer(questionId: number, answerText: string) {
    setAnswers((prev) => {
      const next = { ...prev };
      if (answerText.trim()) next[questionId] = { answer_text: answerText };
      else delete next[questionId];
      return next;
    });
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      return next;
    });
  }

  function navClass(n: number, questionId: number) {
    const base =
      "w-10 h-10 rounded flex items-center justify-center font-title-sm text-title-sm shadow-sm transition-all duration-150 active:scale-90 cursor-pointer";
    if (n === current) return `${base} border-2 border-primary bg-primary-fixed text-on-primary-fixed ring-2 ring-primary-fixed ring-offset-1 scale-110`;
    if (flagged.has(n)) return `${base} bg-secondary text-on-secondary hover:opacity-90`;
    if (questionId in answers) return `${base} bg-primary text-on-primary hover:opacity-90`;
    return `${base} border border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container-high`;
  }

  async function submitExam() {
    if (!schedule || !user) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/ujian/${schedule.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          duration_seconds: elapsedSeconds,
          answers: questions.map((question) => ({
            question_id: question.id,
            option_id: answers[question.id]?.option_id ?? null,
            answer_text: answers[question.id]?.answer_text ?? "",
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Gagal mengirim jawaban.");
        setConfirmOpen(false);
        return;
      }

      setSubmitted(true);
      setConfirmOpen(false);
    } catch (err) {
      console.error("Submit ujian error:", err);
      setError("Gagal mengirim jawaban. Periksa koneksi backend.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
        <img src="/logo.png" alt="Ujiankuuu" className="w-16 h-16 object-contain" />
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !schedule || !q) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm max-w-md w-full p-8 text-center">
          <Icon name="lock" size={40} className="text-primary mx-auto mb-4" />
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Ujian Tidak Tersedia</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            {error ?? "Soal ujian tidak tersedia."}
          </p>
          <button
            onClick={() => router.push("/siswa")}
            className="bg-primary text-on-primary font-title-sm text-title-sm py-3 px-6 rounded-lg hover:bg-primary/90 cursor-pointer"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl max-w-md w-full p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-fixed flex items-center justify-center mx-auto mb-6">
            <Icon name="task_alt" size={36} className="text-primary" />
          </div>
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Ujian Terkirim</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            Jawaban Anda untuk {schedule.title} berhasil dikirim.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/siswa")}
              className="px-4 py-3 rounded-lg border border-outline-variant text-on-surface font-title-sm text-title-sm hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95"
            >
              Dashboard
            </button>
            <button
              onClick={() => router.push("/hasil")}
              className="bg-primary text-on-primary font-title-sm text-title-sm font-semibold py-3 rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              Lihat Hasil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface font-body-md text-on-surface overflow-hidden">
      <header className="h-16 shrink-0 flex items-center justify-between px-margin-desktop bg-surface-container-lowest border-b border-outline-variant z-20">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-headline-md text-headline-md font-extrabold text-primary tracking-tight">
            Ujiankuuu
          </span>
          <span className="h-6 w-px bg-outline-variant hidden sm:block" />
          <span className="font-title-sm text-title-sm text-on-surface hidden sm:block truncate">
            {schedule.title}
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Icon name="account_circle" filled className="text-outline" size={28} />
          <span className="font-body-sm text-body-sm text-on-surface-variant font-medium hidden sm:block">
            {user.name} ({user.username})
          </span>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        <aside className="w-[280px] shrink-0 border-r border-outline-variant bg-surface flex-col z-10 hidden lg:flex">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">Navigasi Soal</h2>
            <div className="flex flex-col gap-2 font-body-sm text-body-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span className="text-on-surface-variant">Sudah Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-secondary" />
                <span className="text-on-surface-variant">Ragu-ragu</span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-4 gap-3">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => setCurrent(index + 1)}
                  className={navClass(index + 1, question.id)}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex-1 min-w-0 bg-surface-container-lowest flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-12">
            <div className="max-w-[800px] mx-auto w-full">
              <div className="flex items-center justify-between mb-8 gap-3">
                <h1 className="font-headline-md text-headline-md font-bold text-on-surface">Soal No. {current}</h1>
                <span className="px-3 py-1 bg-surface-container rounded-full font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
                  <Icon name="category" size={16} />
                  {q.question_type === "multiple_choice" ? "Pilihan Ganda" : "Essay"}
                </span>
              </div>

              <div className="font-title-sm text-title-sm text-on-surface leading-relaxed mb-10">{q.prompt}</div>

              {q.question_type === "multiple_choice" ? (
                <div className="flex flex-col gap-4">
                  {q.options.map((opt, i) => {
                    const letter = String.fromCharCode(65 + i);
                    const isSelected = selectedAnswer?.option_id === opt.id;
                    return (
                      <label
                        key={opt.id}
                        className={`group relative flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all hover:bg-surface-container-low hover:shadow-sm active:scale-[0.99] ${
                          isSelected
                            ? "border-2 border-primary bg-primary-fixed shadow-sm"
                            : "border border-outline-variant hover:border-primary"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          checked={isSelected}
                          onChange={() => selectOption(q.id, opt.id)}
                          className="sr-only"
                        />
                        <div
                          className={`w-6 h-6 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "border-primary bg-primary"
                              : "border-outline group-hover:border-primary"
                          }`}
                        >
                          {isSelected && <div className="w-2.5 h-2.5 bg-on-primary rounded-full" />}
                        </div>
                        <div
                          className={`flex-1 font-body-md text-body-md pt-0.5 ${
                            isSelected ? "text-on-primary-fixed font-medium" : "text-on-surface"
                          }`}
                        >
                          <span className="font-bold mr-2">{letter}.</span>
                          {opt.option_text}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={selectedAnswer?.answer_text ?? ""}
                  onChange={(event) => setEssayAnswer(q.id, event.target.value)}
                  rows={8}
                  placeholder="Tulis jawaban Anda..."
                  className="w-full bg-surface border border-outline-variant rounded-xl p-4 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
              <div className="h-12" />
            </div>
          </div>
        </section>

        <aside className="w-[320px] shrink-0 border-l border-outline-variant bg-surface flex-col z-10 hidden xl:flex">
          <div className="p-8 flex flex-col items-center border-b border-outline-variant">
            <div className="flex items-center gap-2 text-on-surface-variant mb-2">
              <Icon name="timer" size={20} />
              <span className="font-label-caps text-label-caps uppercase tracking-wider">Sisa Waktu</span>
            </div>
            <div className="font-display-lg text-display-lg font-bold tabular-nums text-error">
              {formatTime(secondsLeft)}
            </div>
            <div className="font-body-sm text-body-sm text-on-surface-variant mt-2">
              {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)} WIB
            </div>
          </div>
          <div className="p-8 flex-1 flex flex-col">
            <div className="mb-10">
              <div className="flex justify-between items-center mb-3">
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Progres Ujian</span>
                <span className="font-title-sm text-title-sm text-on-surface font-bold">
                  {answeredCount}/{questions.length}
                </span>
              </div>
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <button
              onClick={toggleFlag}
              className={`mt-auto w-full flex items-center justify-center gap-3 px-6 py-4 border-2 rounded-xl transition-all font-title-sm text-title-sm group active:scale-[0.98] cursor-pointer ${
                isFlagged
                  ? "bg-secondary border-secondary text-on-secondary"
                  : "border-secondary text-secondary hover:bg-secondary hover:text-on-secondary"
              }`}
            >
              <Icon name="flag" filled={isFlagged} size={22} />
              {isFlagged ? "Batal Tandai" : "Ragu-ragu / Tandai Soal"}
            </button>
          </div>
        </aside>
      </main>

      <footer className="h-24 shrink-0 bg-surface border-t border-outline-variant flex items-center justify-between px-6 md:px-12 z-20 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
        <button
          onClick={() => setCurrent((c) => Math.max(1, c - 1))}
          disabled={current === 1}
          className="flex items-center gap-2 px-6 py-3.5 border border-outline rounded-lg text-on-surface font-title-sm text-title-sm hover:bg-surface-container-high transition-colors active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="arrow_back" size={20} />
          <span className="hidden sm:inline">Soal Sebelumnya</span>
          <span className="sm:hidden">Kembali</span>
        </button>

        <div className="flex xl:hidden flex-col items-center">
          <span className="font-title-sm text-title-sm text-error font-bold tabular-nums">{formatTime(secondsLeft)}</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant">{answeredCount}/{questions.length} Dijawab</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrent((c) => Math.min(questions.length, c + 1))}
            disabled={current === questions.length}
            className="flex items-center gap-2 px-8 py-3.5 bg-primary text-on-primary rounded-lg font-title-sm text-title-sm hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Soal Selanjutnya</span>
            <span className="sm:hidden">Lanjut</span>
            <Icon name="arrow_forward" size={20} />
          </button>
          <div className="w-px h-10 bg-outline-variant mx-2 hidden md:block" />
          <button
            onClick={() => setConfirmOpen(true)}
            disabled={submitting || secondsLeft === 0}
            className="flex items-center gap-2 px-6 py-3.5 bg-error text-on-error rounded-lg font-title-sm text-title-sm font-bold hover:opacity-90 transition-opacity shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="check_circle" filled size={20} />
            <span className="hidden md:inline">Submit Ujian</span>
            <span className="md:hidden">Submit</span>
          </button>
        </div>
      </footer>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/50 backdrop-blur-sm p-4"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-outline-variant flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container flex items-center justify-center shrink-0">
                <Icon name="warning" className="text-on-error-container" size={22} />
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">Submit Ujian?</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Pastikan semua jawaban sudah diisi sebelum mengirim.
                </p>
              </div>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Sudah dijawab</span>
                <span className="font-title-sm text-title-sm text-on-surface font-bold">{answeredCount} soal</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Belum dijawab</span>
                <span className="font-title-sm text-title-sm text-error font-bold">{questions.length - answeredCount} soal</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                disabled={submitting}
                className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface font-title-sm text-title-sm hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95 disabled:opacity-50"
              >
                Lanjut Mengerjakan
              </button>
              <button
                onClick={submitExam}
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg bg-error text-on-error font-title-sm text-title-sm font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {submitting ? "Mengirim..." : "Ya, Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
