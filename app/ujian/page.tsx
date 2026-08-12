"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { getSession, HOME_BY_ROLE, type User } from "@/lib/auth";

/** 20 soal mock (frontend-only). */
interface Question {
  id: number;
  text: string;
  options: string[];
}

const QUESTION_BANK: Omit<Question, "id">[] = [
  {
    text: "Perhatikan struktur organel sel yang ditunjukkan pada gambar di atas. Organel yang ditandai dengan label huruf X berfungsi utama dalam proses respirasi seluler untuk menghasilkan ATP. Berdasarkan karakteristik strukturalnya, apakah nama organel tersebut dan membran mana yang mengalami pelipatan membentuk krista?",
    options: [
      "Ribosom; membran luar",
      "Badan Golgi; tidak memiliki membran rangkap",
      "Mitokondria; membran dalam",
      "Kloroplas; membran dalam",
      "Retikulum Endoplasma; membran luar",
    ],
  },
  {
    text: "Perhatikan gambar skema siklus Calvin pada reaksi gelap fotosintesis. Senyawa yang berperan sebagai aseptor CO2 pertama pada siklus tersebut adalah…",
    options: [
      "RuBP (Ribulosa bifosfat)",
      "PGA (Asam fosfogliserat)",
      "PGAL (Fosfogliseraldehida)",
      "Glukosa",
      "ATP dan NADPH",
    ],
  },
  {
    text: "Pada pembelahan meiosis, peristiwa pindah silang (crossing over) menyebabkan terjadinya pertukaran materi genetik. Pada tahap apakah proses tersebut terjadi?",
    options: [
      "Profase I",
      "Metafase I",
      "Anafase I",
      "Profase II",
      "Metafase II",
    ],
  },
  {
    text: "Jika seorang laki-laki bergolongan darah A heterozigot menikah dengan perempuan bergolongan darah B heterozigot, maka kemungkinan anak mereka bergolongan darah O adalah…",
    options: [
      "0%",
      "25%",
      "50%",
      "75%",
      "100%",
    ],
  },
  {
    text: "Perhatikan jaring-jaring makanan pada ekosistem sawah berikut: padi → tikus → ular → elang. Apabila populasi ular menurun drastis akibat perburuan, dampak yang paling mungkin terjadi adalah…",
    options: [
      "Populasi tikus meningkat, elang menurun",
      "Populasi padi meningkat",
      "Populasi elang meningkat",
      "Populasi tikus menurun",
      "Tidak ada perubahan populasi",
    ],
  },
];

