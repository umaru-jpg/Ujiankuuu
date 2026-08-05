"use client";

import dynamic from "next/dynamic";
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

const SCHEDULES = [
  {
    mapel: "Matematika Dasar",
    kelas: "X RPL 1",
    waktu: "08:00 - 10:00",
    status: "Aktif",
    badge: "bg-secondary-container text-on-secondary-container",
  },
  {
    mapel: "Bahasa Indonesia",
    kelas: "XI TKJ 2",
    waktu: "10:30 - 12:00",
    status: "Selesai",
    badge: "bg-surface-variant text-on-surface-variant",
  },
  {
    mapel: "Pemrograman Web",
    kelas: "XII RPL",
    waktu: "13:00 - 15:00",
    status: "Besok",
    badge: "bg-primary-fixed text-on-primary-fixed",
  },
];

const ACTIVITIES = [
  {
    icon: "done",
    active: true,
    title: "Ujian MTK Selesai",
    subtitle: "Kelas X RPL 1",
    withCard: true,
  },
  {
    icon: "upload_file",
    active: false,
    title: "Soal Baru Diunggah",
    subtitle: "Oleh Bpk. Budi",
    withCard: false,
  },
  {
    icon: "person_add",
    active: false,
    title: "5 Siswa Baru",
    subtitle: "Sistem diupdate",
    withCard: false,
  },
];

export default function AdminDashboardPage() {
  const user = useDashboardUser();

  return (
    <DashboardLayout active="dashboard" allowedRoles={["admin"]}>
      <div className="max-w-[1280px] mx-auto">
        {/* Welcome Banner */}
        <div className="mb-stack-lg">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
            Selamat Datang, {user?.name ?? "Admin"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Ringkasan aktivitas hari ini di SMK Jakarta Pusat 1.
          </p>
        </div>

        {/* Bento Grid: Stats & Charts */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-stack-lg">
          <StatCard label="Total Guru" value="45" icon="person" />
          <StatCard label="Total Siswa" value="850" icon="group" />
          <StatCard label="Total Mapel" value="32" icon="menu_book" />
          <StatCard label="Ujian Aktif" value="5" icon="assignment" tone="error" />
          <Charts />
        </div>

        {/* Bottom Section: Table & Activity List */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table */}
          <div className="col-span-1 lg:col-span-2 bg-surface rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center">
              <h2 className="font-title-sm text-title-sm text-on-surface">
                Jadwal Ujian Terbaru
              </h2>
              <button className="text-primary font-label-caps text-label-caps hover:underline">
                Lihat Semua
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left font-body-sm text-body-sm">
                <thead className="bg-[#F8FAFC] text-on-surface-variant border-b border-outline-variant/30">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Mata Pelajaran</th>
                    <th className="px-6 py-4 font-semibold">Kelas</th>
                    <th className="px-6 py-4 font-semibold">Waktu</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {SCHEDULES.map((row) => (
                    <tr
                      key={row.mapel}
                      className="border-b border-outline-variant/10 last:border-b-0 hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-on-surface">{row.mapel}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{row.kelas}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{row.waktu}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${row.badge}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity List */}
          <div className="col-span-1 bg-surface rounded-xl p-6 shadow-sm border border-outline-variant/30 flex flex-col">
            <h2 className="font-title-sm text-title-sm text-on-surface mb-6">
              Aktivitas Terbaru
            </h2>
            <div className="flex flex-col gap-6 relative before:absolute before:inset-0 before:ml-[15px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-outline-variant/30 before:to-transparent">
              {ACTIVITIES.map((item) => (
                <div
                  key={item.title}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group"
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full border-2 border-surface shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 ${
                      item.active
                        ? "bg-primary text-on-primary"
                        : "bg-surface-variant text-on-surface-variant"
                    }`}
                  >
                    <Icon name={item.icon} size={16} />
                  </div>
                  <div
                    className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] ml-4 md:ml-0 ${
                      item.withCard ? "bg-surface p-3 rounded-lg border border-outline-variant/30 shadow-sm" : "p-3"
                    }`}
                  >
                    <p className="font-title-sm text-sm text-on-surface">{item.title}</p>
                    <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                      {item.subtitle}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
