"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Home, LogIn, UserPlus, Menu, X } from 'lucide-react';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-8 pt-6 relative z-50">
      <nav className="w-full py-3.5 px-6 md:px-8 flex justify-between items-center bg-white/45 border border-white/20 rounded-2xl backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] relative">
        <div className="flex items-center gap-2 group cursor-pointer">
          <Link href="/">
            <img
              src="/logo/logo_navbar.png"
              alt="SiPetto Logo"
              className="h-8 md:h-9 w-auto object-contain transition-all duration-300 hover:scale-105 active:scale-95"
            />
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold leading-none">
          <Link 
            href="/" 
            className="px-4 py-2.5 rounded-xl border border-zinc-200/50 hover:border-zinc-300/80 bg-white/50 hover:bg-white/80 text-zinc-800 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <Home className="w-3.5 h-3.5 text-zinc-700" />
            <span>Home</span>
          </Link>
          <Link 
            href="/login" 
            className="px-4 py-2.5 rounded-xl border border-zinc-200/50 hover:border-zinc-300/80 bg-white/50 hover:bg-white/80 text-zinc-800 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-1.5 shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5 text-zinc-700" />
            <span>Masuk</span>
          </Link>
          <Link 
            href="/register" 
            className="px-4 py-2.5 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5 text-white" />
            <span>Registrasi</span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="sm:hidden p-2 rounded-xl border border-zinc-200/50 bg-white/50 hover:bg-white/80 text-zinc-800 transition-all duration-200 focus:outline-none"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-white/95 border border-zinc-200/60 rounded-2xl backdrop-blur-2xl shadow-xl flex flex-col gap-2 sm:hidden animate-in slide-in-from-top-2 duration-200 z-50">
            <Link 
              href="/" 
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-150/40 hover:border-zinc-200 bg-white/80 hover:bg-zinc-50 text-zinc-800 transition-all flex items-center gap-2.5 text-xs font-bold shadow-sm"
            >
              <Home className="w-4 h-4 text-zinc-700" />
              <span>Home</span>
            </Link>
            <Link 
              href="/login" 
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-3 rounded-xl border border-zinc-150/40 hover:border-zinc-200 bg-white/80 hover:bg-zinc-50 text-zinc-800 transition-all flex items-center gap-2.5 text-xs font-bold shadow-sm"
            >
              <LogIn className="w-4 h-4 text-zinc-700" />
              <span>Masuk</span>
            </Link>
            <Link 
              href="/register" 
              onClick={() => setIsOpen(false)}
              className="w-full px-4 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-500 shadow-md transition-all flex items-center gap-2.5 text-xs font-bold justify-center"
            >
              <UserPlus className="w-4 h-4 text-white" />
              <span>Registrasi</span>
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
};

