"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import StatCard from "@/components/StatCard";

interface Kelas {
  id: string;
  nama: string;
  tingkat: "X" | "XI" | "XII";
  jurusan: string;
  waliKelas: string;
  jumlahSiswa: number;
}

const TINGKAT_OPTIONS = ["X", "XI", "XII"] as const;
const JURUSAN_OPTIONS = ["RPL", "TKJ", "MM", "AK", "AP"];

const INITIAL_DATA: Kelas[] = [
  { id: "k1", nama: "X-A", tingkat: "X", jurusan: "RPL", waliKelas: "Bpk. Budi Santoso", jumlahSiswa: 32 },
  { id: "k2", nama: "X-B", tingkat: "X", jurusan: "TKJ", waliKelas: "Ibu Sari Wulandari", jumlahSiswa: 30 },
  { id: "k3", nama: "XI-A", tingkat: "XI", jurusan: "RPL", waliKelas: "Bpk. Hendra Gunawan", jumlahSiswa: 28 },
  { id: "k4", nama: "XI-B", tingkat: "XI", jurusan: "TKJ", waliKelas: "Ibu Dewi Lestari", jumlahSiswa: 31 },
  { id: "k5", nama: "XII-A", tingkat: "XII", jurusan: "MM", waliKelas: "Bpk. Ahmad Subarjo", jumlahSiswa: 29 },
  { id: "k6", nama: "XII-B", tingkat: "XII", jurusan: "AK", waliKelas: "Ibu Ratna Sari", jumlahSiswa: 27 },
];

const STORAGE_KEY = "ujiankuuu_kelas";

interface FormState {
  nama: string;
  tingkat: Kelas["tingkat"];
  jurusan: string;
  waliKelas: string;
  jumlahSiswa: string;
}

const EMPTY_FORM: FormState = {
  nama: "",
  tingkat: "X",
  jurusan: "RPL",
  waliKelas: "",
  jumlahSiswa: "",
};

function loadKelas(): Kelas[] {
  if (typeof window === "undefined") return INITIAL_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Kelas[];
  } catch {
    // abaikan, pakai data awal
  }
  return INITIAL_DATA;
}

