"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Sparkles } from 'lucide-react';
import { toast } from 'react-toastify';
import { getRedirectByRole } from '@/lib/roleRedirects';

export const LoginCard = ({ theme = 'dark' }: { theme?: 'light' | 'dark' }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const isLight = theme === 'light';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Terjadi kesalahan saat login.');
        return;
      }

      toast.success('Login berhasil!');

      // Redirect berdasarkan role — konfigurasi ada di src/lib/roleRedirects.ts
      const redirectPath = getRedirectByRole(data.user?.role_name);
      router.push(redirectPath);

    } catch (err) {
      toast.error('Gagal terhubung ke server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center lg:justify-end animate-in fade-in zoom-in duration-700 delay-200 w-full">
      <div className={`w-full max-w-[440px] xl:max-w-[480px] p-6 lg:p-7 rounded-[2rem] relative overflow-hidden group shadow-2xl transition-all duration-300 ${
        isLight 
          ? 'bg-blue-50/90 backdrop-blur-xl border border-blue-200/80 shadow-[0_12px_40px_rgba(30,64,175,0.08)]' 
          : 'glass shadow-[0_0_40px_rgba(30,64,175,0.2)]'
      }`}>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/5 blur-3xl rounded-full" />
        
        <div className="relative space-y-4 xl:space-y-5">
          <div className="space-y-0.5 text-center lg:text-left">
            <h2 className={`text-2xl xl:text-3xl font-bold tracking-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>Login Akun</h2>
            <p className={`font-medium text-[11px] xl:text-xs flex items-center justify-center lg:justify-start gap-1.5 ${isLight ? 'text-slate-400' : 'text-blue-100/70'}`}>
              Mulai sekarang <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-primary/60' : 'text-blue-100/70'}`} />
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-3 xl:space-y-4">
            <div className="space-y-1">
              <label className={`text-[9px] xl:text-[10px] font-black uppercase tracking-[0.1em] ml-1 ${isLight ? 'text-slate-500' : 'text-blue-100/90'}`}>Email</label>
              <div className="relative group/input">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  isLight 
                    ? 'text-slate-400 group-focus-within/input:text-primary' 
                    : 'text-white/40 group-focus-within/input:text-white'
                }`} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email" 
                  className={`w-full border outline-none text-xs font-medium transition-all rounded-xl py-2 xl:py-2.5 pl-10 pr-4 ${
                    isLight 
                      ? 'bg-white/80 border-blue-100/80 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary/50' 
                      : 'bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/20 focus:bg-white/10'
                  }`}
                  required
                  suppressHydrationWarning
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className={`text-[9px] xl:text-[10px] font-black uppercase tracking-[0.1em] ml-1 ${isLight ? 'text-slate-500' : 'text-blue-100/90'}`}>Password</label>
              <div className="relative group/input">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                  isLight 
                    ? 'text-slate-400 group-focus-within/input:text-primary' 
                    : 'text-white/40 group-focus-within/input:text-white'
                }`} />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className={`w-full border outline-none text-xs font-medium transition-all rounded-xl py-2 xl:py-2.5 pl-10 pr-10 ${
                    isLight 
                      ? 'bg-white/80 border-blue-100/80 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary/50' 
                      : 'bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-2 focus:ring-white/20 focus:bg-white/10'
                  }`}
                  required
                  suppressHydrationWarning
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors ${isLight ? 'text-slate-400 hover:text-slate-600' : 'text-white/40 hover:text-white'}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className={`flex items-center justify-between text-[10px] font-bold px-1 pt-0.5 ${isLight ? 'text-slate-500' : 'text-blue-100/80'}`}>
              <label className="flex items-center gap-2 cursor-pointer group/check">
                <div className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center transition-all ${
                  isLight 
                    ? 'border border-blue-200 bg-white group-hover/check:border-primary' 
                    : 'border border-white/20 bg-white/5 group-hover/check:border-white/45'
                }`}>
                  <input type="checkbox" className="hidden peer" />
                  <div className={`w-1.5 h-1.5 rounded-[1px] opacity-0 peer-checked:opacity-100 transition-all ${isLight ? 'bg-primary' : 'bg-white'}`} />
                </div>
                <span>Ingat saya</span>
              </label>
              <Link href="#" className={`transition-colors ${isLight ? 'hover:text-primary' : 'hover:text-white'}`}>Lupa sandi?</Link>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99] text-white font-black uppercase tracking-widest text-[10px] py-3 rounded-xl shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-1"
            >
              {loading ? "Memproses..." : "Login Sistem"} <Sparkles className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="text-center pt-0.5">
            <p className={`text-[11px] font-medium ${isLight ? 'text-slate-500' : 'text-blue-100/70'}`}>
              Belum punya akun? <Link href="/register" className={`font-bold hover:underline decoration-white/30 underline-offset-4 transition-colors ${
                isLight ? 'text-primary decoration-primary/30' : 'text-white decoration-white/30'
              }`}>Daftar sekarang</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
