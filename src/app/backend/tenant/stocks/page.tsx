"use client";

import React, { useEffect, useState } from "react";
import {
    Search,
    Sliders,
    ArrowRightLeft,
    Activity,
    Package,
    Store,
    AlertTriangle,
    X,
    TrendingUp,
    TrendingDown,
    Building2,
    Calendar,
    FileText
} from "lucide-react";
import SectionLoader from "@/components/layout/SectionLoader";

interface Stock {
    id: string;
    product_id: string;
    branch_id: string;
    stock: number;
    min_stock: number;
    products: {
        name: string;
        sell_price: number;
    };
    branches: {
        name: string;
    };
}

interface Mutation {
    id: string;
    product_id: string;
    from_branch_id: string | null;
    to_branch_id: string | null;
    quantity: number;
    type: string;
    notes: string | null;
    created_at: string;
    products: {
        name: string;
    };
    from_branch: {
        name: string;
    } | null;
    to_branch: {
        name: string;
    } | null;
}

interface Branch {
    id: string;
    name: string;
}

interface Product {
    id: string;
    name: string;
}

export default function TenantStocksPage() {
    const [userProfile, setUserProfile] = useState<any>(null);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [mutations, setMutations] = useState<Mutation[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBranchFilter, setSelectedBranchFilter] = useState("all");

    // Modals
    const [isOpnameModalOpen, setIsOpnameModalOpen] = useState(false);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    
    // Opname Form State
    const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
    const [formStockQty, setFormStockQty] = useState<number | "">(0);
    const [formMinStockQty, setFormMinStockQty] = useState<number | "">(0);
    const [formOpnameNotes, setFormOpnameNotes] = useState("");

    // Transfer Form State
    const [formTransferProductId, setFormTransferProductId] = useState("");
    const [formTransferFromBranchId, setFormTransferFromBranchId] = useState("");
    const [formTransferToBranchId, setFormTransferToBranchId] = useState("");
    const [formTransferQty, setFormTransferQty] = useState<number | "">(0);
    const [formTransferNotes, setFormTransferNotes] = useState("");

    const [hasPermission, setHasPermission] = useState(true);

    // Load data
    const fetchUserAndStocks = async () => {
        try {
            setLoading(true);
            const userRes = await fetch("/api/auth/me");
            if (userRes.ok) {
                const userData = await userRes.json();
                
                // Cek permission kelola_stok
                if (userData.permissions && !userData.permissions.includes("kelola_stok")) {
                    setHasPermission(false);
                    setLoading(false);
                    return;
                }

                setUserProfile(userData);

                const profileId = userData.id;
                const branchId = userData.branch_id;

                // 1. Ambil daftar cabang terlebih dahulu
                const branchesRes = await fetch(`/api/backend/branches?tenant_id=${profileId}`, { cache: "no-store" });
                let activeBranches: any[] = [];
                if (branchesRes.ok) {
                    const branchesData = await branchesRes.json();
                    activeBranches = branchesData.data || [];
                    
                    // Auto-create jika owner tidak memiliki cabang sama sekali
                    if (!branchId && activeBranches.length === 0) {
                        const createBranchRes = await fetch("/api/backend/branches", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                tenant_id: profileId,
                                name: "Pusat"
                            })
                        });
                        if (createBranchRes.ok) {
                            const newBranchData = await createBranchRes.json();
                            if (newBranchData.data) {
                                activeBranches = [newBranchData.data];
                            }
                        }
                    }
                    setBranches(activeBranches);
                }

                // 2. Tentukan URL endpoint stok & produk
                let stocksUrl = "";
                let productsUrl = `/api/backend/products?tenant_id=${profileId}`;

                if (branchId) {
                    stocksUrl = `/api/backend/stocks?branch_id=${branchId}`;
                } else {
                    stocksUrl = `/api/backend/stocks?tenant_id=${profileId}`;
                }

                // 3. Dapatkan data stok & produk
                const [stocksRes, productsRes] = await Promise.all([
                    fetch(stocksUrl, { cache: "no-store" }),
                    fetch(productsUrl, { cache: "no-store" })
                ]);

                if (stocksRes.ok && productsRes.ok) {
                    const stocksData = await stocksRes.json();
                    const pData = await productsRes.json();
                    const allProducts: any[] = pData.data || [];
                    setProducts(allProducts.map(p => ({ id: p.id, name: p.name })));

                    const flattenedStocks: Stock[] = [];

                    if (!branchId) {
                        // OWNER VIEW: Loop untuk semua produk di semua cabang
                        allProducts.forEach(prod => {
                            activeBranches.forEach((branch: any) => {
                                const ps = prod.product_stocks?.find((s: any) => s.branch_id === branch.id);
                                flattenedStocks.push({
                                    id: ps ? ps.id : `virtual-${prod.id}-${branch.id}`,
                                    product_id: prod.id,
                                    branch_id: branch.id,
                                    stock: ps ? ps.stock : 0,
                                    min_stock: ps ? ps.min_stock : 0,
                                    products: {
                                        name: prod.name,
                                        sell_price: Number(prod.sell_price)
                                    },
                                    branches: {
                                        name: branch.name
                                    }
                                });
                            });
                        });
                    } else {
                        // BRANCH STAFF VIEW: Loop untuk semua produk di cabang staff tersebut
                        allProducts.forEach(prod => {
                            const ps = prod.product_stocks?.find((s: any) => s.branch_id === branchId);
                            const currentBranchName = activeBranches.find((b: any) => b.id === branchId)?.name || "Cabang Anda";
                            flattenedStocks.push({
                                id: ps ? ps.id : `virtual-${prod.id}-${branchId}`,
                                product_id: prod.id,
                                branch_id: branchId,
                                stock: ps ? ps.stock : 0,
                                min_stock: ps ? ps.min_stock : 0,
                                products: {
                                    name: prod.name,
                                    sell_price: Number(prod.sell_price)
                                },
                                branches: {
                                    name: currentBranchName
                                }
                            });
                        });
                    }
                    
                    setStocks(flattenedStocks);
                    setMutations(stocksData.mutations || []);
                }
            }
        } catch (error) {
            console.error("Error fetching stocks:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserAndStocks();
    }, []);

    const isOwner = userProfile && !userProfile.branch_id;

    // Filter stocks
    const filteredStocks = stocks.filter((s) => {
        const matchesSearch = s.products.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBranch = selectedBranchFilter === "all" || s.branch_id === selectedBranchFilter;
        return matchesSearch && matchesBranch;
    });

    // Format Currency Helper
    const formatCurrency = (v: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

    // Buka Modal Opname
    const openOpnameModal = (stock: Stock) => {
        setSelectedStock(stock);
        setFormStockQty(stock.stock);
        setFormMinStockQty(stock.min_stock);
        setFormOpnameNotes("");
        setIsOpnameModalOpen(true);
    };

    // Buka Modal Transfer (Hanya Owner)
    const openTransferModal = () => {
        setFormTransferProductId("");
        setFormTransferFromBranchId("");
        setFormTransferToBranchId("");
        setFormTransferQty("");
        setFormTransferNotes("");
        setIsTransferModalOpen(true);
    };

    // Submit Opname
    const handleOpnameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStock) return;
        try {
            setActionLoading(true);
            const res = await fetch("/api/backend/stocks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    product_id: selectedStock.product_id,
                    branch_id: selectedStock.branch_id,
                    stock: formStockQty === "" ? 0 : formStockQty,
                    min_stock: formMinStockQty === "" ? 0 : formMinStockQty,
                    notes: formOpnameNotes || undefined
                })
            });

            if (res.ok) {
                setIsOpnameModalOpen(false);
                fetchUserAndStocks();
            } else {
                const errData = await res.json();
                alert(errData.error || "Gagal melakukan penyesuaian stok.");
            }
        } catch (error) {
            console.error("Opname error:", error);
        } finally {
            setActionLoading(false);
        }
    };

    // Submit Transfer
    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formTransferFromBranchId === formTransferToBranchId) {
            alert("Cabang pengirim dan penerima tidak boleh sama.");
            return;
        }
        try {
            setActionLoading(true);
            const res = await fetch("/api/backend/stocks", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    product_id: formTransferProductId,
                    is_transfer: true,
                    from_branch_id: formTransferFromBranchId,
                    to_branch_id: formTransferToBranchId,
                    quantity: formTransferQty === "" ? 0 : formTransferQty,
                    notes: formTransferNotes || undefined
                })
            });

            if (res.ok) {
                setIsTransferModalOpen(false);
                fetchUserAndStocks();
            } else {
                const errData = await res.json();
                alert(errData.error || "Gagal melakukan transfer stok.");
            }
        } catch (error) {
            console.error("Transfer error:", error);
        } finally {
            setActionLoading(false);
        }
    };

    if (!hasPermission) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white border border-zinc-150 rounded-2xl shadow-sm min-h-[400px] text-center">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-[#030037] mb-2">Akses Ditolak</h3>
                <p className="text-sm text-zinc-500 max-w-md">
                    Anda tidak memiliki hak akses (`kelola_stok`) untuk membuka halaman kelola stok ini. Silakan hubungi Administrator Anda.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#030037] font-heading">
                        {isOwner ? "Manajemen Distribusi & Mutasi Stok" : "Daftar Stok & Penyesuaian Cabang"}
                    </h1>
                    <p className="text-sm text-zinc-500">
                        {isOwner
                            ? "Pantau ketersediaan stok fisik di semua cabang, lakukan transfer logistik, atau opname global."
                            : "Lihat stok produk yang ada di cabang Anda dan lakukan stock-opname fisik secara mandiri."}
                    </p>
                </div>
                {isOwner && (
                    <button
                        onClick={openTransferModal}
                        className="inline-flex items-center gap-2 px-5 py-3 bg-[#3c39d6] text-white hover:bg-[#3c39d6]/90 transition-all font-bold text-sm rounded-2xl shadow-lg shadow-[#3c39d6]/20 shrink-0"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        Transfer Stok Antar-Cabang
                    </button>
                )}
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-zinc-150 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="relative w-full md:flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                        type="text"
                        placeholder="Cari produk berdasarkan nama..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#3c39d6] transition-all text-zinc-800 placeholder-zinc-400"
                    />
                </div>
                
                {isOwner && (
                    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-2.5 rounded-xl w-full md:w-auto shrink-0">
                        <Store className="w-4 h-4 text-zinc-400" />
                        <select
                            value={selectedBranchFilter}
                            onChange={(e) => setSelectedBranchFilter(e.target.value)}
                            className="bg-transparent border-0 text-zinc-700 text-xs font-semibold focus:outline-none cursor-pointer w-full md:w-44"
                        >
                            <option value="all">Semua Cabang</option>
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Grid Layout: Stocks Table & Log Mutations */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* 1. Stocks Table Card */}
                <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-sm xl:col-span-2">
                    {loading ? (
                        <div className="p-12">
                            <SectionLoader />
                        </div>
                    ) : filteredStocks.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center gap-3">
                            <div className="p-4 bg-zinc-50 rounded-full text-zinc-300">
                                <Package className="w-12 h-12" />
                            </div>
                            <h3 className="text-lg font-bold text-[#030037]">Stok Tidak Ditemukan</h3>
                            <p className="text-sm text-zinc-500 max-w-md">Belum ada data stok produk atau filter pencarian Anda tidak mencocokkan apa pun.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                                        <th className="py-4 px-6">Nama Produk</th>
                                        {isOwner && <th className="py-4 px-6">Cabang</th>}
                                        <th className="py-4 px-6 text-right">Harga Jual</th>
                                        <th className="py-4 px-6 text-center">Stok</th>
                                        <th className="py-4 px-6 text-center">Batas Min</th>
                                        <th className="py-4 px-6 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700 font-medium">
                                    {filteredStocks.map((s) => (
                                        <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <span className="font-bold text-[#030037] block leading-tight">{s.products.name}</span>
                                            </td>
                                            {isOwner && (
                                                <td className="py-4 px-6 text-xs text-zinc-500 font-bold">
                                                    <div className="flex items-center gap-1.5">
                                                        <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                                        {s.branches.name}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="py-4 px-6 text-right font-mono font-bold text-zinc-600">
                                                {formatCurrency(s.products.sell_price)}
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold font-mono ${
                                                    s.stock <= s.min_stock
                                                        ? "bg-rose-50 text-rose-600 border border-rose-100"
                                                        : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                }`}>
                                                    {s.stock} pcs
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-center font-mono text-zinc-400">
                                                {s.min_stock} pcs
                                            </td>
                                            <td className="py-4 px-6 text-center">
                                                <button
                                                    onClick={() => openOpnameModal(s)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 hover:bg-[#3c39d6]/10 text-[#3c39d6] bg-zinc-50 font-bold text-xs rounded-xl border border-zinc-200 hover:border-[#3c39d6]/20 transition-all"
                                                >
                                                    <Activity className="w-3.5 h-3.5" />
                                                    Opname
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 2. Log Mutations Panel */}
                <div className="bg-[#030037] border border-white/10 rounded-2xl p-6 shadow-xl flex flex-col h-[550px] text-white">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3 shrink-0">
                        <div>
                            <h3 className="font-bold text-sm font-heading flex items-center gap-1.5 text-emerald-400">
                                <Activity className="w-4 h-4 animate-pulse" />
                                Riwayat Mutasi Stok
                            </h3>
                            <p className="text-[10px] text-white/40 block mt-0.5">30 Log Aliran Barang Terbaru</p>
                        </div>
                        <FileText className="w-5 h-5 text-white/20" />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 [scrollbar-width:thin] scrollbar-color-white/10 scroll-smooth">
                        {loading ? (
                            <div className="py-12 flex justify-center"><SectionLoader /></div>
                        ) : mutations.length === 0 ? (
                            <div className="py-12 text-center text-white/30 text-xs italic">Belum ada riwayat mutasi stok terekam.</div>
                        ) : (
                            mutations.map((m) => {
                                const isTransfer = m.type === "TRANSFER";
                                const isAdjustment = m.type === "ADJUSTMENT";
                                const isRestock = m.type === "RESTOCK";
                                const isSale = m.type === "SALE";

                                return (
                                    <div key={m.id} className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1.5 hover:bg-white/10 transition-colors">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-bold text-xs text-white truncate max-w-[130px]" title={m.products.name}>
                                                {m.products.name}
                                            </span>
                                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black tracking-wide ${
                                                isTransfer ? "bg-blue-500/20 text-blue-300" :
                                                isRestock ? "bg-emerald-500/20 text-emerald-300" :
                                                isSale ? "bg-amber-500/20 text-amber-300" : "bg-zinc-500/20 text-zinc-300"
                                            }`}>
                                                {m.type}
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-white/60 space-y-0.5">
                                            <div className="flex items-center justify-between">
                                                <span>Kuantitas:</span>
                                                <strong className="text-white font-bold">{m.quantity} pcs</strong>
                                            </div>
                                            {isTransfer && (
                                                <div className="text-[10px] text-white/40 flex items-center justify-between gap-1 mt-0.5">
                                                    <span>Dari: {m.from_branch?.name.split(" ")[0]}</span>
                                                    <span>Ke: {m.to_branch?.name.split(" ")[0]}</span>
                                                </div>
                                            )}
                                            {!isTransfer && m.to_branch && (
                                                <div className="text-[10px] text-white/40 text-right">
                                                    Cabang: {m.to_branch?.name.split(" ")[0]}
                                                </div>
                                            )}
                                            {!isTransfer && m.from_branch && (
                                                <div className="text-[10px] text-white/40 text-right">
                                                    Cabang: {m.from_branch?.name.split(" ")[0]}
                                                </div>
                                            )}
                                        </div>
                                        {m.notes && (
                                            <p className="text-[10px] text-white/30 italic pt-1 border-t border-white/5 mt-1 font-sans">
                                                "{m.notes}"
                                            </p>
                                        )}
                                        <div className="text-[8px] text-white/20 text-right font-mono">
                                            {new Date(m.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Opname Stok */}
            {isOpnameModalOpen && selectedStock && (
                <div className="fixed inset-0 bg-[#030037]/40 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-zinc-150 overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
                            <h3 className="font-bold text-[#030037] font-heading">Opname Stok Fisik</h3>
                            <button onClick={() => setIsOpnameModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleOpnameSubmit} className="p-6 space-y-4">
                            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1">
                                <span className="text-zinc-400 font-bold block">Produk:</span>
                                <strong className="text-zinc-800 text-sm font-bold block">{selectedStock.products.name}</strong>
                                <span className="text-zinc-400 font-bold block mt-1">Cabang:</span>
                                <strong className="text-[#3c39d6] font-bold block">{selectedStock.branches.name}</strong>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Stok Fisik Baru</label>
                                    <input
                                        type="number"
                                        required
                                        value={formStockQty}
                                        onChange={(e) => setFormStockQty(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-[#030037] font-bold focus:outline-none focus:border-[#3c39d6]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Stok Minimum</label>
                                    <input
                                        type="number"
                                        required
                                        value={formMinStockQty}
                                        onChange={(e) => setFormMinStockQty(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-700 focus:outline-none focus:border-[#3c39d6]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Catatan Penyesuaian</label>
                                <textarea
                                    value={formOpnameNotes}
                                    onChange={(e) => setFormOpnameNotes(e.target.value)}
                                    placeholder="Contoh: Selisih 2 barang pecah / opname bulanan..."
                                    rows={2}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#3c39d6]"
                                />
                            </div>

                            <div className="pt-4 border-t border-zinc-150 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setIsOpnameModalOpen(false)} className="px-4 py-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-bold text-xs rounded-xl">Batal</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-[#3c39d6] text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Transfer Stok (Owner Only) */}
            {isTransferModalOpen && isOwner && (
                <div className="fixed inset-0 bg-[#030037]/40 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-zinc-150 overflow-hidden shadow-2xl flex flex-col">
                        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
                            <h3 className="font-bold text-[#030037] font-heading">Transfer Stok Antar-Cabang</h3>
                            <button onClick={() => setIsTransferModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                            {/* Pilih Produk */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Pilih Produk</label>
                                <select
                                    required
                                    value={formTransferProductId}
                                    onChange={(e) => setFormTransferProductId(e.target.value)}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-700 cursor-pointer"
                                >
                                    <option value="">-- Pilih Produk --</option>
                                    {products.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dari & Ke Cabang */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Dari Cabang</label>
                                    <select
                                        required
                                        value={formTransferFromBranchId}
                                        onChange={(e) => setFormTransferFromBranchId(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 cursor-pointer"
                                    >
                                        <option value="">-- Pilih --</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Ke Cabang</label>
                                    <select
                                        required
                                        value={formTransferToBranchId}
                                        onChange={(e) => setFormTransferToBranchId(e.target.value)}
                                        className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 cursor-pointer"
                                    >
                                        <option value="">-- Pilih --</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Jumlah Kuantitas */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Jumlah Barang (pcs)</label>
                                <input
                                    type="number"
                                    required
                                    min={1}
                                    value={formTransferQty}
                                    onChange={(e) => setFormTransferQty(e.target.value === "" ? "" : Number(e.target.value))}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-[#030037] font-bold focus:outline-none focus:border-[#3c39d6]"
                                />
                            </div>

                            {/* Catatan Transfer */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Catatan Transfer</label>
                                <textarea
                                    value={formTransferNotes}
                                    onChange={(e) => setFormTransferNotes(e.target.value)}
                                    placeholder="Contoh: Kirim pakan kucing tambahan untuk event Cabang Depok..."
                                    rows={2}
                                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#3c39d6]"
                                />
                            </div>

                            <div className="pt-4 border-t border-zinc-150 flex items-center justify-end gap-3">
                                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-bold text-xs rounded-xl">Batal</button>
                                <button type="submit" disabled={actionLoading} className="px-4 py-2 bg-[#3c39d6] text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50">Lakukan Transfer</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
