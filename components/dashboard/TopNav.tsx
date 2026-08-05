"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { logout, ROLE_LABEL, type User } from "@/lib/auth";

interface TopNavProps {
  user: User;
  onMenuClick: () => void;
}

export default function TopNav({ user, onMenuClick }: TopNavProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    logout();
    window.location.href = "/login";
  }

  return (
    <header className="sticky top-0 z-30 bg-surface dark:bg-surface-container border-b border-outline-variant dark:border-outline shadow-sm flex justify-between items-center px-margin-desktop py-4 w-full">
      {/* Mobile brand + hamburger (SideNav handles desktop) */}
      <div className="md:hidden flex items-center gap-3">
        <button
          onClick={onMenuClick}
          aria-label="Buka menu"
          className="p-2 -ml-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-lg transition-colors"
        >
          <Icon name="menu" size={24} />
        </button>
        <span className="font-headline-md text-headline-md font-extrabold text-primary">Ujiankuuu</span>
      </div>

      {/* Search (desktop) */}
      <div className="hidden md:flex items-center bg-surface-container-low rounded-lg px-3 py-2 w-full max-w-md border border-outline-variant focus-within:border-primary transition-colors">
        <Icon name="search" className="text-outline" />
        <input
          name="search"
          className="bg-transparent border-none focus:ring-0 w-full font-body-sm text-body-sm text-on-surface ml-2 outline-none placeholder:text-outline"
          placeholder="Cari siswa, guru, atau ujian..."
          type="text"
        />
      </div>

      <div className="flex items-center gap-stack-md ml-auto">
        <button
          aria-label="Notifikasi"
          className="p-2 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-surface-container-low relative"
        >
          <Icon name="notifications" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full" />
        </button>
        <button
          aria-label="Bantuan"
          className="p-2 text-on-surface-variant hover:text-primary transition-all rounded-full hover:bg-surface-container-low hidden sm:block"
        >
          <Icon name="help" />
        </button>
        <div className="h-6 w-px bg-outline-variant mx-2 hidden sm:block" />

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 hover:bg-surface-container-low p-1 rounded-lg transition-colors"
          >
            <div
              className={`w-8 h-8 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white text-sm font-bold border border-outline-variant shadow-sm`}
            >
              {user.initial}
            </div>
            <span className="font-title-sm text-title-sm hidden sm:block">{user.name}</span>
            <Icon
              name={profileOpen ? "expand_less" : "expand_more"}
              size={20}
              className="text-on-surface-variant hidden sm:block"
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-surface-container-lowest rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] border border-outline-variant/30 p-4 z-50">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-white text-lg font-bold shrink-0`}
                >
                  {user.initial}
                </div>
                <div className="min-w-0">
                  <p className="font-title-sm text-title-sm text-on-surface truncate">{user.name}</p>
                  <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{user.title}</p>
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {ROLE_LABEL[user.role]}
                  </span>
                </div>
              </div>
              <div className="h-px bg-outline-variant/40 my-3" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-error hover:bg-error-container/50 font-title-sm text-title-sm text-sm transition-colors"
              >
                <Icon name="logout" size={18} />
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
