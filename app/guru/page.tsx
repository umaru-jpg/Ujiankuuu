"use client";

import Icon from "@/components/Icon";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";

const STATS = [
  {
    label: "Total Kelas",
    value: "12",
    icon: "school",
    iconClass: "bg-primary-container text-on-primary-container",
  },
  {
    label: "Total Siswa",
    value: "340",
    icon: "group",
    iconClass: "bg-secondary-container text-on-secondary-container",
  },
  {
    label: "Ujian Aktif",
    value: "3",
    icon: "assignment",
    iconClass: "bg-tertiary-container text-on-tertiary-container",
  },
  {
    label: "Rata-rata Nilai",
    value: "78.5",
    icon: "task_alt",
    iconClass: "bg-surface-tint text-on-primary",
  },
];

const SCHEDULES = [
  { day: "15", month: "Okt", title: "Matematika Dasar - Kelas X-A", time: "08:00 - 10:00 WIB" },
  { day: "16", month: "Okt", title: "Fisika Terapan - Kelas XI-B", time: "10:30 - 12:30 WIB" },
];

const CHART_BARS = [
  "bg-secondary-fixed-dim h-[40%]",
  "bg-primary-fixed-dim h-[65%]",
  "bg-primary h-[85%]",
  "bg-primary-fixed-dim h-[55%]",
  "bg-secondary-fixed-dim h-[30%]",
];

const QUESTIONS = [
  {
    title: "Aljabar Linear",
    subject: "Matematika",
    difficulty: "Sulit",
    difficultyClass: "text-error",
    status: "Draft",
    statusClass: "bg-surface-container-high text-on-surface",
  },
  {
    title: "Hukum Newton",
    subject: "Fisika",
    difficulty: "Sedang",
    difficultyClass: "text-tertiary",
    status: "Aktif",
    statusClass: "bg-primary-fixed-dim text-on-primary-fixed",
  },
];

/**
 * Disambut dengan nama guru.
 * Dirender DI DALAM DashboardLayout agar useDashboardUser() membaca context
 * user yang benar (di tingkat halaman, context belum tersedia).
 */
function GuruWelcome() {
  const user = useDashboardUser();

  return (
    <div className="mb-stack-lg">
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
        Selamat Datang, {user?.name ?? "Guru"}.
      </h1>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Berikut adalah ringkasan aktivitas dan jadwal Anda hari ini.
      </p>
    </div>
  );
}

export default function GuruPage() {
  return (
    <DashboardLayout active="dashboard" allowedRoles={["guru"]}>
      <div className="max-w-container-max mx-auto">
        {/* Header */}
        <GuruWelcome />

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter mb-stack-lg">
          {/* Stats Row */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-gutter">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-surface rounded-xl p-4 shadow-sm border border-outline-variant flex items-center gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-full ${stat.iconClass} flex items-center justify-center`}
                >
                  <Icon name={stat.icon} size={24} />
                </div>
                <div>
                  <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="font-headline-md text-headline-md text-on-surface">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Jadwal Ujian Mendatang */}
          <div className="lg:col-span-7 bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md flex flex-col">
            <div className="flex justify-between items-center mb-stack-md">
              <h3 className="font-title-sm text-title-sm text-on-surface">Jadwal Ujian Mendatang</h3>
              <button className="text-primary font-label-caps text-label-caps hover:underline">
                Lihat Semua
              </button>
            </div>
            <div className="flex-1 space-y-4">
              {SCHEDULES.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-4 p-4 rounded-lg bg-surface-container-lowest border border-outline-variant hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex-shrink-0 w-16 h-16 bg-primary-fixed-dim rounded-lg flex flex-col items-center justify-center text-on-primary-fixed">
                    <span className="font-headline-md text-headline-md font-bold leading-none">
                      {item.day}
                    </span>
                    <span className="font-label-caps text-label-caps">{item.month}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-title-sm text-title-sm text-on-surface">{item.title}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1 mt-1">
                      <Icon name="schedule" size={16} /> {item.time}
                    </p>
                  </div>
                  <div>
                    <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-caps text-label-caps text-on-surface">
                      Persiapan
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Grafik Performa Siswa */}
          <div className="lg:col-span-5 bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md flex flex-col">
            <h3 className="font-title-sm text-title-sm text-on-surface mb-stack-md">
              Grafik Performa Siswa
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[250px] bg-surface-container-lowest rounded-lg border border-outline-variant border-dashed">
              <div className="w-full h-full p-4 flex items-end gap-2 justify-between">
                {CHART_BARS.map((barClass, i) => (
                  <div key={i} className={`w-1/6 rounded-t-sm ${barClass}`} />
                ))}
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="font-label-caps text-label-caps text-on-surface-variant bg-surface px-2 py-1 rounded shadow-sm">
                  Trend Nilai Rata-rata
                </p>
              </div>
            </div>
          </div>

          {/* Daftar Soal Terbaru */}
          <div className="lg:col-span-12 bg-surface rounded-xl shadow-sm border border-outline-variant p-stack-md">
            <div className="flex justify-between items-center mb-stack-md">
              <h3 className="font-title-sm text-title-sm text-on-surface">Daftar Soal Terbaru</h3>
              <button className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps text-label-caps flex items-center gap-2 hover:bg-on-primary-fixed-variant transition-colors h-11">
                <Icon name="add" size={16} /> Tambah Soal
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant text-on-surface-variant">
                    <th className="py-3 px-4 font-label-caps text-label-caps">Mata Pelajaran</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps">Tingkat Kesulitan</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps">Status</th>
                    <th className="py-3 px-4 font-label-caps text-label-caps text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {QUESTIONS.map((q) => (
                    <tr
                      key={q.title}
                      className="border-b border-surface-variant hover:bg-surface-container-lowest transition-colors"
                    >
                      <td className="py-3 px-4">
                        <p className="font-body-md text-body-md text-on-surface font-medium">
                          {q.title}
                        </p>
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          {q.subject}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`font-body-sm text-body-sm font-medium ${q.difficultyClass}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${q.statusClass}`}>
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          aria-label={`Edit ${q.title}`}
                          className="text-primary p-2 hover:bg-primary-fixed-dim rounded-full transition-colors"
                        >
                          <Icon name="edit" size={20} />
                        </button>
                        <button
                          aria-label={`Hapus ${q.title}`}
                          className="text-error p-2 hover:bg-error-container rounded-full transition-colors"
                        >
                          <Icon name="delete" size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