const QUESTIONS: Question[] = Array.from({ length: 20 }, (_, i) => {
  const base = QUESTION_BANK[i % QUESTION_BANK.length];
  return { id: i + 1, ...base };
});

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export default function UjianPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [current, setCurrent] = useState(14); // mulai di soal 14 sesuai desain
  const [answers, setAnswers] = useState<Record<number, number>>({ 1: 0, 2: 1, 4: 2, 5: 3, 7: 4 });
  const [flagged, setFlagged] = useState<Set<number>>(new Set([3, 8]));
  const [secondsLeft, setSecondsLeft] = useState(1 * 3600 + 42 * 60 + 15);
  const [submitted, setSubmitted] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Guard role: hanya siswa
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
    setUser(session);
    setReady(true);
  }, [router]);

  // Countdown
  useEffect(() => {
    if (submitted) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1 && timerRef.current) clearInterval(timerRef.current);
        return s > 0 ? s - 1 : 0;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [submitted]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const progress = Math.round((answeredCount / QUESTIONS.length) * 100);

  const q = QUESTIONS[current - 1];
  const isFlagged = flagged.has(current);
  const selected = answers[current];

  function selectAnswer(optionIndex: number) {
    setAnswers((prev) => ({ ...prev, [current]: optionIndex }));
  }

  function toggleFlag() {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current)) next.delete(current);
      else next.add(current);
      return next;
    });
  }

  function navClass(n: number) {
    const base =
      "w-10 h-10 rounded flex items-center justify-center font-title-sm text-title-sm shadow-sm transition-all duration-150 active:scale-90 cursor-pointer";
    if (n === current) {
      return `${base} border-2 border-primary bg-primary-fixed text-on-primary-fixed ring-2 ring-primary-fixed ring-offset-1 scale-110`;
    }
    if (flagged.has(n)) return `${base} bg-secondary text-on-secondary hover:opacity-90`;
    if (n in answers) return `${base} bg-primary text-on-primary hover:opacity-90`;
    return `${base} border border-outline bg-surface-container-lowest text-on-surface hover:bg-surface-container-high`;
  }

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-surface">
        <img src="/logo.png" alt="Ujiankuuu" className="w-16 h-16 object-contain" />
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
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
          <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Ujian Terkirim! 🎉</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">
            Jawaban Anda untuk Ujian Akhir Semester: Biologi Kelas XI telah berhasil dikirim.
          </p>
          <div className="flex items-center justify-center gap-6 mb-8">
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Dijawab</p>
              <p className="font-headline-md text-headline-md text-primary">{answeredCount}/{QUESTIONS.length}</p>
            </div>
            <div className="w-px h-10 bg-outline-variant" />
            <div>
              <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">Ditandai</p>
              <p className="font-headline-md text-headline-md text-on-surface">{flagged.size}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/siswa")}
              className="px-4 py-3 rounded-lg border border-outline-variant text-on-surface font-title-sm text-title-sm hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95"
            >
              Kembali ke Dashboard
            </button>
            <button
              onClick={() => router.push("/hasil")}
              className="bg-primary text-on-primary font-title-sm text-title-sm font-semibold py-3 rounded-lg hover:bg-primary-container transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              Lihat Hasil Ujian
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-surface font-body-md text-on-surface overflow-hidden">
      {/* ===== Minimal Header ===== */}
      <header className="h-16 shrink-0 flex items-center justify-between px-margin-desktop bg-surface-container-lowest border-b border-outline-variant z-20">
        <div className="flex items-center gap-4 min-w-0">
          <span className="font-headline-md text-headline-md font-extrabold text-primary tracking-tight">
            Ujiankuuu
          </span>
          <span className="h-6 w-px bg-outline-variant hidden sm:block" />
          <span className="font-title-sm text-title-sm text-on-surface hidden sm:block truncate">
            Ujian Akhir Semester: Biologi Kelas XI
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Icon name="account_circle" filled className="text-outline" size={28} />
          <span className="font-body-sm text-body-sm text-on-surface-variant font-medium hidden sm:block">
            {user.name} ({user.username})
          </span>
        </div>
      </header>

      {/* ===== Main Workspace ===== */}
      <main className="flex-1 flex overflow-hidden">
        {/* ---- Left: Navigator ---- */}
        <aside className="w-[280px] shrink-0 border-r border-outline-variant bg-surface flex flex-col z-10 hidden lg:flex">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-4">Navigasi Soal</h2>
            <div className="flex flex-col gap-2 font-body-sm text-body-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span className="text-on-surface-variant">Sudah Dijawab</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-secondary" />
                <span className="text-on-surface-variant">Ragu-ragu (Ditandai)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-outline bg-surface-container-lowest" />
                <span className="text-on-surface-variant">Belum Dijawab</span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-4 gap-3">
              {QUESTIONS.map((question) => (
                <button
                  key={question.id}
                  onClick={() => setCurrent(question.id)}
                  className={navClass(question.id)}
                >
                  {question.id}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ---- Center: Question ---- */}
        <section className="flex-1 min-w-0 bg-surface-container-lowest flex flex-col relative overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-12">
            <div className="max-w-[800px] mx-auto w-full">
              <div className="flex items-center justify-between mb-8">
                <h1 className="font-headline-md text-headline-md font-bold text-on-surface">Soal No. {current}</h1>
                <span className="px-3 py-1 bg-surface-container rounded-full font-label-caps text-label-caps text-on-surface-variant flex items-center gap-1">
                  <Icon name="category" size={16} />
                  Pilihan Ganda
                </span>
              </div>

              {/* Placeholder diagram */}
              <div className="w-full h-56 md:h-72 rounded-xl overflow-hidden mb-8 border border-outline-variant bg-surface-container-lowest relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 via-surface-container-low to-primary-fixed/20">
                  <div className="flex flex-col items-center gap-3 opacity-60">
                    <Icon name="biotech" size={64} className="text-primary" />
                    <span className="font-label-caps text-label-caps text-on-surface-variant">
                      Diagram / Gambar Soal (placeholder)
                    </span>
                  </div>
                </div>
              </div>

              <div className="font-title-sm text-title-sm text-on-surface leading-relaxed mb-10">{q.text}</div>

              {/* Options */}
              <div className="flex flex-col gap-4">
                {q.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = selected === i;
                  return (
                    <label
                      key={i}
                      className={`group relative flex items-start gap-4 p-5 rounded-xl border cursor-pointer transition-all hover:bg-surface-container-low hover:shadow-sm active:scale-[0.99] ${
                        isSelected
                          ? "border-2 border-primary bg-primary-fixed shadow-sm"
                          : "border border-outline-variant hover:border-primary"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${current}`}
                        checked={isSelected}
                        onChange={() => selectAnswer(i)}
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
                        {opt}
                      </div>
                    </label>
                  );
                })}
              </div>
              <div className="h-12" />
            </div>
          </div>
        </section>

        {/* ---- Right: Status & Tools ---- */}
        <aside className="w-[320px] shrink-0 border-l border-outline-variant bg-surface flex flex-col z-10 hidden xl:flex">
          <div className="p-8 flex flex-col items-center border-b border-outline-variant">
            <div className="flex items-center gap-2 text-on-surface-variant mb-2">
              <Icon name="timer" size={20} />
              <span className="font-label-caps text-label-caps uppercase tracking-wider">Sisa Waktu</span>
            </div>
            <div className="font-display-lg text-display-lg font-bold tabular-nums text-error">
              {formatTime(secondsLeft)}
            </div>
          </div>
          <div className="p-8 flex-1 flex flex-col">
            <div className="mb-10">
              <div className="flex justify-between items-center mb-3">
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">Progres Ujian</span>
                <span className="font-title-sm text-title-sm text-on-surface font-bold">
                  {answeredCount}/{QUESTIONS.length}
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

      {/* ===== Bottom Action Bar ===== */}
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

        {/* Mobile timer/progress */}
        <div className="flex xl:hidden flex-col items-center">
          <span className="font-title-sm text-title-sm text-error font-bold tabular-nums">{formatTime(secondsLeft)}</span>
          <span className="font-label-caps text-label-caps text-on-surface-variant">{answeredCount}/{QUESTIONS.length} Dijawab</span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrent((c) => Math.min(QUESTIONS.length, c + 1))}
            disabled={current === QUESTIONS.length}
            className="flex items-center gap-2 px-8 py-3.5 bg-primary text-on-primary rounded-lg font-title-sm text-title-sm hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Soal Selanjutnya</span>
            <span className="sm:hidden">Lanjut</span>
            <Icon name="arrow_forward" size={20} />
          </button>
          <div className="w-px h-10 bg-outline-variant mx-2 hidden md:block" />
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-2 px-6 py-3.5 bg-error text-on-error rounded-lg font-title-sm text-title-sm font-bold hover:opacity-90 transition-opacity shadow-sm active:scale-95 cursor-pointer"
          >
            <Icon name="check_circle" filled size={20} />
            <span className="hidden md:inline">Submit Ujian</span>
            <span className="md:hidden">Submit</span>
          </button>
        </div>
      </footer>

      {/* ===== Konfirmasi submit ===== */}
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
                <span className="font-title-sm text-title-sm text-error font-bold">{QUESTIONS.length - answeredCount} soal</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low">
                <span className="font-body-sm text-body-sm text-on-surface-variant">Ditandai ragu-ragu</span>
                <span className="font-title-sm text-title-sm text-on-surface font-bold">{flagged.size} soal</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface font-title-sm text-title-sm hover:bg-surface-container-low transition-colors cursor-pointer active:scale-95"
              >
                Lanjut Mengerjakan
              </button>
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setSubmitted(true);
                }}
                className="px-6 py-2.5 rounded-lg bg-error text-on-error font-title-sm text-title-sm font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer active:scale-95"
              >
                Ya, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
