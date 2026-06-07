"use client";

import React from 'react';
import Link from 'next/link';

export const Navbar = ({ theme = 'dark' }: { theme?: 'light' | 'dark' }) => {
  const isLight = theme === 'light';
  return (
    <nav className={`w-full py-4 px-6 md:px-10 flex justify-between items-center z-10 ${isLight ? 'text-slate-800' : 'text-white/90'}`}>
      <div className="flex items-center gap-2 group cursor-pointer">
        <Link href="/">
          <img
            src="/logo/logo_navbar.png"
            alt="Sippeto Logo"
            className="h-8 md:h-10 w-auto object-contain transition-all duration-300 hover:scale-105 active:scale-95"
          />
        </Link>
      </div>
      <div className="flex items-center gap-6 text-sm font-bold uppercase tracking-widest leading-none">
        <Link 
          href="/login" 
          className={`px-5 py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 ${
            isLight 
              ? 'bg-primary text-white border-primary hover:bg-primary/95 shadow-md shadow-primary/10' 
              : 'bg-white/10 text-white border-white/20 hover:bg-white/20 backdrop-blur-md'
          }`}
        >
          Login
        </Link>
      </div>
    </nav>
  );
};

