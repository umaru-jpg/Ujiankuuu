"use client";

import ComingSoon from "@/components/ComingSoon";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";

export default function SiswaPage() {
  const user = useDashboardUser();

  return (
    <DashboardLayout active="siswa" allowedRoles={["siswa"]}>
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-stack-lg">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
            Selamat Datang, {user?.name ?? "Siswa"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Kerjakan ujian dan lihat hasil kamu di sini.
          </p>
        </div>
        <ComingSoon
          title="Halaman Siswa Sedang Dikembangkan"
          description="Halaman untuk mengerjakan ujian, melihat jadwal, dan hasil nilai akan segera hadir. Untuk saat ini, Anda dapat mencoba login dengan akun admin dan menjelajahi dashboard admin."
          roleLabel="Siswa"
        />
      </div>
    </DashboardLayout>
  );
}
