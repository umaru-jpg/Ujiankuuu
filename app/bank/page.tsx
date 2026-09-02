"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";
import Icon from "@/components/Icon";
import { getSession, type User } from "@/lib/auth";
import * as XLSX from "xlsx";

// ── Types ──────────────────────────────────────────────────────────────

type ApiLevel = "X" | "XI" | "XII";
type ApiStatus = "published" | "draft";
type ApiQuestionType = "multiple_choice" | "essay";

interface ApiOption {
  id?: number;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

interface ApiQuestion {
  id: number;
  subject: string;
  level: ApiLevel;
  status: ApiStatus;
  question_type: ApiQuestionType;
  prompt: string;
  author_id: number;
  author_name: string;
  color: string | null;
  options: ApiOption[];
  created_at: string;
  updated_at: string;
}

// Display-level types
type DisplayStatus = "Published" | "Draft";
type DisplayTipe = "Pilihan Ganda" | "Essay";

interface Soal {
  id: number;
  mapel: string;
  kelas: string;
  status: DisplayStatus;
  pertanyaan: string;
  tipe: DisplayTipe;
  penulis: string;
  color: string;
  authorId: number;
  options: ApiOption[];
}

interface SoalGroup {
  key: string;
  mapel: string;
  kelas: string;
  total: number;
  pilihanGanda: number;
  essay: number;
  authors: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────

const LEVEL_MAP: Record<ApiLevel, string> = {
  X: "Kelas 10",
  XI: "Kelas 11",
  XII: "Kelas 12",
};

const LEVEL_OPTIONS: ApiLevel[] = ["X", "XI", "XII"];

const KELAS_FILTERS = ["Semua Kelas", "Kelas 10", "Kelas 11", "Kelas 12"];

const STATUS_FILTERS = ["Semua Status", "Published", "Draft"];

const GURU_COLORS = [
  "from-blue-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-violet-500 to-purple-500",
  "from-rose-500 to-pink-500",
  "from-teal-500 to-cyan-500",
  "from-amber-500 to-orange-500",
];

const DEFAULT_MAPELS = ["Matematika", "Bahasa Indonesia", "Bahasa Inggris", "Fisika"];

const PAGE_SIZE = 8;

function mapApiToDisplay(q: ApiQuestion): Soal {
  return {
    id: q.id,
    mapel: q.subject,
    kelas: LEVEL_MAP[q.level] || q.level,
    status: q.status === "published" ? "Published" : "Draft",
    pertanyaan: q.prompt,
    tipe: q.question_type === "multiple_choice" ? "Pilihan Ganda" : "Essay",
    penulis: q.author_name,
    color: q.color || GURU_COLORS[(q.author_id ?? 1) % GURU_COLORS.length],
    authorId: q.author_id,
    options: q.options,
  };
}

function displayStatusToApi(s: DisplayStatus): ApiStatus {
  return s === "Published" ? "published" : "draft";
}

function kelasFilterToLevel(k: string): ApiLevel | undefined {
  const map: Record<string, ApiLevel> = {
    "Kelas 10": "X",
    "Kelas 11": "XI",
    "Kelas 12": "XII",
  };
  return map[k];
}

// ── Bulk Create Form Types ─────────────────────────────────────────────

interface BulkOption {
  text: string;
  isCorrect: boolean;
}

interface BulkQuestionSlot {
  type: ApiQuestionType;
  prompt: string;
  options: BulkOption[];
}

function createEmptySlot(): BulkQuestionSlot {
  return {
    type: "multiple_choice",
    prompt: "",
    options: [
      { text: "", isCorrect: true },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ],
  };
}

// ── Excel Import Types ─────────────────────────────────────────────

interface ImportedRow {
  no: number;
  soal: string;
  tipe: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  opsiE: string;
  kunci: string;
}

// Generate Excel template as a downloadable blob
function generateTemplate(): Blob {
  const instructions = [
    "Petunjuk: Untuk soal PG, opsi jawaban fleksibel. Isi Opsi A-D jika hanya sampai D, atau isi Opsi A-E jika sampai E. Opsi E boleh dikosongkan. Kunci jawaban isi A, B, C, D, atau E sesuai opsi yang tersedia.",
  ];
  const headers = ["No", "Soal", "Tipe (PG/Essay)", "Opsi A", "Opsi B", "Opsi C", "Opsi D", "Opsi E", "Kunci Jawaban (A/B/C/D/E)"];
  const sampleRows = [
    [1, "2 + 2 = ...", "PG", "3", "4", "5", "6", "7", "B"],
    [2, "Sebutkan nama ibu kota Indonesia!", "Essay", "", "", "", "", "", "Jakarta"],
  ];
  const ws = XLSX.utils.aoa_to_sheet([instructions, [], headers, ...sampleRows]);
  if (ws.A1) {
    ws.A1.s = { font: { bold: true } };
  }
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
  // Set column widths
  ws["!cols"] = [
    { wch: 5 },
    { wch: 40 },
    { wch: 14 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Soal");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

// Parse an uploaded Excel file into ImportedRow[]
function parseExcelFile(file: File): Promise<ImportedRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Skip optional instruction and header rows, filter empty rows
        const result: ImportedRow[] = [];
        const firstDataRow = rows.findIndex((row) => {
          const firstCell = String(row?.[0] ?? "").trim().toLowerCase();
          return firstCell === "no";
        }) + 1;
        const startRow = firstDataRow > 0 ? firstDataRow : 1;
        for (let i = startRow; i < rows.length; i++) {
          const r = rows[i];
          if (!r || r.length < 2) continue;
          const soal = String(r[1] ?? "").trim();
          if (!soal) continue;
          result.push({
            no: result.length + 1,
            soal,
            tipe: String(r[2] ?? "PG").trim().toUpperCase() === "ESSAY" ? "Essay" : "PG",
            opsiA: String(r[3] ?? "").trim(),
            opsiB: String(r[4] ?? "").trim(),
            opsiC: String(r[5] ?? "").trim(),
            opsiD: String(r[6] ?? "").trim(),
            opsiE: String(r[7] ?? "").trim(),
            kunci: String(r[8] ?? "").trim().toUpperCase(),
          });
        }
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsArrayBuffer(file);
  });
}

// ── Page Component ─────────────────────────────────────────────────────

export default function BankSoalPage() {
  const dashboardUser = useDashboardUser();
  const [sessionUser, setSessionUser] = useState<User | null>(null);
  const user = dashboardUser ?? sessionUser;
  const [soals, setSoals] = useState<Soal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);

