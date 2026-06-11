"use client";

import React, { useRef, useState, useEffect } from "react";
import { Search, User, Menu, LogOut, ChevronDown, Settings } from "lucide-react";
import { useSidebar } from "@/lib/context/SidebarContext";
import { useRouter } from "next/navigation";
import { NotificationDropdown } from "@/components/dashboard/NotificationDropdown";

interface CurrentUser {
  id: string;
  email: string;
  full_name: string | null;
  role_name: string | null;
}

export const DashboardHeader = () => {
  const { toggleSidebar } = useSidebar();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Fetch data user yang sedang login
  useEffect(() => {
    fetch("/api/auth/me")
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setCurrentUser(data); })
      .catch(() => {});
  }, []);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setDropdownOpen(false);
    setLoggingOut(true);
    try {
      // Hancurkan cookie token (httpOnly) via server
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Tetap lanjut logout meski request gagal
    } finally {
      // Bersihkan cookie non-httpOnly yang bisa diakses JS
      document.cookie.split(";").forEach(cookie => {
        const name = cookie.split("=")[0].trim();
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      });

      // Bersihkan localStorage & sessionStorage
      try { localStorage.clear(); } catch {}
      try { sessionStorage.clear(); } catch {}

      // Reset state user agar UI bersih sebelum redirect
      setCurrentUser(null);
      setLoggingOut(false);

      // Redirect ke halaman login & replace history agar tombol back tidak kembali ke dashboard
      router.replace("/login");
    }
  };

  // Nama tampil: full_name > email prefix > "Pengguna"
  const displayName = currentUser?.full_name
    || currentUser?.email?.split("@")[0]
    || "Pengguna";

  // Initial avatar dari huruf pertama nama
  const avatarInitial = displayName.charAt(0).toUpperCase();

  // Role tampil
  const displayRole = currentUser?.role_name ?? "—";

  return (
    <header className="h-20 bg-white border-b border-zinc-100 px-4 md:px-8 flex items-center justify-between shadow-sm z-[70] shrink-0" suppressHydrationWarning>
      {/* Search Bar & Toggle */}
      <div className="flex-1 flex items-center gap-4 max-w-xl">
        <button
          onClick={toggleSidebar}
          className="p-2 bg-zinc-50 hover:bg-zinc-100 rounded-xl transition-colors border border-zinc-100"
          suppressHydrationWarning
        >
          <Menu className="w-6 h-6 text-zinc-600" />
        </button>

        <div className="relative group w-full hidden sm:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input
            type="text"
            placeholder="Cari sesuatu..."
            className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-2.5 pl-11 pr-4 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white text-sm font-medium transition-all"
            suppressHydrationWarning
          />
        </div>
        <button className="sm:hidden p-2 bg-zinc-50 rounded-xl" suppressHydrationWarning>
          <Search className="w-5 h-5 text-zinc-500" />
        </button>
      </div>

      {/* Nav Links & Action */}
      <div className="flex items-center gap-3 md:gap-8">
        <nav className="hidden xl:flex items-center gap-6" />

        {/* User & Actions */}
        <div className="flex items-center gap-2 md:gap-4 border-l border-zinc-100 pl-3 md:pl-8">
          <NotificationDropdown />

          {/* Profile Dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              className="flex items-center gap-3 cursor-pointer px-1 py-1 rounded-xl hover:bg-zinc-50 transition-colors"
              suppressHydrationWarning
            >
              {/* Avatar */}
              <div className="relative w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-zinc-100 hover:border-indigo-200 transition-all shrink-0">
                {currentUser ? (
                  <div className="bg-indigo-50 w-full h-full flex items-center justify-center">
                    <span className="text-indigo-600 font-bold text-sm md:text-base">{avatarInitial}</span>
                  </div>
                ) : (
                  <div className="bg-zinc-100 w-full h-full flex items-center justify-center">
                    <User className="w-5 h-5 md:w-6 md:h-6 text-zinc-400" />
                  </div>
                )}
              </div>

              {/* Nama & Role */}
              <div className="hidden md:block text-left min-w-0">
                <p className="text-sm font-bold text-zinc-800 leading-tight tracking-tight truncate max-w-[120px]">
                  {currentUser ? displayName : <span className="inline-block w-20 h-3 bg-zinc-100 rounded animate-pulse" />}
                </p>
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none mt-0.5">
                  {currentUser ? displayRole : <span className="inline-block w-14 h-2 bg-zinc-100 rounded animate-pulse mt-1" />}
                </p>
              </div>

              <ChevronDown
                className={`hidden md:block w-4 h-4 text-zinc-400 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : "rotate-0"}`}
              />
            </button>

            {/* Dropdown Panel */}
            <div
              className={`absolute right-0 top-[calc(100%+10px)] w-56 bg-white border border-zinc-100 rounded-2xl shadow-xl shadow-zinc-200/60 overflow-hidden transition-all duration-200 origin-top-right z-[9999]
                ${dropdownOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
            >
              {/* User Info */}
              <div className="px-4 py-3.5 border-b border-zinc-100 bg-zinc-50/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                    {currentUser ? (
                      <span className="text-indigo-600 font-bold text-sm">{avatarInitial}</span>
                    ) : (
                      <User className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-800 truncate">{displayName}</p>
                    <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">{displayRole}</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-1.5">
                <button
                  onClick={() => { setDropdownOpen(false); router.push("/backend/admin/settings"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                  suppressHydrationWarning
                >
                  <Settings className="w-4 h-4 text-zinc-400" />
                  Pengaturan Akun
                </button>
              </div>

              {/* Divider + Logout */}
              <div className="border-t border-zinc-100 py-1.5">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  suppressHydrationWarning
                >
                  {loggingOut ? (
                    <>
                      <span className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
                      Keluar...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4" />
                      Keluar / Logout
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
