"use client";
import React, { useEffect, useState } from "react";
import { 
  Store, Copy, Check, ExternalLink, ArrowRight, Info, Globe, MessageSquare, Settings, Share2
} from "lucide-react";
import { useRouter } from "next/navigation";
import FullPageLoader from "@/components/layout/FullPageLoader";

interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string;
  is_active: boolean | null;
  username: string | null;
}

export default function TokoSayaPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/backend/tenant-umkm");
        if (res.ok) {
          const json = await res.json();
          setProfile(json.profile);
        }
      } catch (err) {
        console.error("Gagal memuat profil toko:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleCopyLink = () => {
    if (!profile?.username) return;
    const storeLink = `${window.location.origin}/store/${profile.username}`;
    navigator.clipboard.writeText(storeLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayName = profile?.business_name ?? profile?.full_name ?? "Toko Anda";

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="w-full flex flex-col gap-6 py-2 pb-20 px-4 sm:px-6" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
      
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px]">
          <div className="w-4 h-1 bg-primary rounded-full" />
          Integrasi Toko Online
        </div>
        <h1 className="text-3xl font-black text-[#030037] tracking-tighter">
          Toko <span className="text-primary">Saya</span>
        </h1>
        <p className="text-zinc-500 text-sm font-medium">
          Kelola etalase e-catalog online dan pemasaran produk Anda melalui WhatsApp.
        </p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Status & Configuration (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Status Panel Card */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-[#030037] uppercase tracking-widest border-b border-zinc-100 pb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" /> Status Toko E-Catalog
            </h3>

            {profile?.username ? (
              <div className="space-y-4">
                {/* Active Banner */}
                <div className="flex items-start gap-4 bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
                  <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                    <Store className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                      Aktif & Online
                    </span>
                    <h4 className="text-sm font-black text-zinc-900 mt-1">E-Catalog WhatsApp Siap Digunakan</h4>
                    <p className="text-xs text-zinc-500 font-medium">
                      Pelanggan Anda dapat melihat daftar produk, harga, deskripsi, dan melakukan checkout langsung terkirim ke WhatsApp Anda.
                    </p>
                  </div>
                </div>

                {/* Store Link Section */}
                <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-2xl space-y-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Alamat Web Toko Anda</span>
                    <span className="text-xs font-black text-primary font-mono select-all break-all mt-0.5">
                      {window.location.origin}/store/{profile.username}
                    </span>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-700 text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-600">Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 text-zinc-400" />
                          <span>Salin Tautan</span>
                        </>
                      )}
                    </button>
                    <a
                      href={`/store/${profile.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white hover:bg-indigo-750 text-xs font-bold rounded-xl shadow-md shadow-primary/10 transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Kunjungi Toko</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Inactive Banner */}
                <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                  <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                    <Info className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                      Belum Aktif
                    </span>
                    <h4 className="text-sm font-black text-zinc-900 mt-1">Username Toko Belum Dibuat</h4>
                    <p className="text-xs text-zinc-500 font-medium">
                      Toko E-Catalog membutuhkan username/slug unik untuk menghasilkan tautan yang dapat dibagikan kepada pelanggan.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => router.push("/backend/tenant/profile")}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold rounded-xl shadow-md shadow-amber-600/10 transition-all"
                >
                  <Settings className="w-4 h-4" />
                  <span>Atur Username Toko Sekarang</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

          {/* How It Works Card */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-[#030037] uppercase tracking-widest border-b border-zinc-100 pb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> Cara Kerja WhatsApp E-Catalog
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 border border-zinc-150/50">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm mx-auto">1</span>
                <h5 className="text-xs font-black text-[#030037]">Katalog Produk</h5>
                <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                  Semua produk yang Anda kelola di modul produk secara otomatis tampil di etalase web publik Anda.
                </p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 border border-zinc-150/50">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm mx-auto">2</span>
                <h5 className="text-xs font-black text-[#030037]">Keranjang Belanja</h5>
                <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                  Pelanggan memilih produk dan memasukkan jumlah pembelian langsung dari ponsel mereka secara online.
                </p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 border border-zinc-150/50">
                <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-sm mx-auto">3</span>
                <h5 className="text-xs font-black text-[#030037]">Pesan WhatsApp</h5>
                <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                  Data pemesanan akan otomatis diformat menjadi pesan teks dan dikirim ke nomor WA toko Anda saat checkout.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Mini Preview & Info (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Card Mockup Preview */}
          <div className="bg-[#030037] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden border border-white/15">
            {/* Background decorative glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-3xl" />

            <div className="relative space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Pratinjau Toko</span>
                <Store className="w-4 h-4 text-emerald-400 animate-pulse" />
              </div>

              <div>
                <h4 className="text-xl font-black tracking-tight">{displayName}</h4>
                <p className="text-[10px] font-medium text-white/60 mt-1">Status: E-Catalog WhatsApp Aktif</p>
              </div>

              <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 block">Tautan Singkat</span>
                  <span className="text-xs font-black text-emerald-300 font-mono mt-0.5 truncate block max-w-[180px]">
                    /store/{profile?.username ?? "username"}
                  </span>
                </div>
                
                {profile?.username && (
                  <button
                    onClick={handleCopyLink}
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/5 transition-all"
                    title="Salin Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Setup Settings Tip */}
          <div className="bg-zinc-50 border border-zinc-200 rounded-3xl p-5 space-y-3">
            <h5 className="text-[10px] font-black text-[#030037] uppercase tracking-widest border-b border-zinc-200/60 pb-1.5 flex items-center gap-1.5">
              💡 Tips & Pengaturan Profil Toko
            </h5>
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              Nama bisnis, deskripsi toko, logo/avatar, dan nomor telepon WhatsApp penerima pesanan diambil dari pengaturan di menu **Profil UMKM**. Pastikan Anda telah melengkapi detail tersebut dengan benar agar alur transaksi katalog berjalan lancar.
            </p>
            <button
              onClick={() => router.push("/backend/tenant/profile")}
              className="text-[10px] font-black text-primary hover:text-indigo-800 uppercase tracking-wider flex items-center gap-1.5 hover:gap-2.5 transition-all mt-1"
            >
              Buka Pengaturan Profil <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
