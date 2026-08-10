"use client";

import ComingSoon from "@/components/ComingSoon";
import DashboardLayout, {
  useDashboardUser,
} from "@/components/dashboard/DashboardLayout";

export default function GuruPage() {
  const user = useDashboardUser();

  return (
    <DashboardLayout active="dashboard" allowedRoles={["guru"]}>
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-stack-lg">
          <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">
            Selamat Datang, {user?.name ?? "Guru"}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Kelola bank soal, jadwal, dan hasil ujian Anda.
          </p>
        </div>
        <ComingSoon
          title="Halaman Guru Sedang Dikembangkan"
          description="Halaman untuk mengelola bank soal, jadwal ujian, dan penilaian akan segera hadir. Untuk saat ini, Anda dapat mencoba login dengan akun admin dan menjelajahi dashboard admin."
          roleLabel="Guru"
        />
      </div>
    </DashboardLayout>
  );
}
