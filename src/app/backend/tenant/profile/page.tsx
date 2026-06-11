"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  User, Store, Mail, Phone, MapPin, Edit, CheckCircle, UserCircle, 
  ArrowRight, ArrowLeft, ShieldCheck, Calendar, Camera, AlignLeft, 
  Image as ImageIcon, Save, Copy, Check, ExternalLink, Globe, MessageSquare, Share2
} from 'lucide-react';
import { toast } from 'react-toastify';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  business_name: string;
  phone_number: string;
  address: string;
  bio?: string;
  role_name: string;
  is_active: boolean;
  created_at: string;
  avatar_url?: string;
  banner_url?: string;
  username?: string | null;
  payment_qr?: string | null;
  metadata?: any;
}

const ProfileTenantPage = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState<'profile' | 'store'>('profile');
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const bannerInputRef = useRef<HTMLInputElement>(null);
    const qrInputRef = useRef<HTMLInputElement>(null);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(null);
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);
    const [uploadingFiles, setUploadingFiles] = useState(false);

    const [editData, setEditData] = useState({
        full_name: "", business_name: "", phone_number: "", address: "", bio: "", username: "",
        metadata: {} as any
    });

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/auth/me');
            const data = await res.json();
            if (res.ok) {
                setProfile(data);
                setEditData({
                    full_name: data.full_name || "", business_name: data.business_name || "",
                    phone_number: data.phone_number || "", address: data.address || "", bio: data.bio || "",
                    username: data.username || "",
                    metadata: data.metadata || {}
                });
                setAvatarPreview(data.avatar_url || null);
                setBannerPreview(data.banner_url || null);
                setQrPreview(data.payment_qr || null);
            } else { toast.error("Gagal mengambil data profil."); }
        } catch { toast.error("Kesalahan jaringan."); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchProfile(); }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner' | 'qr') => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error("Hanya file gambar!"); return; }
        if (file.size > 5 * 1024 * 1024) { toast.error("Maks 5MB"); return; }
        const url = URL.createObjectURL(file);
        if (type === 'avatar') { setAvatarFile(file); setAvatarPreview(url); }
        else if (type === 'banner') { setBannerFile(file); setBannerPreview(url); }
        else { setQrFile(file); setQrPreview(url); }
    };

    const uploadFileToServer = async (file: File, type: 'avatar' | 'banner' | 'qr', oldUrl?: string | null) => {
        const fd = new FormData();
        fd.append('file', file);
        if (oldUrl) fd.append('old_url', oldUrl);
        const endpoint = type === 'avatar' ? '/api/upload/avatar' : type === 'banner' ? '/api/upload/banner' : '/api/upload/payment-qr';
        const res = await fetch(endpoint, { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || `Gagal unggah ${type}`);
        return data.url;
    };

    const handleUpdate = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            let avUrl = profile?.avatar_url, bnUrl = profile?.banner_url, qrUrl = profile?.payment_qr;
            if (avatarFile || bannerFile || qrFile) {
                setUploadingFiles(true);
                try {
                    if (avatarFile) avUrl = await uploadFileToServer(avatarFile, 'avatar', profile?.avatar_url);
                    if (bannerFile) bnUrl = await uploadFileToServer(bannerFile, 'banner', profile?.banner_url);
                    if (qrFile) qrUrl = await uploadFileToServer(qrFile, 'qr', profile?.payment_qr);
                } catch (err: any) { toast.error(err.message); setUploadingFiles(false); setLoading(false); return; }
                setUploadingFiles(false);
            }
            const res = await fetch('/api/umkm', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: profile?.id, ...editData, avatar_url: avUrl, banner_url: bnUrl, payment_qr: qrUrl }),
            });
            const data = await res.json();
            if (res.ok) { toast.success("Profil berhasil diperbarui!"); setIsEditing(false); setAvatarFile(null); setBannerFile(null); setQrFile(null); fetchProfile(); }
            else toast.error(data.error || "Gagal memperbarui profil.");
        } catch { toast.error("Gagal terhubung ke server."); setUploadingFiles(false); }
        finally { setLoading(false); }
    };

    const handleCopyLink = () => {
        if (!profile?.username) return;
        const storeLink = `${window.location.origin}/store/${profile.username}`;
        navigator.clipboard.writeText(storeLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleAddress = async () => {
        if (!profile) return;
        const currentMeta = (profile.metadata as any) || {};
        const newHideAddress = !currentMeta.hide_checkout_address;
        
        try {
            const res = await fetch('/api/umkm', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: profile.id,
                    metadata: {
                        ...currentMeta,
                        hide_checkout_address: newHideAddress
                    }
                })
            });
            const data = await res.json();
            if (res.ok) {
                toast.success(newHideAddress ? "Alamat pengiriman dinonaktifkan!" : "Alamat pengiriman diaktifkan!");
                setProfile(prev => prev ? { ...prev, metadata: { ...currentMeta, hide_checkout_address: newHideAddress } } : null);
                setEditData(prev => ({
                    ...prev,
                    metadata: {
                        ...currentMeta,
                        hide_checkout_address: newHideAddress
                    }
                }));
            } else {
                toast.error(data.error || "Gagal memperbarui pengaturan.");
            }
        } catch {
            toast.error("Gagal memperbarui pengaturan alamat.");
        }
    };



    const displayName = profile?.business_name ?? profile?.full_name ?? "Toko Anda";

    return (
        <div className="w-full flex flex-col gap-4 pb-16" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
            
            {/* Header Halaman */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-6 py-4 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-1">
                        <div className="w-4 h-0.5 bg-primary rounded-full" />
                        Dasbor Pemilik
                    </div>
                    <h1 className="text-xl font-bold text-[#030037] tracking-tight">Profil & Integrasi Toko</h1>
                </div>
            </div>

            {/* Peringatan file belum simpan */}
            {(avatarFile || bannerFile || qrFile) && !isEditing && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-sm">
                    <span>⭐ Foto atau QR baru belum tersimpan. Klik Edit lalu Simpan.</span>
                    <button onClick={() => setIsEditing(true)} className="px-4 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] uppercase tracking-widest font-bold shrink-0 hover:bg-amber-600 transition-all">Simpan</button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-zinc-150 pb-px">
                <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all select-none ${
                        activeTab === 'profile' 
                            ? 'border-emerald-500 text-black' 
                            : 'border-transparent text-zinc-500 hover:text-black'
                    }`}
                >
                    Profil Bisnis
                </button>
                <button 
                    onClick={() => setActiveTab('store')} 
                    className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all select-none ${
                        activeTab === 'store' 
                            ? 'border-emerald-500 text-black' 
                            : 'border-transparent text-zinc-500 hover:text-black'
                    }`}
                >
                    Integrasi Toko (E-Catalog)
                </button>
            </div>

            {activeTab === 'profile' ? (
                /* Tab 1: Profil Bisnis Content */
                <div className="grid grid-cols-12 auto-rows-min gap-3 w-full animate-in fade-in duration-200">
                    {/* Banner */}
                    <div 
                        className={`col-span-12 lg:col-span-8 h-52 sm:h-64 rounded-2xl overflow-hidden relative group bg-zinc-300 ${isEditing ? 'cursor-pointer ring-2 ring-primary/40' : ''}`}
                        onClick={() => isEditing && bannerInputRef.current?.click()}
                    >
                        {bannerPreview ? (
                            <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#030037] via-[#1a1a5e] to-[#3b3bb0] flex items-center justify-center">
                                <ImageIcon className="w-10 h-10 text-white/15" />
                            </div>
                        )}
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all backdrop-blur-sm">
                                <ImageIcon className="w-10 h-10 text-white mb-2" />
                                <span className="text-white text-[10px] font-bold uppercase tracking-widest">Ganti Spanduk</span>
                            </div>
                        )}
                        <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'banner')} />
                    </div>

                    {/* Sidebar: Avatar + Identity */}
                    <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-zinc-100 p-5 flex flex-col items-center justify-center gap-4 h-52 sm:h-64 shadow-sm">
                        
                        <div 
                            className={`w-20 h-20 rounded-2xl bg-zinc-100 overflow-hidden flex items-center justify-center shrink-0 relative group ${isEditing ? 'cursor-pointer ring-2 ring-primary/40' : ''}`}
                            onClick={() => isEditing && fileInputRef.current?.click()}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <UserCircle className="w-12 h-12 text-zinc-300" />
                            )}
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                    <Camera className="w-5 h-5 text-white" />
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'avatar')} />

                        <div className="text-center w-full">
                            <h2 className="text-lg font-bold text-[#030037] tracking-tight truncate">{profile?.full_name || "Pemilik UMKM"}</h2>
                            <p className="text-xs text-zinc-400 font-medium truncate">{profile?.email}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            <span className="bg-[#030037]/5 text-[#030037] px-3 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase">{profile?.role_name || "OWNER"}</span>
                            <span className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-bold uppercase tracking-wider border border-emerald-100">
                                <CheckCircle className="w-3 h-3" /> Verified
                            </span>
                        </div>

                        <button onClick={() => setIsEditing(!isEditing)} className={`w-full flex items-center gap-2 justify-center px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${isEditing ? 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200' : 'bg-[#030037] text-white hover:bg-primary'}`}>
                            {isEditing ? <><ArrowLeft className="w-3.5 h-3.5" /> Batal</> : <><Edit className="w-3.5 h-3.5" /> Edit Profil</>}
                        </button>
                    </div>

                    {!isEditing ? (
                        <>
                            {/* Tile: Nama */}
                            <BentoTile span={4} icon={<User className="w-4 h-4" />} label="Nama Pemilik" value={profile?.full_name} />
                            
                            {/* Tile: Bisnis */}
                            <BentoTile span={4} icon={<Store className="w-4 h-4" />} label="Nama Bisnis" value={profile?.business_name} />
                            
                            {/* Tile: Statistik */}
                            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl border border-zinc-100 p-5 flex flex-col justify-center gap-3 shadow-sm">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Statistik Akun</span>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-zinc-500"><Calendar className="w-3.5 h-3.5" /> Bergabung</div>
                                    <span className="text-[#030037] font-bold">{profile?.created_at ? new Date(profile.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short' }) : '-'}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 text-zinc-500"><ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Status</div>
                                    <span className="text-emerald-600 font-bold">Active</span>
                                </div>
                            </div>

                            {/* Tile: Email */}
                            <BentoTile span={4} icon={<Mail className="w-4 h-4" />} label="Email" value={profile?.email} />

                            {/* Tile: QR Pembayaran */}
                            <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-white border border-zinc-100 rounded-2xl p-5 flex flex-col gap-2 hover:shadow-md hover:border-emerald-500/20 transition-all group shadow-sm">
                                <div className="flex items-center gap-2.5 pt-2">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-500 group-hover:text-white transition-colors shrink-0">
                                        <ImageIcon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">QR Pembayaran Owner</span>
                                </div>
                                <div className="flex items-center justify-center p-3 bg-zinc-50 rounded-xl border border-zinc-100 w-full aspect-square max-h-[160px] mx-auto overflow-hidden">
                                    {profile?.payment_qr ? (
                                        <img src={profile.payment_qr} alt="QR Pembayaran" className="h-full object-contain rounded-lg" />
                                    ) : (
                                        <span className="text-zinc-300 italic font-medium text-xs">Belum diatur</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Tile: Phone */}
                            <BentoTile span={4} icon={<Phone className="w-4 h-4" />} label="Telepon / WA" value={profile?.phone_number} />

                            {/* Tile: Bio (full) */}
                            {profile?.bio && (
                                <BentoTile span={12} icon={<AlignLeft className="w-4 h-4" />} label="Bio / Tagline Bisnis" value={profile?.bio} accent />
                            )}

                            {/* Tile: Address (full) */}
                            <BentoTile span={12} icon={<MapPin className="w-4 h-4" />} label="Alamat Operasional" value={profile?.address} />
                        </>
                    ) : (
                        /* EDITING MODE: Full-width form card */
                        <div className="col-span-12 bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 relative overflow-hidden shadow-sm">

                            
                            <div className="flex items-center gap-3 border-b border-zinc-100 pb-4 mb-6">
                                <div className="p-2 bg-primary/10 rounded-xl"><Edit className="w-4 h-4 text-primary" /></div>
                                <h4 className="text-sm font-bold uppercase tracking-widest text-[#030037]">Edit Data Profil</h4>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="Nama Lengkap" value={editData.full_name} onChange={(v) => setEditData({...editData, full_name: v})} icon={<User className="w-3.5 h-3.5 text-zinc-400" />} />
                                    <FormField label="Nama Bisnis" value={editData.business_name} onChange={(v) => setEditData({...editData, business_name: v})} icon={<Store className="w-3.5 h-3.5 text-zinc-400" />} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField label="No. Telepon / WA" value={editData.phone_number} onChange={(v) => setEditData({...editData, phone_number: v})} icon={<Phone className="w-3.5 h-3.5 text-zinc-400" />} />
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Username / Slug Toko</label>
                                        <div className="relative">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-xs">@</div>
                                            <input 
                                                value={editData.username} 
                                                onChange={(e) => {
                                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                    setEditData({...editData, username: val});
                                                }}
                                                placeholder="username-toko-anda"
                                                className="w-full bg-zinc-50 border border-zinc-200 text-black p-3 pl-8 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-sm" 
                                            />
                                        </div>
                                        <p className="text-[10px] text-zinc-400 font-medium ml-1">
                                            Preview Link: <span className="text-emerald-500 font-semibold break-all">{typeof window !== 'undefined' ? `${window.location.origin}/store/${editData.username || 'username-anda'}` : `/store/${editData.username || 'username-anda'}`}</span>
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Bio / Tagline</label>
                                    <textarea value={editData.bio} onChange={(e) => setEditData({...editData, bio: e.target.value})} rows={2}
                                        className="w-full bg-zinc-50 border border-zinc-200 text-black p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-sm resize-none"
                                        placeholder="Deskripsi singkat bisnis Anda..." />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">Alamat Lengkap</label>
                                    <textarea value={editData.address} onChange={(e) => setEditData({...editData, address: e.target.value})} rows={2}
                                        className="w-full bg-zinc-50 border border-zinc-200 text-black p-3 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-sm resize-none"
                                        placeholder="Jalan, RT/RW, Kelurahan, Kecamatan, Kota" />
                                </div>



                                <div className="space-y-2 border-t border-zinc-100 pt-4">
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">QR Code Pembayaran (Pusat)</label>
                                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-4">
                                        <div className="w-24 h-24 rounded-xl bg-white border border-zinc-100 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                            {qrPreview ? (
                                                <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain p-1" />
                                            ) : (
                                                <ImageIcon className="w-8 h-8 text-zinc-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 text-center sm:text-left space-y-2">
                                            <p className="text-[10px] text-zinc-500 font-medium">Unggah gambar QR Code pembayaran utama (QRIS, e-wallet, bank, dll) untuk toko/pusat Anda. Format: JPG, PNG. Maks 5MB.</p>
                                            <button
                                                type="button"
                                                onClick={() => qrInputRef.current?.click()}
                                                className="px-4 py-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                                            >
                                                Pilih Gambar QR
                                            </button>
                                            <input type="file" ref={qrInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'qr')} />
                                        </div>
                                    </div>
                                </div>
                                
                                <button type="submit" disabled={loading} className="w-full bg-[#030037] py-3.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white hover:bg-primary transition-all flex items-center justify-center gap-3 shadow-lg shadow-[#030037]/10">
                                    <Save className="w-4 h-4" />
                                    Simpan Semua Perubahan
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            ) : (
                /* Tab 2: Integrasi E-Catalog Toko Content */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start w-full animate-in fade-in duration-300">
                    {/* Left Side: Status & QR (7 Columns) */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Status Panel */}
                        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-6">
                            <h3 className="text-xs font-black text-[#030037] uppercase tracking-widest border-b border-zinc-100 pb-3 flex items-center gap-2">
                                <Globe className="w-4 h-4 text-primary" /> Status Toko E-Catalog
                            </h3>

                            {profile?.username ? (
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
                                        <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl shrink-0">
                                            <Store className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-850">
                                                Aktif & Online
                                            </span>
                                            <h4 className="text-sm font-bold text-zinc-900 mt-1">E-Catalog WhatsApp Siap Digunakan</h4>
                                            <p className="text-xs text-zinc-500 font-medium">
                                                Pelanggan Anda dapat melihat daftar produk, harga, deskripsi, dan melakukan checkout langsung terkirim ke WhatsApp Anda.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-zinc-50 border border-zinc-150 rounded-2xl">
                                        <div className="flex items-start gap-4">
                                            <div className="p-3 bg-zinc-100 text-zinc-500 rounded-xl shrink-0">
                                                <MapPin className="w-6 h-6 text-zinc-500" />
                                            </div>
                                            <div className="space-y-1">
                                                <h4 className="text-sm font-bold text-zinc-900">Alamat Pengiriman Pelanggan</h4>
                                                <p className="text-xs text-zinc-500 font-medium">
                                                    {profile?.metadata?.hide_checkout_address 
                                                        ? "Pelanggan tidak perlu mengisi alamat pengiriman saat checkout."
                                                        : "Pelanggan wajib mengisi alamat lengkap saat checkout."}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Toggle Switch langsung di tab Integrasi */}
                                        <button
                                            type="button"
                                            onClick={handleToggleAddress}
                                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                                !(profile?.metadata?.hide_checkout_address) ? 'bg-emerald-500' : 'bg-zinc-200'
                                            }`}
                                        >
                                            <span
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                                    !(profile?.metadata?.hide_checkout_address) ? 'translate-x-5' : 'translate-x-0'
                                                }`}
                                            />
                                        </button>
                                    </div>

                                    {/* Store Link Section */}
                                    <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-2xl space-y-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Alamat Web Toko Anda</span>
                                            <span className="text-xs font-black text-primary font-mono select-all break-all mt-0.5">
                                                {typeof window !== 'undefined' ? window.location.origin : ''}/store/{profile.username}
                                            </span>
                                        </div>

                                        <div className="flex gap-3 pt-1">
                                            <button
                                                onClick={handleCopyLink}
                                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-zinc-50 border border-zinc-200 text-black text-xs font-bold rounded-xl shadow-sm transition-all"
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
                                    <div className="flex items-start gap-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl">
                                        <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl shrink-0">
                                            <ImageIcon className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                                                Belum Aktif
                                            </span>
                                            <h4 className="text-sm font-bold text-zinc-900 mt-1">Username Toko Belum Dibuat</h4>
                                            <p className="text-xs text-zinc-500 font-medium">
                                                Toko E-Catalog membutuhkan username/slug unik untuk menghasilkan tautan yang dapat dibagikan kepada pelanggan.
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => { setActiveTab('profile'); setIsEditing(true); }}
                                        className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-amber-600 text-white hover:bg-amber-750 text-xs font-bold rounded-xl shadow-md shadow-amber-600/10 transition-all"
                                    >
                                        <Save className="w-4 h-4" />
                                        <span>Atur Username Toko Sekarang</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* How It Works */}
                        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-sm space-y-4">
                            <h3 className="text-xs font-black text-[#030037] uppercase tracking-widest border-b border-zinc-100 pb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4 text-emerald-600" /> Cara Kerja WhatsApp E-Catalog
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 border border-zinc-150/50">
                                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm mx-auto">1</span>
                                    <h5 className="text-xs font-bold text-[#030037]">Katalog Produk</h5>
                                    <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                                        Semua produk yang aktif secara otomatis tampil di etalase web e-catalog publik Anda.
                                    </p>
                                </div>
                                <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 border border-zinc-150/50">
                                    <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm mx-auto">2</span>
                                    <h5 className="text-xs font-bold text-[#030037]">Keranjang</h5>
                                    <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                                        Pelanggan memilih produk dan memasukkan jumlah pembelian langsung dari ponsel mereka.
                                    </p>
                                </div>
                                <div className="p-4 bg-zinc-50 rounded-2xl space-y-2 border border-zinc-150/50">
                                    <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black text-sm mx-auto">3</span>
                                    <h5 className="text-xs font-bold text-[#030037]">WhatsApp</h5>
                                    <p className="text-[10px] text-zinc-500 font-semibold leading-relaxed">
                                        Detail pemesanan otomatis dikirimkan ke nomor WhatsApp UMKM Anda saat pelanggan checkout.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Mini Preview & Info (5 Columns) */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Mockup Card */}
                        <div className="bg-[#030037] text-white rounded-2xl p-6 shadow-xl relative overflow-hidden border border-white/15">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/30 rounded-full blur-3xl" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-3xl" />

                            <div className="relative space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-white/50">Pratinjau Toko</span>
                                    <Store className="w-4 h-4 text-emerald-400 animate-pulse" />
                                </div>

                                <div>
                                    <h4 className="text-xl font-bold tracking-tight">{displayName}</h4>
                                    <p className="text-[10px] font-medium text-white/60 mt-1">Status: E-Catalog WhatsApp Aktif</p>
                                </div>

                                <div className="border-t border-white/10 pt-4 flex items-center justify-between gap-4">
                                    <div className="min-w-0 flex-1">
                                        <span className="text-[8px] font-bold uppercase tracking-widest text-white/40 block">Tautan Singkat</span>
                                        <span className="text-xs font-black text-emerald-300 font-mono mt-0.5 truncate block">
                                            /store/{profile?.username ?? "username"}
                                        </span>
                                    </div>
                                    
                                    {profile?.username && (
                                        <button
                                            onClick={handleCopyLink}
                                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/5 transition-all shrink-0"
                                            title="Salin Link"
                                        >
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* QR Code section */}
                        {profile?.username && (
                            <div className="bg-white border border-zinc-100 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all">
                                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest self-start pl-1">QR Code Etalase Toko</span>
                                <div className="flex flex-col items-center justify-center p-3 bg-zinc-50 border border-zinc-150 rounded-xl w-full">
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/store/${profile.username}` : '')}`} 
                                        alt="QR Link Toko" 
                                        className="w-28 h-28 object-contain bg-white p-1 rounded-lg border border-zinc-200"
                                    />
                                    <a 
                                        href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(typeof window !== 'undefined' ? `${window.location.origin}/store/${profile.username}` : '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-bold text-primary mt-2 uppercase tracking-wider hover:underline"
                                    >
                                        Unduh / Buka QR Toko
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

/* Bento Tile component */
const BentoTile = ({ span, icon, label, value, accent = false }: { span: number; icon: React.ReactNode; label: string; value?: string | null; accent?: boolean }) => {
    const colClass = span === 12 ? 'col-span-12' : span === 6 ? 'col-span-12 sm:col-span-6' : 'col-span-12 sm:col-span-6 lg:col-span-4';
    return (
        <div className={`${colClass} ${accent ? 'bg-primary/5 border-primary/10' : 'bg-white border-zinc-100'} rounded-2xl border p-5 flex flex-col gap-2 hover:shadow-md hover:border-primary/20 transition-all group shadow-sm`}>
            <div className="flex items-center gap-2.5 pt-2">
                <div className={`p-2 ${accent ? 'bg-primary/10 text-primary' : 'bg-zinc-50 text-zinc-400'} rounded-xl group-hover:bg-primary group-hover:text-white transition-colors shrink-0`}>{icon}</div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
            </div>
            <p className="text-black font-bold text-sm tracking-tight leading-relaxed break-words">
                {value || <span className="text-zinc-300 italic font-medium text-xs">Belum diisi</span>}
            </p>
        </div>
    );
};

/* Form Field component */
const FormField = ({ label, value, onChange, icon }: { label: string; value: string; onChange: (v: string) => void; icon: React.ReactNode }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-1">{label}</label>
        <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>
            <input value={value} onChange={(e) => onChange(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 text-black p-3 pl-9 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-sm" />
        </div>
    </div>
);

export default ProfileTenantPage;