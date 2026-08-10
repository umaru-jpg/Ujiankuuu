"use client";

import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { HOME_BY_ROLE, ROLE_LABEL, type Role } from "@/lib/auth";

export type NavKey =
  | "dashboard"
  | "management"
  | "guru"
  | "siswa"
  | "kelas"
  | "bank"
  | "jadwal"
  | "ujian"
  | "hasil";

interface NavItem {
  key: NavKey;
  label: string;
  icon: string;
}

/** Menu navigasi per role. */
const MENU_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "management", label: "Management User", icon: "manage_accounts" },
    { key: "guru", label: "Guru", icon: "person" },
    { key: "siswa", label: "Siswa", icon: "group" },
    { key: "kelas", label: "Kelas", icon: "school" },
    { key: "bank", label: "Bank Soal", icon: "quiz" },
    { key: "jadwal", label: "Jadwal", icon: "calendar_today" },
    { key: "hasil", label: "Hasil", icon: "assessment" },
  ],
  guru: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "bank", label: "Bank Soal", icon: "quiz" },
    { key: "jadwal", label: "Jadwal", icon: "calendar_today" },
    { key: "hasil", label: "Hasil", icon: "assessment" },
  ],
  siswa: [
    { key: "dashboard", label: "Dashboard", icon: "dashboard" },
    { key: "jadwal", label: "Jadwal", icon: "calendar_today" },
    { key: "ujian", label: "Ujian", icon: "edit_note" },
    { key: "hasil", label: "Hasil", icon: "assessment" },
  ],
};

interface SideNavProps {
  active: NavKey;
  role: Role;
  open: boolean;
  onClose: () => void;
}

function NavContent({
  active,
  role,
  onNavigate,
}: {
  active: NavKey;
  role: Role;
  onNavigate?: () => void;
}) {
  const router = useRouter();

  return (
    <>
      <div className="px-6 mb-8 flex flex-col gap-2">
        <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
          Ujiankuuu
        </span>
        <span className="font-body-sm text-body-sm text-on-surface-variant">SMK Jakarta Pusat 1</span>
        <span className="inline-flex self-start items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-primary-container text-on-primary-container text-[11px] font-semibold uppercase tracking-wider">
          {ROLE_LABEL[role]}
        </span>
      </div>
      <ul className="flex flex-col gap-2 px-3 flex-grow">
        {MENU_BY_ROLE[role].map((item) => {
          const isActive = item.key === active;
          return (
            <li key={item.key}>
              <button
                onClick={() => {
                  onNavigate?.();
                  // Hanya Dashboard yang punya halaman saat ini; menu lain menunggu halamannya dibuat.
                  if (item.key === "dashboard") router.push(HOME_BY_ROLE[role]);
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg font-title-sm text-title-sm transition-colors cursor-pointer active:scale-95 duration-200 ${
                  isActive
                    ? "bg-secondary-container dark:bg-secondary text-on-secondary-container dark:text-on-secondary border-l-4 border-primary"
                    : "text-secondary dark:text-secondary-fixed hover:bg-surface-container-low dark:hover:bg-surface-variant"
                }`}
              >
                <Icon name={item.icon} filled={isActive} />
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="px-6 mt-auto">
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-primary-container text-on-primary rounded-lg font-title-sm text-title-sm hover:bg-primary transition-colors">
          <Icon name="help" size={20} />
          Bantuan
        </button>
      </div>
    </>
  );
}

export default function SideNav({ active, role, open, onClose }: SideNavProps) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-inverse-surface/50 backdrop-blur-sm z-40 md:hidden transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden="true"
      />
      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 h-screen w-[260px] bg-surface border-r border-outline-variant shadow-xl z-50 flex flex-col py-stack-lg transition-transform duration-300 md:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavContent active={active} role={role} onNavigate={onClose} />
      </aside>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-screen w-[260px] bg-surface dark:bg-inverse-surface border-r border-outline-variant dark:border-outline shadow-sm py-stack-lg z-50">
        <NavContent active={active} role={role} />
      </aside>
    </>
  );
}
