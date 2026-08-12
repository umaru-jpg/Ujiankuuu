"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import KelasManager from "@/components/kelas/KelasManager";

export default function KelasPage() {
  return (
    <DashboardLayout active="kelas" allowedRoles={["admin"]}>
      <KelasManager />
    </DashboardLayout>
  );
}
