"use client";

import React from 'react';
import Link from 'next/link';

export const Footer = ({ theme = 'dark' }: { theme?: 'light' | 'dark' }) => {
  const isLight = theme === 'light';
  return (
    <footer className={`w-full py-4 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center text-[9px] font-bold uppercase tracking-[0.2em] gap-4 z-50 border-t ${
      isLight 
        ? 'text-slate-500 bg-slate-50/45 backdrop-blur-lg border-slate-200/60' 
        : 'text-white/40 bg-black/20 backdrop-blur-lg border-white/10'
    }`}>
      <div className="flex gap-6">
        <span>SiPetto © 2024. Hak cipta dilindungi.</span>
      </div>
      <div className="flex gap-10">
        <Link href="#" className={`transition-colors ${isLight ? 'hover:text-primary text-slate-500' : 'hover:text-white'}`}>Kebijakan Privasi</Link>
        <Link href="#" className={`transition-colors ${isLight ? 'hover:text-primary text-slate-500' : 'hover:text-white'}`}>Syarat Layanan</Link>
        <Link href="#" className={`transition-colors ${isLight ? 'hover:text-primary text-slate-500' : 'hover:text-white'}`}>Pusat Bantuan</Link>
      </div>
      <div className={isLight ? 'text-slate-500/80 font-medium' : 'text-white/50 font-medium'}>
        © 2024 SIPPETO All rights reserved.
      </div>
    </footer>
  );
};