export default function KelasManager() {
  const [kelas, setKelas] = useState<Kelas[]>(loadKelas);
  const [query, setQuery] = useState("");
  const [tingkatFilter, setTingkatFilter] = useState("Semua");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Kelas | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Kelas | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Persist ke localStorage setiap data berubah.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(kelas));
    } catch {
      // penyimpanan penuh / tidak tersedia
    }
  }, [kelas]);

  // Bersihkan timer toast saat komponen dilepas.
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return kelas
      .filter((k) => {
        const matchTingkat = tingkatFilter === "Semua" || k.tingkat === tingkatFilter;
        const matchQuery =
          !q ||
          k.nama.toLowerCase().includes(q) ||
          k.jurusan.toLowerCase().includes(q) ||
          k.waliKelas.toLowerCase().includes(q);
        return matchTingkat && matchQuery;
      })
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [kelas, query, tingkatFilter]);

  const stats = useMemo(() => {
    const totalSiswa = kelas.reduce((acc, k) => acc + k.jumlahSiswa, 0);
    const jurusanCount = new Set(kelas.map((k) => k.jurusan)).size;
    return {
      totalKelas: kelas.length,
      totalSiswa,
      jurusanCount,
      rata: kelas.length > 0 ? (totalSiswa / kelas.length).toFixed(1) : "0.0",
    };
  }, [kelas]);

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(k: Kelas) {
    setEditing(k);
    setForm({
      nama: k.nama,
      tingkat: k.tingkat,
      jurusan: k.jurusan,
      waliKelas: k.waliKelas,
      jumlahSiswa: String(k.jumlahSiswa),
    });
    setFormError(null);
    setFormOpen(true);
  }

  function validate(): string | null {
    const nama = form.nama.trim().toUpperCase();
    if (!nama) return "Nama kelas wajib diisi.";
    if (!/^[XIVLC]+[ -][A-Z]$/i.test(nama) && !/^[0-9]+[ -][A-Z]$/i.test(nama))
      return "Gunakan format nama kelas, contoh: X-A atau XII-A.";
    if (!form.waliKelas.trim()) return "Nama wali kelas wajib diisi.";
    const jumlah = Number(form.jumlahSiswa);
    if (!form.jumlahSiswa || Number.isNaN(jumlah) || !Number.isInteger(jumlah) || jumlah <= 0)
      return "Jumlah siswa harus bilangan bulat lebih dari 0.";
    const duplicate = kelas.some(
      (k) => k.nama.toUpperCase() === nama && k.id !== editing?.id
    );
    if (duplicate) return `Kelas ${nama} sudah terdaftar.`;
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      setFormError(err);
      return;
    }
    const data: Kelas = {
      id: editing?.id ?? `k${Date.now()}`,
      nama: form.nama.trim().toUpperCase(),
      tingkat: form.tingkat,
      jurusan: form.jurusan,
      waliKelas: form.waliKelas.trim(),
      jumlahSiswa: Number(form.jumlahSiswa),
    };
    if (editing) {
      setKelas((prev) => prev.map((k) => (k.id === editing.id ? data : k)));
      showToast(`Kelas ${data.nama} berhasil diperbarui.`);
    } else {
      setKelas((prev) => [...prev, data]);
      showToast(`Kelas ${data.nama} berhasil ditambahkan.`);
    }
    setFormOpen(false);
  }

  function handleDelete() {
    if (!deleting) return;
    setKelas((prev) => prev.filter((k) => k.id !== deleting.id));
    showToast(`Kelas ${deleting.nama} berhasil dihapus.`);
    setDeleting(null);
  }

  const inputClass =
    "w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all";
  const labelClass =
    "font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider block mb-1.5";

  return (
    <div className="max-w-[1280px] mx-auto">
      {/* ===== Header ===== */}
      <div className="mb-stack-lg">
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
          Manajemen Kelas
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant">
          Kelola data kelas, jurusan, dan wali kelas sekolah.
        </p>
      </div>

      {/* ===== Statistik ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter mb-stack-lg">
        <StatCard
          label="Total Kelas"
          value={String(stats.totalKelas)}
          icon="school"
          iconClass="bg-primary-container text-on-primary-container"
          sub="kelas aktif"
        />
        <StatCard
          label="Total Siswa"
          value={String(stats.totalSiswa)}
          icon="group"
          iconClass="bg-secondary-container text-on-secondary-container"
          sub="seluruh jenjang"
        />
        <StatCard
          label="Jurusan"
          value={String(stats.jurusanCount)}
          icon="account_tree"
          iconClass="bg-tertiary-container text-on-tertiary-container"
          sub="kompetensi keahlian"
        />
        <StatCard
          label="Rata-rata/Kelas"
          value={stats.rata}
          icon="insights"
          iconClass="bg-surface-tint text-on-primary"
          sub="siswa per kelas"
        />
      </div>

      {/* ===== Toolbar ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md mb-stack-lg">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="kelas-search" className={`${labelClass} sr-only`}>
              Cari Kelas
            </label>
            <div className="relative">
              <Icon
                name="search"
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                id="kelas-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama kelas, jurusan, atau wali kelas..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high rounded-full font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>
          <div className="md:w-48">
            <label htmlFor="kelas-tingkat" className={`${labelClass} sr-only`}>
              Filter Tingkat
            </label>
            <div className="relative">
              <select
                id="kelas-tingkat"
                value={tingkatFilter}
                onChange={(e) => setTingkatFilter(e.target.value)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg px-4 py-2.5 pr-10 font-body-md text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
              >
                <option value="Semua">Semua Tingkat</option>
                {TINGKAT_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <Icon
                name="expand_more"
                size={20}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
          </div>
          <div className="md:w-auto md:self-end">
            <button
              onClick={openAdd}
              className="w-full md:w-auto bg-primary text-on-primary px-5 py-2.5 rounded-lg font-label-caps text-label-caps flex items-center justify-center gap-2 hover:bg-on-primary-fixed-variant transition-colors cursor-pointer"
            >
              <Icon name="add" size={16} /> Tambah Kelas
            </button>
          </div>
        </div>
      </div>

      {/* ===== Tabel ===== */}
      <div className="bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md">
        <div className="mb-stack-md">
          <h3 className="font-title-sm text-title-sm text-on-surface">Daftar Kelas</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {filtered.length} dari {kelas.length} kelas ditampilkan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant text-on-surface-variant">
                <th className="py-3 px-4 font-label-caps text-label-caps">Nama Kelas</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Tingkat</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Jurusan</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Wali Kelas</th>
                <th className="py-3 px-4 font-label-caps text-label-caps">Jumlah Siswa</th>
                <th className="py-3 px-4 font-label-caps text-label-caps text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((k) => (
                <tr
                  key={k.id}
                  className="border-b border-surface-variant hover:bg-surface-container-lowest transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary-fixed-dim text-on-primary-fixed flex items-center justify-center font-title-sm text-title-sm font-bold shrink-0">
                        {k.nama}
                      </div>
                      <span className="font-body-md text-body-md text-on-surface font-medium">
                        {k.nama}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-caps text-label-caps">
                      {k.tingkat}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                    {k.jurusan}
                  </td>
                  <td className="py-3 px-4 font-body-sm text-body-sm text-on-surface-variant">
                    {k.waliKelas}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-body-md text-body-md text-on-surface font-medium">
                        {k.jumlahSiswa}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">siswa</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => openEdit(k)}
                      aria-label={`Edit ${k.nama}`}
                      className="text-primary p-2 hover:bg-primary-fixed-dim rounded-full transition-colors"
                    >
                      <Icon name="edit" size={20} />
                    </button>
                    <button
                      onClick={() => setDeleting(k)}
                      aria-label={`Hapus ${k.nama}`}
                      className="text-error p-2 hover:bg-error-container rounded-full transition-colors"
                    >
                      <Icon name="delete" size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <Icon name="search_off" size={32} className="text-outline mx-auto mb-2" />
                    <p className="font-body-md text-body-md text-on-surface-variant">
                      Tidak ada kelas yang cocok dengan pencarian.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== Modal Tambah/Edit ===== */}
      {formOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-sm"
          onClick={() => setFormOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="kelas-modal-title"
            className="bg-surface rounded-xl shadow-xl border border-outline-variant w-full max-w-lg p-stack-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-stack-md">
              <h2 id="kelas-modal-title" className="font-headline-md text-headline-md text-on-surface">
                {editing ? "Edit Kelas" : "Tambah Kelas"}
              </h2>
              <button
                onClick={() => setFormOpen(false)}
                aria-label="Tutup"
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full transition-colors"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-stack-md">
              <div>
                <label htmlFor="kelas-nama" className={labelClass}>
                  Nama Kelas
                </label>
                <input
                  id="kelas-nama"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="contoh: X-A"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="kelas-tingkat-input" className={labelClass}>
                    Tingkat
                  </label>
                  <div className="relative">
                    <select
                      id="kelas-tingkat-input"
                      value={form.tingkat}
                      onChange={(e) =>
                        setForm({ ...form, tingkat: e.target.value as Kelas["tingkat"] })
                      }
                      className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                    >
                      {TINGKAT_OPTIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                    <Icon
                      name="expand_more"
                      size={20}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="kelas-jurusan" className={labelClass}>
                    Jurusan
                  </label>
                  <div className="relative">
                    <select
                      id="kelas-jurusan"
                      value={form.jurusan}
                      onChange={(e) => setForm({ ...form, jurusan: e.target.value })}
                      className={`${inputClass} appearance-none pr-10 cursor-pointer`}
                    >
                      {JURUSAN_OPTIONS.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                    <Icon
                      name="expand_more"
                      size={20}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="kelas-wali" className={labelClass}>
                  Wali Kelas
                </label>
                <input
                  id="kelas-wali"
                  value={form.waliKelas}
                  onChange={(e) => setForm({ ...form, waliKelas: e.target.value })}
                  placeholder="contoh: Bpk. Budi Santoso"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="kelas-jumlah" className={labelClass}>
                  Jumlah Siswa
                </label>
                <input
                  id="kelas-jumlah"
                  type="number"
                  min={1}
                  value={form.jumlahSiswa}
                  onChange={(e) => setForm({ ...form, jumlahSiswa: e.target.value })}
                  placeholder="contoh: 32"
                  className={inputClass}
                />
              </div>

              {formError && (
                <p className="flex items-center gap-2 font-body-sm text-body-sm text-error bg-error-container/50 rounded-lg px-3 py-2">
                  <Icon name="error" size={16} filled />
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-stack-md">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low font-label-caps text-label-caps transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-primary text-on-primary font-label-caps text-label-caps hover:bg-on-primary-fixed-variant transition-colors cursor-pointer"
                >
                  {editing ? "Simpan Perubahan" : "Tambah Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== Modal Konfirmasi Hapus ===== */}
      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-inverse-surface/50 backdrop-blur-sm"
          onClick={() => setDeleting(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="kelas-delete-title"
            className="bg-surface rounded-xl shadow-xl border border-outline-variant w-full max-w-sm p-stack-lg text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto mb-stack-md">
              <Icon name="delete" size={28} filled />
            </div>
            <h2 id="kelas-delete-title" className="font-headline-md text-headline-md text-on-surface mb-2">
              Hapus Kelas {deleting.nama}?
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-stack-lg">
              Kelas dengan {deleting.jumlahSiswa} siswa akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 px-5 py-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low font-label-caps text-label-caps transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-5 py-2.5 rounded-lg bg-error text-on-error font-label-caps text-label-caps hover:bg-on-error-container transition-colors cursor-pointer"
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
    </div>
  );
}
