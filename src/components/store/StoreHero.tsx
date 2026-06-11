// Server Component — tidak ada "use client", tidak mengirim JS ke browser
import React from "react";
import Image from "next/image";
import {
  MapPin,
  Phone,
  Calendar,
  Store,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

interface StoreHeroProfile {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  address: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  username: string | null;
  created_at: string | null;
}

interface StoreHeroProps {
  profile: StoreHeroProfile;
  productCount: number;
}

export default function StoreHero({ profile, productCount }: StoreHeroProps) {
  const storeName = profile.business_name || profile.username || "Toko UMKM";
  const joinYear = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  return (
    <header className="relative pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
      {/* Banner */}
      <div className="w-full h-[42vh] min-h-[220px] max-h-[420px] relative overflow-hidden rounded-3xl shadow-2xl border border-white/5">
        {profile.banner_url ? (
          <Image
            src={profile.banner_url}
            alt={`Banner toko ${storeName}`}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 1280px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
            {/* Static decorative grid — tidak pakai JS */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='g' width='60' height='60' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 60 0 L 0 0 0 60' fill='none' stroke='white' stroke-width='0.5' stroke-opacity='0.15'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3C/svg%3E\")",
              }}
            />
          </div>
        )}
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 to-transparent" />
      </div>

      {/* Profile Info — overlapping banner */}
      <div className="relative z-10 -mt-14 sm:-mt-18 px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          {/* Avatar */}
          <div className="relative mx-auto md:mx-0 shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-900 p-1.5 shadow-2xl ring-2 ring-blue-500/20">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={`Logo ${storeName}`}
                  fill
                  className="object-cover rounded-full"
                  sizes="112px"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                  <Store className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
                </div>
              )}
            </div>
            {/* Verified Badge */}
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center border-[3px] border-slate-950 shadow-lg">
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Store Info */}
          <div className="flex-1 text-center md:text-left pb-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
                {storeName}
              </h1>
              <span className="inline-flex items-center justify-center gap-1 bg-blue-500/10 backdrop-blur-md text-blue-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-blue-500/20 mx-auto md:mx-0 w-fit">
                <Sparkles className="w-3 h-3" /> Official Store
              </span>
            </div>

            {profile.bio ? (
              <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed mb-4 mx-auto md:mx-0">
                {profile.bio}
              </p>
            ) : (
              <p className="text-sm text-slate-500 font-medium mb-4">
                Selamat datang di toko kami. Temukan produk terbaik untuk Anda.
              </p>
            )}

            {/* Meta Chips */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              {profile.address && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-300 text-xs font-medium rounded-full border border-white/10">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="line-clamp-1 max-w-[200px]">{profile.address}</span>
                </div>
              )}
              {profile.phone_number && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-300 text-xs font-medium rounded-full border border-white/10">
                  <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{profile.phone_number}</span>
                </div>
              )}
              {joinYear && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-slate-300 text-xs font-medium rounded-full border border-white/10">
                  <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Bergabung {joinYear}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex gap-3 mb-2 shrink-0">
            <div className="flex flex-col items-center justify-center px-5 py-4 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-2xl font-black text-white">{productCount}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Produk
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