  const [mapelFilter, setMapelFilter] = useState("Semua Mata Pelajaran");
  const [kelasFilter, setKelasFilter] = useState(KELAS_FILTERS[0]);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTERS[0]);
  const [page, setPage] = useState(1);

  // Bulk create modal
  const [open, setOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState(DEFAULT_MAPELS[0]);
  const [bulkLevel, setBulkLevel] = useState<ApiLevel>("X");
  const [bulkStatus, setBulkStatus] = useState<ApiStatus>("draft");
  const [bulkSlots, setBulkSlots] = useState<BulkQuestionSlot[]>([createEmptySlot()]);
  const [submitting, setSubmitting] = useState(false);
  const [deletingSoal, setDeletingSoal] = useState<Soal | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Excel import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportedRow[]>([]);
  const [importSubject, setImportSubject] = useState(DEFAULT_MAPELS[0]);
  const [importLevel, setImportLevel] = useState<ApiLevel>("X");
  const [importStatus, setImportStatus] = useState<ApiStatus>("draft");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setSessionUser(getSession());
  }, []);

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

  // ── Fetch questions from API ─────────────────────────────────────

  const fetchQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/questions?limit=500");
      if (!res.ok) throw new Error("Gagal memuat data soal.");
      const data = await res.json();
      setSubjects(data.subjects || []);

      const mapped: Soal[] = (data.data || []).map(mapApiToDisplay);
      setSoals(mapped);
    } catch (err) {
      console.error(err);
      setError("Gagal memuat data soal. Pastikan server berjalan.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // ── Filtering & Pagination ─────────────────────────────────────

  const filtered = useMemo(() => {
    const q = "";
    return soals.filter((s) => {
      if (!isAdmin && s.authorId !== user?.id) return false;
      const matchMapel =
        mapelFilter === "Semua Mata Pelajaran" || s.mapel === mapelFilter;
      const matchKelas = kelasFilter === "Semua Kelas" || s.kelas === kelasFilter;
      const matchStatus =
        statusFilter === "Semua Status" || s.status === statusFilter;
      return matchMapel && matchKelas && matchStatus && !q;
    });
  }, [soals, mapelFilter, kelasFilter, statusFilter, isAdmin, user?.id]);

  const groupedSoals = useMemo(() => {
    const groups = new Map<string, SoalGroup>();

    for (const soal of filtered) {
      const key = `${soal.mapel}|||${soal.kelas}`;
      const existing = groups.get(key);

      if (!existing) {
        groups.set(key, {
          key,
          mapel: soal.mapel,
          kelas: soal.kelas,
          total: 1,
          pilihanGanda: soal.tipe === "Pilihan Ganda" ? 1 : 0,
          essay: soal.tipe === "Essay" ? 1 : 0,
          authors: [soal.penulis],
        });
        continue;
      }

      existing.total += 1;
      existing.pilihanGanda += soal.tipe === "Pilihan Ganda" ? 1 : 0;
      existing.essay += soal.tipe === "Essay" ? 1 : 0;
      if (!existing.authors.includes(soal.penulis)) existing.authors.push(soal.penulis);
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.mapel.localeCompare(b.mapel) || a.kelas.localeCompare(b.kelas)
    );
  }, [filtered]);
  const selectedGroup = groupedSoals.find((group) => group.key === selectedGroupKey);
  const groupQuestions = selectedGroupKey
    ? filtered.filter((soal) => `${soal.mapel}|||${soal.kelas}` === selectedGroupKey)
    : [];
  const questionTotalPages = Math.max(1, Math.ceil(groupQuestions.length / PAGE_SIZE));
  const questionSafePage = Math.min(page, questionTotalPages);
  const paged = groupQuestions.slice((questionSafePage - 1) * PAGE_SIZE, questionSafePage * PAGE_SIZE);

  function changePage(next: number) {
    setPage(Math.min(Math.max(1, next), questionTotalPages));
  }

  function resetPage(fn: (v: string) => void) {
    return (v: string) => {
      fn(v);
      setSelectedGroupKey(null);
      setPage(1);
    };
  }

  function openGroup(groupKey: string) {
    setSelectedGroupKey(groupKey);
    setPage(1);
  }

  function closeGroup() {
    setSelectedGroupKey(null);
    setPage(1);
  }

  // ── Bulk Create: Slot Management ────────────────────────────────

  function addSlot() {
    setBulkSlots((prev) => [...prev, createEmptySlot()]);
  }

  function removeSlot(index: number) {
    setBulkSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlotPrompt(index: number, prompt: string) {
    setBulkSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, prompt } : s))
    );
  }

  function updateSlotType(index: number, type: ApiQuestionType) {
    setBulkSlots((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        if (type === "essay") {
          return { ...s, type, options: [] };
        }
        // Switch to PG: ensure 4 options
        return {
          ...s,
          type,
          options: [
            { text: "", isCorrect: true },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
            { text: "", isCorrect: false },
          ],
        };
      })
    );
  }

  function updateSlotOption(
    slotIndex: number,
    optIndex: number,
    field: "text" | "isCorrect",
    value: string | boolean
  ) {
    setBulkSlots((prev) =>
      prev.map((s, i) => {
        if (i !== slotIndex) return s;
        return {
          ...s,
          options: s.options.map((o, j) =>
            j === optIndex ? { ...o, [field]: value } : o
          ),
        };
      })
    );
  }

  // ── Bulk Create: Submit ─────────────────────────────────────────

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate: at least 1 question with content
    const validSlots = bulkSlots.filter((s) => s.prompt.trim());
    if (validSlots.length === 0) {
      alert("Minimal harus ada 1 soal yang diisi.");
      return;
    }

    // Validate PG options
    for (let i = 0; i < validSlots.length; i++) {
      const s = validSlots[i];
      if (s.type === "multiple_choice") {
        const filledOpts = s.options.filter((o) => o.text.trim());
        if (filledOpts.length < 2) {
          alert(`Soal ke-${i + 1}: Pilihan Ganda minimal harus punya 2 opsi.`);
          return;
        }
        const hasCorrect = s.options.some((o) => o.isCorrect && o.text.trim());
        if (!hasCorrect) {
          alert(`Soal ke-${i + 1}: Pilihan Ganda harus ada minimal 1 jawaban benar.`);
          return;
        }
      }
    }

    setSubmitting(true);

    try {
      if (!user?.id) {
        alert("Sesi pengguna tidak ditemukan. Silakan login ulang.");
        return;
      }

      const questionsPayload = validSlots.map((s) => ({
        question_type: s.type,
        prompt: s.prompt.trim(),
        options:
          s.type === "multiple_choice"
            ? s.options
                .filter((o) => o.text.trim())
                .map((o, idx) => ({
                  option_text: o.text.trim(),
                  is_correct: o.isCorrect,
                  sort_order: idx,
                }))
            : undefined,
      }));

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: bulkSubject,
          level: bulkLevel,
          status: bulkStatus,
          author_id: user.id,
          author_name: user.name,
          questions: questionsPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal membuat soal.");
      }

      // Reset form
      setBulkSlots([createEmptySlot()]);
      setOpen(false);
      setPage(1);
      await fetchQuestions();
      const data = await res.json();
      showToast(data.message || "Soal berhasil dibuat.");
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────

  async function handleDelete(soal: Soal) {
    setDeletingSoal(soal);
  }

  async function confirmDelete() {
    if (!deletingSoal) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/questions/${deletingSoal.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal menghapus soal.");
      }
      await fetchQuestions();
      showToast("Soal berhasil dihapus.");
      setDeletingSoal(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Gagal menghapus soal.");
    } finally {
      setDeleting(false);
    }
  }

  // ── Dynamic filter subjects from DB ─────────────────────────────

  const allMapelFilters = useMemo(
    () => ["Semua Mata Pelajaran", ...subjects],
    [subjects]
  );

  // ── Excel Import: File Handling ────────────────────────────────

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls") {
      alert("Hanya file Excel (.xlsx / .xls) yang diterima.");
      return;
    }
    setImportFile(file);
    setImportError(null);
    parseExcelFile(file)
      .then((rows) => {
        if (rows.length === 0) {
          setImportError("File kosong atau format tidak sesuai.");
          setImportPreview([]);
        } else {
          setImportPreview(rows);
        }
      })
      .catch(() => {
        setImportError("Gagal membaca file Excel.");
        setImportPreview([]);
      });
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDownloadTemplate() {
    const blob = generateTemplate();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_soal.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  }

  function removeImportedRow(index: number) {
    setImportPreview((prev) => prev.map((r, i) => (i === index ? null : r)).filter(Boolean).map((r, i) => ({ ...r!, no: i + 1 })));
  }

  function updateImportedRow(index: number, field: keyof ImportedRow, value: string) {
    setImportPreview((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }

  // ── Excel Import: Submit ────────────────────────────────────────

  async function handleImportSubmit() {
    const validRows = importPreview.filter((r) => r.soal.trim());
    if (validRows.length === 0) {
      alert("Minimal harus ada 1 soal yang valid.");
      return;
    }

    // Validate PG rows
    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      if (r.tipe === "PG") {
        const opts = [r.opsiA, r.opsiB, r.opsiC, r.opsiD, r.opsiE].filter((o) => o.trim());
        if (opts.length < 2) {
          alert(`Soal ke-${r.no}: Pilihan Ganda minimal harus punya 2 opsi.`);
          return;
        }
        if (!r.kunci || !"ABCDE".includes(r.kunci)) {
          alert(`Soal ke-${r.no}: Kunci jawaban harus A, B, C, D, atau E.`);
          return;
        }
      }
    }

    setImporting(true);
    try {
      if (!user?.id) {
        alert("Sesi pengguna tidak ditemukan. Silakan login ulang.");
        return;
      }

      const questionsPayload = validRows.map((r) => {
        const isPG = r.tipe === "PG";
        const rawOpts = [r.opsiA, r.opsiB, r.opsiC, r.opsiD, r.opsiE];
        const opts = rawOpts
          .map((text, idx) => ({
            option_text: text.trim(),
            is_correct: isPG && r.kunci === String.fromCharCode(65 + idx),
            sort_order: idx,
          }))
          .filter((o) => o.option_text);
        return {
          question_type: isPG ? "multiple_choice" as const : "essay" as const,
          prompt: r.soal.trim(),
          options: isPG ? opts : undefined,
        };
      });

      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: importSubject,
          level: importLevel,
          status: importStatus,
          author_id: user.id,
          author_name: user.name,
          questions: questionsPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Gagal import soal.");
      }

      // Reset
      setImportOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setImportError(null);
      setSelectedGroupKey(null);
      setPage(1);
      await fetchQuestions();
      const data = await res.json();
      showToast(data.message || `Berhasil import ${validRows.length} soal.`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Terjadi kesalahan saat import.");
    } finally {
      setImporting(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <DashboardLayout active="bank" allowedRoles={["admin", "guru"]}>
      <div className="max-w-[1280px] mx-auto">
        {/* Page Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-stack-lg">
          <div>
            <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface">
              Manajemen Bank Soal
            </h2>
            <p className="font-body-sm md:font-body-md text-body-sm md:text-body-md text-on-surface-variant mt-1 md:mt-2">
              {isAdmin
                ? "Kelola, filter, dan buat soal ujian baru untuk berbagai mata pelajaran."
                : "Kelola dan buat soal ujian dari soal yang Anda buat sendiri."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(true)}
              className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm whitespace-nowrap min-h-[44px] cursor-pointer active:scale-95 duration-200"
            >
              <Icon name="edit" />
              <span className="hidden sm:inline">Input Manual</span>
              <span className="sm:hidden">Manual</span>
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="bg-secondary text-on-secondary hover:bg-secondary-fixed-variant transition-colors px-4 md:px-6 py-2.5 md:py-3 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm whitespace-nowrap min-h-[44px] cursor-pointer active:scale-95 duration-200"
            >
              <Icon name="upload_file" />
              <span className="hidden sm:inline">Import Excel</span>
              <span className="sm:hidden">Excel</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-surface-container-lowest p-3 md:p-4 rounded-xl border border-outline-variant shadow-sm mb-4 md:mb-stack-lg flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1.5 md:mb-2">
              MATA PELAJARAN
            </label>
            <div className="relative">
              <select
                value={mapelFilter}
                onChange={(e) => resetPage(setMapelFilter)(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
              >
                {allMapelFilters.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1.5 md:mb-2">
              KELAS (TINGKAT)
            </label>
            <div className="relative">
              <select
                value={kelasFilter}
                onChange={(e) => resetPage(setKelasFilter)(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
              >
                {KELAS_FILTERS.map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
          <div className="flex-1">
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1.5 md:mb-2">
              STATUS
            </label>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => resetPage(setStatusFilter)(e.target.value)}
                className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-3 md:px-4 py-2 md:py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-12 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Memuat data soal...
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-surface-container-lowest rounded-xl border border-error/50 p-8 text-center">
            <Icon name="error_outline" size={32} className="text-error mx-auto mb-2" />
            <p className="font-title-sm text-title-sm text-error">{error}</p>
            <button
              onClick={fetchQuestions}
              className="mt-3 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-sm text-body-sm cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Grouped Questions */}
        {!loading && !error && (
          <>
            {!selectedGroupKey && groupedSoals.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-8 md:p-12 text-center">
                <Icon name="quiz" size={36} className="text-outline mx-auto mb-3" />
                <p className="font-title-sm text-title-sm text-on-surface">Tidak ada grup soal yang cocok</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  {isAdmin
                    ? "Coba ubah filter atau buat soal baru."
                    : "Belum ada soal yang Anda buat. Klik \"Input Manual\" untuk mulai."}
                </p>
              </div>
            ) : !selectedGroupKey ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-gutter">
                {groupedSoals.map((group) => (
                  <button
                    key={group.key}
                    type="button"
                    onClick={() => openGroup(group.key)}
                    className="group min-h-[180px] rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-container text-primary">
                          <Icon name="folder" size={24} filled />
                        </div>
                        <div className="min-w-0">
                          <h3 className="truncate font-title-sm text-title-sm text-on-surface">
                            {group.mapel}
                          </h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            {group.kelas}
                          </p>
                        </div>
                      </div>
                      <Icon name="chevron_right" size={22} className="text-on-surface-variant transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <div className="rounded-lg bg-surface-container-low p-3">
                        <p className="font-title-sm text-title-sm text-on-surface">{group.total}</p>
                        <p className="font-label-caps text-label-caps text-on-surface-variant">SOAL</p>
                      </div>
                      <div className="rounded-lg bg-secondary-container p-3">
                        <p className="font-title-sm text-title-sm text-on-secondary-fixed">{group.pilihanGanda}</p>
                        <p className="font-label-caps text-label-caps text-on-secondary-fixed">PG</p>
                      </div>
                      <div className="rounded-lg bg-surface-container-low p-3">
                        <p className="font-title-sm text-title-sm text-on-surface">{group.essay}</p>
                        <p className="font-label-caps text-label-caps text-on-surface-variant">ESSAY</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
                      <span className="truncate">
                        {group.authors.slice(0, 2).join(", ")}
                        {group.authors.length > 2 ? ` +${group.authors.length - 2}` : ""}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : selectedGroup ? (
              <>
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={closeGroup}
                      aria-label="Kembali ke grup soal"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant text-on-surface-variant transition-colors hover:bg-surface-container cursor-pointer"
                    >
                      <Icon name="arrow_back" size={20} />
                    </button>
                    <div className="min-w-0">
                      <h3 className="truncate font-title-sm text-title-sm text-on-surface">
                        {selectedGroup.mapel} - {selectedGroup.kelas}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {groupQuestions.length} soal dalam grup ini
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md bg-secondary-container px-2.5 py-1 font-label-caps text-label-caps text-on-secondary-fixed">
                      <Icon name="radio_button_checked" size={14} />
                      {selectedGroup.pilihanGanda} PG
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-surface-container-high px-2.5 py-1 font-label-caps text-label-caps text-on-surface-variant">
                      <Icon name="subject" size={14} />
                      {selectedGroup.essay} ESSAY
                    </span>
                  </div>
                </div>

                {paged.length === 0 ? (
                  <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-8 md:p-12 text-center">
                    <Icon name="quiz" size={36} className="text-outline mx-auto mb-3" />
                    <p className="font-title-sm text-title-sm text-on-surface">Tidak ada soal di grup ini</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-gutter">
                    {paged.map((soal) => (
                      <div
                        key={soal.id}
                        className="bg-surface-container-lowest p-4 md:p-6 rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative group flex flex-col"
                      >
                        <div className="flex justify-between items-start mb-3 md:mb-4">
                          <div className="flex gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md bg-secondary-container text-on-secondary-fixed font-label-caps text-label-caps text-xs">
                              {soal.mapel.toUpperCase()}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 md:px-2.5 py-1 rounded-md bg-surface-container-high text-on-surface font-label-caps text-label-caps text-xs">
                              {soal.kelas.toUpperCase()}
                            </span>
                          </div>
                          {soal.status === "Published" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-100 text-green-800 font-label-caps text-label-caps border border-green-200">
                              {soal.status.toUpperCase()}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-surface-container-highest text-on-surface-variant font-label-caps text-label-caps border border-outline-variant">
                              {soal.status.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <h3 className="font-title-sm text-title-sm text-on-surface mb-2 line-clamp-2">
                          {soal.pertanyaan}
                        </h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant mb-3 md:mb-4 flex items-center gap-1">
                          <Icon
                            name={soal.tipe === "Pilihan Ganda" ? "radio_button_checked" : "subject"}
                            size={16}
                          />
                          {soal.tipe}
                          {soal.tipe === "Pilihan Ganda" && soal.options.length > 0 && (
                            <span className="text-outline ml-1">({soal.options.length} opsi)</span>
                          )}
                        </p>

                        {soal.tipe === "Pilihan Ganda" && soal.options.length > 0 && (
                          <div className="mb-3 md:mb-4 space-y-1">
                            {soal.options.map((opt, idx) => (
                              <div
                                key={idx}
                                className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                                  opt.is_correct
                                    ? "bg-green-50 text-green-700 font-medium"
                                    : "text-on-surface-variant"
                                }`}
                              >
                                <span className="font-semibold">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <span className="truncate">{opt.option_text}</span>
                                {opt.is_correct && (
                                  <Icon name="check_circle" size={12} className="text-green-600 shrink-0" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-outline-variant/50 mt-auto">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-6 h-6 rounded-full border-2 border-surface object-cover bg-gradient-to-br ${soal.color} flex items-center justify-center text-white text-[10px] font-bold shrink-0`}
                            >
                              {soal.penulis
                                .split(" ")
                                .map((w) => w[0])
                                .join("")
                                .replace(/\./g, "")
                                .slice(0, 2)}
                            </div>
                            <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                              {soal.penulis}
                            </span>
                          </div>
                          <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              aria-label="Hapus soal"
                              onClick={() => handleDelete(soal)}
                              className="p-1.5 text-secondary hover:text-error hover:bg-error-container/20 rounded-md transition-colors cursor-pointer"
                            >
                              <Icon name="delete" size={20} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {questionTotalPages > 1 && (
                  <div className="flex items-center justify-center gap-1.5 md:gap-2 mt-4 md:mt-stack-lg">
                    <button
                      onClick={() => changePage(questionSafePage - 1)}
                      disabled={questionSafePage <= 1}
                      className="p-2 border border-outline-variant rounded-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Icon name="chevron_left" />
                    </button>
                    {Array.from({ length: questionTotalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => changePage(p)}
                        className={`w-10 h-10 rounded-md font-title-sm text-title-sm cursor-pointer transition-colors ${
                          p === questionSafePage
                            ? "bg-primary text-on-primary"
                            : "border border-outline-variant text-on-surface hover:bg-surface-container"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => changePage(questionSafePage + 1)}
                      disabled={questionSafePage >= questionTotalPages}
                      className="p-2 border border-outline-variant rounded-md text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Icon name="chevron_right" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-8 md:p-12 text-center">
                <Icon name="folder_off" size={36} className="text-outline mx-auto mb-3" />
                <p className="font-title-sm text-title-sm text-on-surface">Grup tidak ditemukan</p>
                <button
                  type="button"
                  onClick={closeGroup}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 font-body-sm text-body-sm text-on-primary cursor-pointer"
                >
                  Kembali
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          Modal Buat Soal Baru (BULK CREATE)
          ════════════════════════════════════════════════════════════ */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Buat soal baru"
        >
          <div
            className="fixed inset-0 bg-inverse-surface/50 backdrop-blur-sm"
            onClick={() => !submitting && setOpen(false)}
          />
          <form
            onSubmit={handleBulkSubmit}
            className="relative bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-2xl mb-8"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant sticky top-0 bg-surface-container-lowest rounded-t-xl z-10">
              <div>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  Buat Soal Baru
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Buat beberapa soal sekaligus. Pilih jenis PG atau Essay per soal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setOpen(false)}
                aria-label="Tutup"
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Top-level settings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    MATA PELAJARAN
                  </label>
                  <div className="relative">
                    <select
                      value={bulkSubject}
                      onChange={(e) => setBulkSubject(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                    >
                      {DEFAULT_MAPELS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    TINGKAT
                  </label>
                  <div className="relative">
                    <select
                      value={bulkLevel}
                      onChange={(e) => setBulkLevel(e.target.value as ApiLevel)}
                      className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                    >
                      {LEVEL_OPTIONS.map((l) => (
                        <option key={l} value={l}>
                          Kelas {l === "X" ? "10" : l === "XI" ? "11" : "12"} ({l})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    STATUS
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["draft", "published"] as ApiStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setBulkStatus(s)}
                        className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg border font-body-sm text-body-sm transition-colors cursor-pointer ${
                          bulkStatus === s
                            ? "border-primary bg-primary-container text-on-primary-container"
                            : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        <Icon name={s === "published" ? "publish" : "drafts"} size={14} />
                        {s === "published" ? "Published" : "Draft"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-outline-variant pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-title-sm text-title-sm text-on-surface">
                    Daftar Soal ({bulkSlots.length})
                  </h4>
                  <button
                    type="button"
                    onClick={addSlot}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-outline-variant text-primary font-body-sm text-body-sm hover:bg-primary-container/30 transition-colors cursor-pointer"
                  >
                    <Icon name="add" size={16} />
                    Tambah Soal
                  </button>
                </div>
              </div>

              {/* Question Slots */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
                {bulkSlots.map((slot, slotIdx) => (
                  <div
                    key={slotIdx}
                    className="border border-outline-variant rounded-xl p-4 space-y-3 bg-surface-container-low/30"
                  >
                    {/* Slot Header */}
                    <div className="flex items-center justify-between">
                      <span className="font-title-sm text-title-sm text-on-surface">
                        Soal {slotIdx + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {/* Type toggle */}
                        <div className="flex rounded-lg border border-outline-variant overflow-hidden">
                          {(["multiple_choice", "essay"] as ApiQuestionType[]).map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => updateSlotType(slotIdx, t)}
                              className={`px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                                slot.type === t
                                  ? "bg-primary text-on-primary"
                                  : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                              }`}
                            >
                              {t === "multiple_choice" ? "PG" : "Essay"}
                            </button>
                          ))}
                        </div>
                        {bulkSlots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSlot(slotIdx)}
                            className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Prompt */}
                    <textarea
                      rows={2}
                      value={slot.prompt}
                      onChange={(e) => updateSlotPrompt(slotIdx, e.target.value)}
                      placeholder="Tulis pertanyaan soal di sini..."
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none text-on-surface placeholder:text-outline"
                    />

                    {/* Options for PG */}
                    {slot.type === "multiple_choice" && (
                      <div className="space-y-2">
                        <p className="text-xs text-on-surface-variant font-label-caps">
                          OPSI JAWABAN
                        </p>
                        {slot.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                updateSlotOption(slotIdx, optIdx, "isCorrect", true)
                              }
                              className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors cursor-pointer ${
                                opt.isCorrect
                                  ? "border-green-600 bg-green-600"
                                  : "border-outline-variant hover:border-green-400"
                              }`}
                              title="Tandai sebagai jawaban benar"
                            >
                              {opt.isCorrect && (
                                <Icon name="check" size={14} className="text-white" />
                              )}
                            </button>
                            <span className="shrink-0 w-5 text-xs font-bold text-on-surface-variant">
                              {String.fromCharCode(65 + optIdx)}.
                            </span>
                            <input
                              value={opt.text}
                              onChange={(e) =>
                                updateSlotOption(slotIdx, optIdx, "text", e.target.value)
                              }
                              placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`}
                              className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-1.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-on-surface placeholder:text-outline"
                            />
                          </div>
                        ))}
                        <p className="text-[10px] text-on-surface-variant">
                          Klik lingkaran hijau untuk menandai jawaban benar
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 pt-4 border-t border-outline-variant sticky bottom-0 bg-surface-container-lowest rounded-b-xl">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {bulkSlots.filter((s) => s.prompt.trim()).length} soal akan disimpan
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => !submitting && setOpen(false)}
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-lg border border-outline-variant font-title-sm text-title-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting || bulkSlots.filter((s) => s.prompt.trim()).length === 0}
                  className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors px-6 py-2.5 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <Icon name="save" size={18} />
                  )}
                  Simpan {bulkSlots.filter((s) => s.prompt.trim()).length} Soal
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          Modal Import Excel
          ════════════════════════════════════════════════════════════ */}
      {importOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-8 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label="Import soal dari Excel"
        >
          <div
            className="fixed inset-0 bg-inverse-surface/50 backdrop-blur-sm"
            onClick={() => !importing && setImportOpen(false)}
          />
          <div className="relative bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl w-full max-w-3xl mb-8">
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-outline-variant sticky top-0 bg-surface-container-lowest rounded-t-xl z-10">
              <div>
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  Import Soal dari Excel
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                  Upload file Excel (.xlsx) yang berisi soal. Download template di bawah sebagai referensi format.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !importing && setImportOpen(false)}
                aria-label="Tutup"
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors cursor-pointer"
              >
                <Icon name="close" size={22} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Template Download */}
              <div className="bg-primary-container/30 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <Icon name="description" size={24} className="text-primary" />
                <div className="flex-1">
                  <p className="font-title-sm text-title-sm text-on-surface">Download Template Excel</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    Format kolom: No | Soal | Tipe (PG/Essay) | Opsi A | Opsi B | Opsi C | Opsi D | Opsi E | Kunci Jawaban
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-on-primary rounded-lg font-body-sm text-body-sm hover:bg-on-primary-fixed-variant transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Icon name="download" size={16} />
                  Download Template
                </button>
              </div>

              {/* Settings Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    MATA PELAJARAN
                  </label>
                  <div className="relative">
                    <select
                      value={importSubject}
                      onChange={(e) => setImportSubject(e.target.value)}
                      className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                    >
                      {DEFAULT_MAPELS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    TINGKAT
                  </label>
                  <div className="relative">
                    <select
                      value={importLevel}
                      onChange={(e) => setImportLevel(e.target.value as ApiLevel)}
                      className="w-full appearance-none bg-surface-container-low border border-outline-variant rounded-lg px-4 py-2.5 font-body-sm text-body-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary cursor-pointer text-on-surface"
                    >
                      {LEVEL_OPTIONS.map((l) => (
                        <option key={l} value={l}>
                          Kelas {l === "X" ? "10" : l === "XI" ? "11" : "12"} ({l})
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">
                    STATUS
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["draft", "published"] as ApiStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setImportStatus(s)}
                        className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg border font-body-sm text-body-sm transition-colors cursor-pointer ${
                          importStatus === s
                            ? "border-primary bg-primary-container text-on-primary-container"
                            : "border-outline-variant bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                        }`}
                      >
                        <Icon name={s === "published" ? "publish" : "drafts"} size={14} />
                        {s === "published" ? "Published" : "Draft"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  importFile
                    ? "border-green-400 bg-green-50/50"
                    : "border-outline-variant hover:border-primary/50 hover:bg-primary-container/10"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {importFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Icon name="description" size={36} className="text-green-600" />
                    <p className="font-title-sm text-title-sm text-on-surface">{importFile.name}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {importPreview.length} soal terdeteksi. Klik untuk mengganti file.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Icon name="cloud_upload" size={36} className="text-on-surface-variant" />
                    <p className="font-title-sm text-title-sm text-on-surface">Klik atau seret file Excel ke sini</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Format: .xlsx / .xls</p>
                  </div>
                )}
              </div>

              {/* Error */}
              {importError && (
                <div className="bg-error-container/20 border border-error/30 rounded-lg p-3 flex items-center gap-2">
                  <Icon name="error_outline" size={18} className="text-error shrink-0" />
                  <p className="font-body-sm text-body-sm text-error">{importError}</p>
                </div>
              )}

              {/* Preview Table */}
              {importPreview.length > 0 && (
                <div>
                  <h4 className="font-title-sm text-title-sm text-on-surface mb-3">
                    Preview ({importPreview.length} soal)
                  </h4>
                  <div className="max-h-[40vh] overflow-y-auto border border-outline-variant rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-surface-container-high sticky top-0 z-[1]">
                        <tr>
                          <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-xs w-8">No</th>
                          <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-xs">Soal</th>
                          <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-xs w-16">Tipe</th>
                          <th className="px-3 py-2 font-label-caps text-label-caps text-on-surface-variant text-xs w-20">Kunci</th>
                          <th className="px-3 py-2 w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/50">
                        {importPreview.map((row, idx) => (
                          <tr key={idx} className="hover:bg-surface-container-low/50">
                            <td className="px-3 py-2 font-body-sm text-body-sm text-on-surface-variant">
                              {row.no}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                value={row.soal}
                                onChange={(e) => updateImportedRow(idx, "soal", e.target.value)}
                                className="w-full bg-transparent border-b border-outline-variant/50 font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-primary"
                              />
                              {row.tipe === "PG" && (
                                <div className="mt-1 text-[10px] text-on-surface-variant space-x-2">
                                  <span>A: {row.opsiA || "-"}</span>
                                  <span>B: {row.opsiB || "-"}</span>
                                  <span>C: {row.opsiC || "-"}</span>
                                  <span>D: {row.opsiD || "-"}</span>
                                  <span>E: {row.opsiE || "-"}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.tipe}
                                onChange={(e) => updateImportedRow(idx, "tipe", e.target.value)}
                                className="bg-transparent border border-outline-variant/50 rounded px-1 py-0.5 text-xs font-body-sm text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                              >
                                <option value="PG">PG</option>
                                <option value="Essay">Essay</option>
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              {row.tipe === "PG" ? (
                                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-800 font-bold text-xs border border-green-200">
                                  {row.kunci || "?"}
                                </span>
                              ) : (
                                <span className="text-on-surface-variant text-xs">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeImportedRow(idx)}
                                className="p-1 text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                                title="Hapus soal ini"
                              >
                                <Icon name="close" size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 pt-4 border-t border-outline-variant sticky bottom-0 bg-surface-container-lowest rounded-b-xl">
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {importPreview.length > 0
                  ? `${importPreview.length} soal akan diimport`
                  : "Upload file untuk memulai"}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => !importing && setImportOpen(false)}
                  disabled={importing}
                  className="px-5 py-2.5 rounded-lg border border-outline-variant font-title-sm text-title-sm text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleImportSubmit}
                  disabled={importing || importPreview.length === 0}
                  className="bg-primary text-on-primary hover:bg-on-primary-fixed-variant transition-colors px-6 py-2.5 rounded-lg font-title-sm text-title-sm flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <div className="animate-spin w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full"></div>
                  ) : (
                    <Icon name="upload_file" size={18} />
                  )}
                  Import {importPreview.length} Soal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deletingSoal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi hapus soal"
        >
          <div
            className="fixed inset-0 bg-inverse-surface/50 backdrop-blur-sm"
            onClick={() => !deleting && setDeletingSoal(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-error-container text-error">
                <Icon name="delete" size={24} />
              </div>
              <div className="min-w-0">
                <h3 className="font-title-sm text-title-sm text-on-surface">
                  Hapus soal ini?
                </h3>
                <p className="mt-2 line-clamp-3 font-body-sm text-body-sm text-on-surface-variant">
                  {deletingSoal.pertanyaan}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeletingSoal(null)}
                disabled={deleting}
                className="rounded-lg border border-outline-variant px-4 py-2 font-title-sm text-title-sm text-on-surface transition-colors hover:bg-surface-container disabled:opacity-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-error px-4 py-2 font-title-sm text-title-sm text-on-error transition-colors hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-error border-t-transparent" />
                ) : (
                  <Icon name="delete" size={18} />
                )}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[60] flex max-w-[calc(100vw-3rem)] items-center gap-2 rounded-lg bg-inverse-surface px-4 py-3 font-body-sm text-body-sm text-inverse-on-surface shadow-xl"
        >
          <Icon name="check_circle" size={18} filled className="shrink-0 text-inverse-primary" />
          <span>{toast}</span>
        </div>
      )}
    </DashboardLayout>
  );
}
