"use client";

import React from 'react';
import Link from 'next/link';
import { Home, LogIn, UserPlus } from 'lucide-react';

export const Navbar = () => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 relative z-50">
      <nav className="w-full py-3.5 px-6 md:px-8 flex justify-between items-center bg-white/45 border border-white/20 rounded-2xl backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2 group cursor-pointer">
          <Link href="/">
            <img
              src="/logo/logo_navbar.png"
              alt="SiPetto Logo"
              className="h-8 md:h-9 w-auto object-contain transition-all duration-300 hover:scale-105 active:scale-95"
            />
          </Link>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold leading-none">
          <Link 
            href="/" 
            className="px-4 py-2.5 rounded-xl border border-zinc-200/50 hover:border-zinc-300/80 bg-white/50 hover:bg-white/80 text-zinc-800 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <Home className="w-3.5 h-3.5 text-zinc-700" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Link 
            href="/login" 
            className="px-4 py-2.5 rounded-xl border border-zinc-200/50 hover:border-zinc-300/80 bg-white/50 hover:bg-white/80 text-zinc-800 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5 text-zinc-700" />
            <span className="hidden sm:inline">Masuk</span>
          </Link>
          <Link 
            href="/register" 
            className="px-4 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Registrasi</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

