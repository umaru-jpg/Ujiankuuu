"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SideNav, { type NavKey } from "@/components/dashboard/SideNav";
import TopNav from "@/components/dashboard/TopNav";
import { getSession, HOME_BY_ROLE, type Role, type User } from "@/lib/auth";

const DashboardUserContext = createContext<User | null>(null);

export function useDashboardUser(): User | null {
  return useContext(DashboardUserContext);
}

interface DashboardLayoutProps {
  active: NavKey;
  /** Roles yang boleh mengakses halaman ini; selain itu dialihkan ke home masing-masing. */
  allowedRoles?: Role[];
  /** Kelas Tailwind tambahan untuk area konten <main> (mis. warna latar per halaman). */
  contentClassName?: string;
  children: React.ReactNode;
}

export default function DashboardLayout({
  active,
  allowedRoles,
  contentClassName = "bg-[#F8FAFC]",
  children,
}: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Ref agar effect tidak terpicu ulang oleh identitas array allowedRoles dari parent.
  const allowedRolesRef = useRef(allowedRoles);
  allowedRolesRef.current = allowedRoles;

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace("/login");
      return;
    }
    const roles = allowedRolesRef.current;
    if (roles && !roles.includes(session.role)) {
      router.replace(HOME_BY_ROLE[session.role]);
      return;
    }
    setUser(session);
    setReady(true);
  }, [router]);

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Ujiankuuu" className="w-16 h-16 object-contain" />
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <DashboardUserContext.Provider value={user}>
      <div className="flex min-h-screen bg-background text-on-background antialiased">
        <SideNav active={active} role={user.role} open={navOpen} onClose={() => setNavOpen(false)} />
        <div className="flex-grow flex flex-col min-h-screen md:ml-[260px] w-full">
          <TopNav user={user} onMenuClick={() => setNavOpen(true)} />
          <main className={`flex-grow p-4 md:p-margin-desktop ${contentClassName}`}>{children}</main>
        </div>
      </div>
    </DashboardUserContext.Provider>
  );
}
