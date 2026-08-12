"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import {
  getSession,
  HOME_BY_ROLE,
  login,
  type User,
} from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sudah login? langsung masuk ke halamannya
  useEffect(() => {
    const session = getSession();
    if (session) router.replace(HOME_BY_ROLE[session.role]);
  }, [router]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    // Simulasi proses autentikasi (frontend-only)
    setTimeout(() => {
      const user: User | null = login(identifier, password, remember);
      if (user) {
        router.push(HOME_BY_ROLE[user.role]);
      } else {
        setError("Username atau password salah. Silakan coba lagi.");
        setLoading(false);
      }
    }, 450);
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-center font-body-md text-body-md antialiased p-margin-mobile md:p-margin-desktop">
      {/* ===== Login Container ===== */}
      <main className="w-full max-w-[440px] bg-surface-container-lowest rounded-xl shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] border border-outline-variant/30 p-stack-lg md:p-10 relative overflow-hidden">
        {/* Subtle decorative element */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary-fixed rounded-full blur-3xl opacity-40 pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col items-center mb-stack-lg relative z-10">
          <img
            alt="Ujiankuuu Logo"
            className="w-16 h-16 mb-4 object-contain"
            src="/logo.png"
          />
          <h1 className="font-headline-md text-headline-md text-on-surface text-center">
            Masuk ke Ujiankuuu
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-center">
            Portal Ujian SMK Jakarta Pusat 1
          </p>
        </div>

        {/* Form */}
        <form className="space-y-stack-md relative z-10" onSubmit={handleSubmit}>
          {/* Error / Notice */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg bg-error-container px-4 py-3 text-on-error-container font-body-sm text-body-sm"
            >
              <Icon name="error" size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {notice && !error && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-lg bg-secondary-container px-4 py-3 text-on-secondary-container font-body-sm text-body-sm"
            >
              <Icon name="info" size={18} className="mt-0.5 shrink-0" />
              <span>{notice}</span>
            </div>
          )}

          {/* Email/Username Field */}
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-2" htmlFor="identifier">
              Email atau Username
            </label>
            <div className="relative">
              <Icon name="person" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="identifier"
                name="identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Masukkan email atau username"
                className="w-full pl-10 pr-4 py-3 bg-surface-container hover:bg-surface-container-high focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary border-transparent rounded-lg font-body-md text-body-md text-on-surface transition-colors placeholder:text-outline"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block font-title-sm text-title-sm text-on-surface mb-2" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Icon name="lock" size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
                className="w-full pl-10 pr-10 py-3 bg-surface-container hover:bg-surface-container-high focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-primary border-transparent rounded-lg font-body-md text-body-md text-on-surface transition-colors placeholder:text-outline"
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface-variant transition-colors focus:outline-none"
              >
                <Icon name={showPassword ? "visibility" : "visibility_off"} size={20} />
              </button>
            </div>
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between pt-2 pb-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                id="remember"
                name="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-outline text-primary focus:ring-primary focus:ring-offset-background bg-surface-container"
              />
              <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface transition-colors">
                Ingat Saya
              </span>
            </label>
            <button
              type="button"
              onClick={() =>
                setNotice("Hubungi Admin IT untuk mereset password Anda.")
              }
              className="font-title-sm text-[14px] leading-[20px] font-semibold text-primary hover:text-primary-container transition-colors"
            >
              Lupa Password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[44px] bg-primary hover:bg-primary-container text-on-primary font-title-sm text-title-sm rounded-lg py-3 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-sm shadow-primary/20 hover:shadow-md hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <span>Masuk</span>
                <Icon name="arrow_forward" size={20} />
              </>
            )}
          </button>
        </form>

        {/* Footer Help */}
        <div className="mt-stack-lg text-center relative z-10">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Butuh bantuan akses?{" "}
            <button
              type="button"
              onClick={() =>
                setNotice("Silakan hubungi Admin IT SMK Jakarta Pusat 1.")
              }
              className="text-primary hover:underline font-semibold"
            >
              Hubungi Admin IT
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
