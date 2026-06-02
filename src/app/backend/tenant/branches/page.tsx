"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Store, Plus, Edit2, Trash2, MapPin, Phone, CheckCircle, XCircle } from "lucide-react";
import FullPageLoader from "@/components/layout/FullPageLoader";
import SectionLoader from "@/components/layout/SectionLoader";

interface Branch {
    id: string;
    tenant_id: string;
    name: string;
    address: string | null;
    phone_number: string | null;
    is_active: boolean;
    created_at: string;
    payment_qr?: string | null;
    staff?: {
        id: string;
        full_name: string | null;
        email: string;
        is_active: boolean | null;
    }[];
    _count?: {
        transaction_groups: number;
    };
}

export default function BranchesPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [hasPermission, setHasPermission] = useState(true);
    
    // Form & Modal States
    const [isOpenModal, setIsOpenModal] = useState(false);
    const [modalMode, setModalMode] = useState<"add" | "edit">("add");
    const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
    
    // Branch Fields
    const [formName, setFormName] = useState("");
    const [formAddress, setFormAddress] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formIsActive, setFormIsActive] = useState(true);
    const [formQr, setFormQr] = useState("");
    const [qrFile, setQrFile] = useState<File | null>(null);
    const [qrPreview, setQrPreview] = useState<string | null>(null);
    const [uploadingQr, setUploadingQr] = useState(false);

    // Manager / Franchisee Fields (Only on Add)
    const [formManagerName, setFormManagerName] = useState("");
    const [formManagerEmail, setFormManagerEmail] = useState("");
    const [formManagerPassword, setFormManagerPassword] = useState("");

    const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert("Hanya file gambar!");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Ukuran file maksimal 5MB");
            return;
        }
        setQrFile(file);
        setQrPreview(URL.createObjectURL(file));
    };

    const uploadQrToServer = async (file: File, oldUrl?: string | null) => {
        const fd = new FormData();
        fd.append('file', file);
        if (oldUrl) fd.append('old_url', oldUrl);
        const res = await fetch('/api/upload/payment-qr', { method: 'POST', body: fd });
        const data = await res.json();
        if (!res.ok || !data.url) throw new Error(data.error || 'Gagal mengunggah QR Code');
        return data.url;
    };

    const fetchProfileAndBranches = async () => {
        try {
            const userRes = await fetch("/api/auth/me");
            if (userRes.ok) {
                const userData = await userRes.json();
                
                if (userData.permissions && !userData.permissions.includes("kelola_cabang")) {
                    setHasPermission(false);
                    setIsLoading(false);
                    return;
                }
            }

            const profileRes = await fetch("/api/backend/tenant-umkm");
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                
                // Tolak akses jika user adalah staf/karyawan cabang
                if (profileData.profile.branch_id) {
                    router.replace("/backend/tenant");
                    return;
                }

                setProfile(profileData.profile);
                
                const branchesRes = await fetch(`/api/backend/branches?tenant_id=${profileData.profile.id}`);
                if (branchesRes.ok) {
                    const branchesData = await branchesRes.json();
                    setBranches(branchesData.data || []);
                }
            }
        } catch (err) {
            console.error("Gagal memuat data cabang:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProfileAndBranches();
    }, []);

    const openAddModal = () => {
        setModalMode("add");
        setSelectedBranchId(null);
        setFormName("");
        setFormAddress("");
        setFormPhone("");
        setFormIsActive(true);
        setFormQr("");
        setQrFile(null);
        setQrPreview(null);
        setFormManagerName("");
        setFormManagerEmail("");
        setFormManagerPassword("");
        setErrorMessage("");
        setIsOpenModal(true);
    };

    const openEditModal = (branch: Branch) => {
        setModalMode("edit");
        setSelectedBranchId(branch.id);
        setFormName(branch.name);
        setFormAddress(branch.address || "");
        setFormPhone(branch.phone_number || "");
        setFormIsActive(branch.is_active);
        setFormQr(branch.payment_qr || "");
        setQrFile(null);
        setQrPreview(branch.payment_qr || null);
        setFormManagerName("");
        setFormManagerEmail("");
        setFormManagerPassword("");
        setErrorMessage("");
        setIsOpenModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formName.trim()) return;

        setErrorMessage("");
        setIsSaving(true);
        try {
            let qrUrl = formQr;
            if (qrFile) {
                setUploadingQr(true);
                try {
                    qrUrl = await uploadQrToServer(qrFile, formQr || null);
                    setFormQr(qrUrl);
                } catch (uploadErr: any) {
                    setErrorMessage(uploadErr.message || "Gagal mengunggah QR Code");
                    setIsSaving(false);
                    setUploadingQr(false);
                    return;
                }
                setUploadingQr(false);
            }

            if (modalMode === "add") {
                const res = await fetch("/api/backend/branches", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        tenant_id: profile.id,
                        name: formName,
                        address: formAddress,
                        phone_number: formPhone,
                        manager_name: formManagerName || undefined,
                        manager_email: formManagerEmail || undefined,
                        manager_password: formManagerPassword || undefined,
                        payment_qr: qrUrl || null
                    })
                });

                const json = await res.json();
                if (res.ok) {
                    await fetchProfileAndBranches();
                    setIsOpenModal(false);
                } else {
                    setErrorMessage(json.error || "Gagal membuat cabang");
                }
            } else {
                const res = await fetch("/api/backend/branches", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        id: selectedBranchId,
                        name: formName,
                        address: formAddress,
                        phone_number: formPhone,
                        is_active: formIsActive,
                        payment_qr: qrUrl || null
                    })
                });

                const json = await res.json();
                if (res.ok) {
                    await fetchProfileAndBranches();
                    setIsOpenModal(false);
                } else {
                    setErrorMessage(json.error || "Gagal memperbarui cabang");
                }
            }
        } catch (err) {
            console.error("Gagal menyimpan data cabang:", err);
            setErrorMessage("Kesalahan jaringan saat menyimpan data");
        } finally {
            setIsSaving(false);
            setUploadingQr(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Apakah Anda yakin ingin menghapus cabang ini? Semua transaksi terkait akan terpengaruh.")) return;

        try {
            const res = await fetch(`/api/backend/branches?id=${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                setBranches(prev => prev.filter(b => b.id !== id));
            }
        } catch (err) {
            console.error("Gagal menghapus cabang:", err);
        }
    };

    const handleToggleStatus = async (branch: Branch) => {
        try {
            const res = await fetch("/api/backend/branches", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: branch.id,
                    is_active: !branch.is_active
                })
            });
            if (res.ok) {
                setBranches(prev => prev.map(b => b.id === branch.id ? { ...b, is_active: !b.is_active } : b));
            }
        } catch (err) {
            console.error("Gagal mengubah status cabang:", err);
        }
    };

    if (!hasPermission) {
        return (
            <div className="w-full flex flex-col items-center justify-center min-h-[60vh] py-10 px-4">
                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-10 max-w-lg text-center shadow-2xl shadow-rose-500/10 flex flex-col items-center">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-xl shadow-rose-200/50">
                        <XCircle className="w-12 h-12 text-rose-500" />
                    </div>
                    <h2 className="text-2xl font-black text-rose-600 mb-3 uppercase tracking-tight">Akses Ditolak</h2>
                    <p className="text-rose-500/80 font-medium text-sm">
                        Anda tidak memiliki hak akses (`kelola_cabang`) untuk membuka halaman kelola cabang ini. Silakan hubungi Administrator Anda.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col gap-6 py-2 pb-20 px-4 sm:px-6">
            {isLoading && <FullPageLoader />}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-2">
                <div>
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
                        <div className="w-6 h-1 bg-primary rounded-full" />
                        Kelola Operasional Bisnis
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-[#030037] tracking-tighter leading-[1.1]">
                        Cabang <span className="text-primary">UMKM</span>
                    </h1>
                    <p className="text-zinc-500 font-medium text-sm mt-3">
                        Kelola data toko fisik, alamat, dan pengelola masing-masing cabang/franchise Anda.
                    </p>
                </div>

                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 px-5 py-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30 hover:scale-102 active:scale-98 transition-all font-bold text-sm self-start sm:self-center"
                >
                    <Plus className="w-4 h-4" /> TAMBAH CABANG
                </button>
            </div>

            {/* Branches Table */}
            <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nama Cabang & Pengelola</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Kontak & Alamat</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Transaksi</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {branches.length > 0 ? (
                                branches.map((branch) => (
                                    <tr key={branch.id} className="hover:bg-zinc-50/50 transition-all duration-200 group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-primary/10 group-hover:text-primary transition-all duration-300">
                                                    <Store className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-zinc-950 block">{branch.name}</span>
                                                    {branch.staff && branch.staff.length > 0 ? (
                                                        <span className="text-[10px] text-primary font-bold block mt-1">
                                                            Pengelola: {branch.staff[0].full_name} ({branch.staff[0].email})
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-zinc-400 italic block mt-1">
                                                            Belum ada pengelola
                                                        </span>
                                                    )}
                                                    {branch.payment_qr && (
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="inline-flex items-center gap-0.5 bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border border-emerald-100">
                                                                QR AKTIF
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1 text-xs text-zinc-600 font-medium">
                                                {branch.address && (
                                                    <div className="flex items-center gap-1.5">
                                                        <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                                                        <span>{branch.address}</span>
                                                    </div>
                                                )}
                                                {branch.phone_number && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-zinc-400" />
                                                        <span>{branch.phone_number}</span>
                                                    </div>
                                                )}
                                                {!branch.address && !branch.phone_number && (
                                                    <span className="text-zinc-400 italic">Tidak ada kontak</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className="text-sm font-bold text-zinc-900 bg-zinc-50 px-3 py-1.5 rounded-lg border border-zinc-100">
                                                {branch._count?.transaction_groups ?? 0} Trx
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <button
                                                onClick={() => handleToggleStatus(branch)}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                    branch.is_active
                                                        ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                                        : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                }`}
                                            >
                                                {branch.is_active ? (
                                                    <>
                                                        <CheckCircle className="w-3.5 h-3.5" /> Aktif
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-3.5 h-3.5" /> Non-Aktif
                                                    </>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2.5">
                                                <button
                                                    onClick={() => openEditModal(branch)}
                                                    className="p-2 text-zinc-400 hover:text-primary hover:bg-zinc-50 rounded-xl transition-all"
                                                    title="Edit Cabang"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(branch.id)}
                                                    className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Hapus Cabang"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center text-zinc-400 text-sm font-medium italic">
                                        {isLoading ? <SectionLoader text="Memuat daftar cabang..." /> : "Belum ada cabang terdaftar."}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Add/Edit Branch */}
            {isOpenModal && (
                <div className="fixed inset-0 bg-[#030037]/45 backdrop-blur-sm z-[99999] flex items-center justify-center p-4">
                    <div className={`bg-white rounded-2xl w-full ${modalMode === "add" ? "max-w-3xl" : "max-w-md"} shadow-2xl border border-zinc-100 overflow-hidden transform transition-all duration-300 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col`}>
                        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
                            <h2 className="text-lg font-black text-[#030037] tracking-tight">
                                {modalMode === "add" ? "Tambah Cabang Baru" : "Edit Informasi Cabang"}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsOpenModal(false)}
                                className="p-2 text-zinc-400 hover:text-[#030037] hover:bg-zinc-50 rounded-xl transition-all"
                            >
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto min-h-0 flex flex-col">
                            <div className="p-6 space-y-4 flex-1">
                                {errorMessage && (
                                    <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider">
                                        ⚠️ {errorMessage}
                                    </div>
                                )}
                                
                                {modalMode === "add" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Kolom Kiri: Detail Cabang */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-primary uppercase tracking-widest leading-none pb-2 border-b border-zinc-100">
                                                Informasi Cabang / Toko
                                            </h3>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nama Cabang *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formName}
                                                    onChange={(e) => setFormName(e.target.value)}
                                                    placeholder="Contoh: Cabang Jakarta Pusat"
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Telepon / HP</label>
                                                <input
                                                    type="text"
                                                    value={formPhone}
                                                    onChange={(e) => setFormPhone(e.target.value)}
                                                    placeholder="Contoh: 08123456789"
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Alamat Fisik</label>
                                                <textarea
                                                    value={formAddress}
                                                    onChange={(e) => setFormAddress(e.target.value)}
                                                    placeholder="Alamat lengkap cabang..."
                                                    rows={3}
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200 resize-none"
                                                />
                                            </div>
                                            <div className="space-y-1.5 pt-2">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">QR Code Pembayaran Cabang</label>
                                                <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                                    <div className="w-14 h-14 rounded-lg bg-white border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                                                        {qrPreview ? (
                                                            <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain p-0.5" />
                                                        ) : (
                                                            <Store className="w-6 h-6 text-zinc-300" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => document.getElementById("qr-upload-input")?.click()}
                                                            className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                        >
                                                            Pilih QR
                                                        </button>
                                                        <input id="qr-upload-input" type="file" className="hidden" accept="image/*" onChange={handleQrChange} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Kolom Kanan: Kredensial Pengelola */}
                                        <div className="space-y-4">
                                            <h3 className="text-xs font-black text-primary uppercase tracking-widest leading-none pb-2 border-b border-zinc-100">
                                                Akun Pengelola / Franchisee (Login)
                                            </h3>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nama Lengkap Pengelola *</label>
                                                <input
                                                    type="text"
                                                    required
                                                    value={formManagerName}
                                                    onChange={(e) => setFormManagerName(e.target.value)}
                                                    placeholder="Contoh: Budi Santoso"
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Login *</label>
                                                <input
                                                    type="email"
                                                    required
                                                    value={formManagerEmail}
                                                    onChange={(e) => setFormManagerEmail(e.target.value)}
                                                    placeholder="Contoh: budi@gmail.com"
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Password Login *</label>
                                                <input
                                                    type="password"
                                                    required
                                                    value={formManagerPassword}
                                                    onChange={(e) => setFormManagerPassword(e.target.value)}
                                                    placeholder="Minimal 6 karakter"
                                                    className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    // Mode Edit (Single Column)
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nama Cabang *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formName}
                                                onChange={(e) => setFormName(e.target.value)}
                                                placeholder="Contoh: Cabang Jakarta Pusat"
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Telepon / HP</label>
                                            <input
                                                type="text"
                                                value={formPhone}
                                                onChange={(e) => setFormPhone(e.target.value)}
                                                placeholder="Contoh: 08123456789"
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Alamat Fisik</label>
                                            <textarea
                                                value={formAddress}
                                                onChange={(e) => setFormAddress(e.target.value)}
                                                placeholder="Alamat lengkap cabang..."
                                                rows={3}
                                                className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200 resize-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5 pt-1">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest block">QR Code Pembayaran Cabang</label>
                                            <div className="flex items-center gap-3 bg-zinc-50 p-3 rounded-xl border border-zinc-100">
                                                <div className="w-14 h-14 rounded-lg bg-white border border-zinc-200 flex items-center justify-center overflow-hidden shrink-0">
                                                    {qrPreview ? (
                                                        <img src={qrPreview} alt="QR Preview" className="w-full h-full object-contain p-0.5" />
                                                    ) : (
                                                        <Store className="w-6 h-6 text-zinc-300" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById("qr-upload-input-edit")?.click()}
                                                        className="px-3 py-1.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                                                    >
                                                        Pilih QR
                                                    </button>
                                                    <input id="qr-upload-input-edit" type="file" className="hidden" accept="image/*" onChange={handleQrChange} />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 pt-2">
                                            <input
                                                type="checkbox"
                                                id="branch_active"
                                                checked={formIsActive}
                                                onChange={(e) => setFormIsActive(e.target.checked)}
                                                className="w-4 h-4 text-primary border-zinc-300 rounded focus:ring-primary"
                                            />
                                            <label htmlFor="branch_active" className="text-xs font-bold text-zinc-700 uppercase tracking-wider cursor-pointer">
                                                Cabang ini Aktif
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="px-6 py-5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setIsOpenModal(false)}
                                    className="px-5 py-3 rounded-xl border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 transition-all font-bold text-xs"
                                >
                                    BATAL
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-3 rounded-xl bg-primary text-white hover:scale-102 active:scale-98 disabled:opacity-50 transition-all font-bold text-xs shadow-lg shadow-primary/25"
                                >
                                    {isSaving ? "MENYIMPAN..." : "SIMPAN"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
