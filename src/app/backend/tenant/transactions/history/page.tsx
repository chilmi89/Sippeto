"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Calendar,
  Filter,
  MoreHorizontal,
  Eye,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Receipt,
  X,
  Plus
} from "lucide-react";
import FullPageLoader from "@/components/layout/FullPageLoader";
import SectionLoader from "@/components/layout/SectionLoader";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

interface TransactionGroup {
  id: string;
  reference_number: string | null;
  transaction_date: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  description: string | null;
  created_at: string;
  transaction_items: any[];
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  order_status?: number | null;
}

const ORDER_STATUSES = [
  { id: 1, label: "Pesanan Baru", color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50" },
  { id: 2, label: "Diterima & Dikonfirmasi", color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50" },
  { id: 3, label: "Diproses (Packing)", color: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50" },
  { id: 4, label: "Ready (Packing)", color: "bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/50" },
  { id: 5, label: "Dikirim / Diambil", color: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50" },
  { id: 6, label: "Selesai / Lunas", color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50" },
  { id: 7, label: "Penanganan Khusus", color: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50" },
];

const TransactionHistoryPage = () => {
  const router = useRouter();
  
  // State
  const [transactions, setTransactions] = useState<TransactionGroup[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10;

  // Modal Detail state
  const [selectedTx, setSelectedTx] = useState<TransactionGroup | null>(null);

  // Search Debounce
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 500);
  };

  const fetchTransactions = useCallback(async () => {
    if (!profileId) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        profile_id: profileId,
        page: String(page),
        limit: String(limit),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(dateStart && { date_start: dateStart }),
        ...(dateEnd && { date_end: dateEnd }),
      });

      const res = await fetch(`/api/backend/transaction/group?${params}`);
      if (res.ok) {
        const json = await res.json();
        setTransactions(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch (err) {
      toast.error("Gagal mengambil data transaksi");
    } finally {
      setIsLoading(false);
    }
  }, [profileId, page, debouncedSearch, dateStart, dateEnd]);

  useEffect(() => {
    const getProfile = async () => {
      const res = await fetch("/api/backend/tenant-umkm");
      if (res.ok) {
        const json = await res.json();
        setProfileId(json.profile.id);
      }
    };
    getProfile();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    try {
      const res = await fetch(`/api/backend/transaction/group?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Transaksi berhasil dihapus");
        fetchTransactions();
      } else {
        toast.error("Gagal menghapus transaksi");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan");
    }
  };

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      const res = await fetch("/api/backend/transaction/group", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, order_status: newStatus })
      });
      if (res.ok) {
        toast.success("Status pesanan diperbarui!");
        setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, order_status: newStatus } : tx));
      } else {
        toast.error("Gagal memperbarui status");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan");
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  return (
    <div className="flex flex-col gap-6 w-full max-w-full pb-20 px-4 sm:px-6 py-2" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-1 bg-primary rounded-full" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Riwayat Finansial</span>
          </div>
          <h1 className="text-3xl font-black text-[#030037] tracking-tighter">Laporan <span className="text-primary">Transaksi</span></h1>
          <p className="text-zinc-500 text-sm font-medium">Kelola dan tinjau semua aktivitas kas masuk dan keluar UMKM Anda.</p>
        </div>
        
        <button 
          onClick={() => router.push("/backend/tenant/transactions")}
          className="flex items-center gap-2 px-6 py-2.5 bg-[#030037] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-zinc-200 active:scale-95"
        >
          <Plus className="w-4 h-4" /> Tambah Transaksi
        </button>
      </div>

      {/* Stats Summary (Conditional on result) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Pemasukan</span>
           <h3 className="text-xl font-black text-emerald-600 tracking-tight">
             {formatCurrency(transactions.reduce((acc, tx) => acc + Number(tx.total_income), 0))}
           </h3>
        </div>
        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-sm flex flex-col gap-1">
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Pengeluaran</span>
           <h3 className="text-xl font-black text-rose-600 tracking-tight">
             {formatCurrency(transactions.reduce((acc, tx) => acc + Number(tx.total_expense), 0))}
           </h3>
        </div>
        <div className="bg-[#030037] p-5 rounded-2xl shadow-lg flex flex-col gap-1">
           <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Saldo Filter</span>
           <h3 className={`text-xl font-black tracking-tight ${transactions.reduce((acc, tx) => acc + Number(tx.net_balance), 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             {formatCurrency(transactions.reduce((acc, tx) => acc + Number(tx.net_balance), 0))}
           </h3>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-zinc-100 rounded-2xl p-4 flex flex-col lg:flex-row gap-4 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Cari nomor referensi..." 
            className="w-full bg-zinc-50 border border-zinc-100 px-11 py-2.5 rounded-xl text-xs font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
           <div className="relative group">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="date" 
                className="bg-zinc-50 border border-zinc-100 pl-9 pr-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-zinc-600 outline-none focus:bg-white"
                value={dateStart}
                onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
              />
           </div>
           <span className="text-zinc-300 font-bold text-xs">s/d</span>
           <div className="relative group">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="date" 
                className="bg-zinc-50 border border-zinc-100 pl-9 pr-4 py-2.5 rounded-xl text-[10px] font-black uppercase text-zinc-600 outline-none focus:bg-white"
                value={dateEnd}
                onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
              />
           </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-xl shadow-zinc-200/20">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-50">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nota</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Nama Pembeli</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Detail</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Transaksi</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {isLoading ? (
                <tr>
                   <td colSpan={6} className="py-24">
                      <SectionLoader text="Mengambil Riwayat Transaksi..." />
                   </td>
                </tr>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-zinc-50/50 transition-colors">
                    {/* 1. NOTA */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all">
                           <Receipt className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-xs font-black text-[#030037] uppercase tracking-tight">#{tx.reference_number || tx.id.slice(0, 8)}</span>
                           <span className="text-[10px] font-medium text-zinc-400">
                              {new Date(tx.transaction_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                           </span>
                        </div>
                      </div>
                    </td>

                    {/* 2. NAMA PEMBELI */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         <span className="text-xs font-bold text-zinc-800">
                            {tx.customer_name || "Manual / Operasional"}
                         </span>
                         {tx.customer_phone && (
                            <span className="text-[9px] font-medium text-zinc-400">{tx.customer_phone}</span>
                         )}
                      </div>
                    </td>

                    {/* 3. DETAIL */}
                    <td className="px-6 py-4 text-center">
                       <button 
                          onClick={() => setSelectedTx(tx)} 
                          className="px-3 py-1.5 bg-zinc-50 border border-zinc-100 hover:bg-primary hover:text-white hover:border-primary text-zinc-600 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                       >
                          Lihat Detail
                       </button>
                    </td>

                    {/* 4. TRANSAKSI */}
                    <td className="px-6 py-4">
                       <div className="flex flex-col">
                          {Number(tx.total_income) > 0 && (
                            <span className="text-xs font-black text-emerald-600">
                               + {formatCurrency(Number(tx.total_income))}
                            </span>
                          )}
                          {Number(tx.total_expense) > 0 && (
                            <span className="text-xs font-black text-rose-600">
                               - {formatCurrency(Number(tx.total_expense))}
                            </span>
                          )}
                          {Number(tx.total_income) === 0 && Number(tx.total_expense) === 0 && (
                            <span className="text-xs font-black text-zinc-400">
                               {formatCurrency(0)}
                            </span>
                          )}
                       </div>
                    </td>

                    {/* 5. STATUS */}
                    <td className="px-6 py-4">
                       <div className="relative flex items-center">
                          <select
                            value={tx.order_status ?? 6}
                            onChange={(e) => handleStatusChange(tx.id, Number(e.target.value))}
                            className={`text-[9px] font-black uppercase tracking-tight py-1 pl-2.5 pr-6 rounded-full border cursor-pointer outline-none transition-all appearance-none ${
                              ORDER_STATUSES.find(s => s.id === (tx.order_status ?? 6))?.color || "bg-zinc-50 text-zinc-600 border-zinc-100"
                            }`}
                          >
                            {ORDER_STATUSES.map(status => (
                              <option key={status.id} value={status.id} className="bg-white text-zinc-900 font-bold uppercase text-[9px]">
                                {status.label}
                              </option>
                            ))}
                          </select>
                       </div>
                    </td>

                    {/* 6. AKSI (EDIT & DELETE) */}
                    <td className="px-6 py-4 text-center">
                       <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button 
                             onClick={() => {
                                // Jika transaksi ini berasal dari POS (ada product_id), arahkan ke halaman POS
                                const isPOSTransaction = tx.transaction_items?.some((item: any) => item.product_id);
                                if (isPOSTransaction) {
                                  router.push(`/backend/tenant/sales?id=${tx.id}`);
                                } else {
                                  router.push(`/backend/tenant/transactions?id=${tx.id}`);
                                }
                              }} 
                             className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-amber-500 hover:border-amber-100 shadow-sm transition-all"
                             title="Edit"
                          >
                             <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                             onClick={() => handleDelete(tx.id)} 
                             className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-rose-500 hover:border-rose-100 shadow-sm transition-all"
                             title="Hapus"
                          >
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={6} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <div className="w-14 h-14 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-200">
                            <Filter className="w-6 h-6" />
                         </div>
                         <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Data tidak ditemukan</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="px-8 py-5 border-t border-zinc-50 flex flex-col sm:flex-row items-center justify-between gap-4">
           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Menampilkan {transactions.length} dari {total} Transaksi
           </p>
           
           {totalPages > 1 && (
             <div className="flex items-center gap-1.5">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-100 text-zinc-400 hover:text-primary disabled:opacity-20 transition-all">
                   <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 text-[10px] font-black text-[#030037]">{page} / {totalPages}</div>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-100 text-zinc-400 hover:text-primary disabled:opacity-20 transition-all">
                   <ChevronRight className="w-4 h-4" />
                </button>
             </div>
           )}
        </div>
      </div>

      {/* Modal Detail */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                 <div className="flex items-center gap-3">
                    <Receipt className="w-5 h-5 text-primary" />
                    <div>
                       <h4 className="text-lg font-black text-[#030037]">Rincian Transaksi</h4>
                       <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">#{selectedTx.reference_number || selectedTx.id}</p>
                    </div>
                 </div>
                 <button onClick={() => setSelectedTx(null)} className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-all">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-b border-zinc-100 pb-6">
                    <div className="space-y-1">
                       <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Pemasukan</span>
                       <p className="text-xl font-black text-emerald-600">{formatCurrency(selectedTx.total_income)}</p>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Pengeluaran</span>
                       <p className="text-xl font-black text-rose-600">{formatCurrency(selectedTx.total_expense)}</p>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Status Alur</span>
                       <div>
                          <span className={`inline-block text-[10px] font-black uppercase tracking-tight py-1 px-3 rounded-full border ${
                            ORDER_STATUSES.find(s => s.id === (selectedTx.order_status ?? 6))?.color || "bg-zinc-50 text-zinc-600 border-zinc-100"
                          }`}>
                            {ORDER_STATUSES.find(s => s.id === (selectedTx.order_status ?? 6))?.label || "Selesai"}
                          </span>
                       </div>
                    </div>
                 </div>

                 {/* Customer Information (Only show if it's an online order or has customer name) */}
                 {(selectedTx.customer_name || selectedTx.customer_phone || selectedTx.customer_address) && (
                    <div className="space-y-3 bg-[#f8f9fa] border border-zinc-200/60 p-5 rounded-2xl shadow-sm">
                       <h5 className="text-[10px] font-black text-[#030037] uppercase tracking-widest border-b border-zinc-250/50 pb-1.5 flex items-center gap-2">
                          Informasi Pembeli
                       </h5>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                          {selectedTx.customer_name && (
                             <div className="space-y-0.5">
                                <span className="text-[8px] text-zinc-400 uppercase block">Nama Pembeli</span>
                                <span className="text-zinc-800">{selectedTx.customer_name}</span>
                             </div>
                          )}
                          {selectedTx.customer_phone && (
                             <div className="space-y-0.5">
                                <span className="text-[8px] text-zinc-400 uppercase block">No. Telepon / WA</span>
                                <a href={`https://wa.me/${selectedTx.customer_phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                                   {selectedTx.customer_phone}
                                </a>
                             </div>
                          )}
                          {selectedTx.customer_address && (
                             <div className="space-y-0.5 sm:col-span-2">
                                <span className="text-[8px] text-zinc-400 uppercase block">Alamat Pengiriman</span>
                                <span className="text-zinc-600 font-medium">{selectedTx.customer_address}</span>
                             </div>
                          )}
                       </div>
                    </div>
                 )}

                 <div className="space-y-3">
                    <h5 className="text-[10px] font-black text-[#030037] uppercase tracking-widest border-b border-zinc-100 pb-2">Item Terkait</h5>
                    <div className="space-y-2">
                       {selectedTx.transaction_items.map((item: any) => (
                         <div key={item.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                            <div className="flex items-center gap-3">
                               <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                  {item.type === 'INCOME' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                               </div>
                               <div>
                                  <p className="text-xs font-bold text-zinc-800">{item.name}</p>
                                  <p className="text-[9px] font-bold text-zinc-400 uppercase">{item.categories?.name || 'Kategori Umum'}</p>
                               </div>
                            </div>
                            <span className={`text-xs font-black ${item.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                               {formatCurrency(item.amount)}
                            </span>
                         </div>
                       ))}
                    </div>
                 </div>

                 {selectedTx.description && (
                    <div className="space-y-1 pt-4 border-t border-zinc-100">
                       <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Catatan Tambahan</span>
                       <p className="text-xs text-zinc-600 italic">"{selectedTx.description}"</p>
                    </div>
                 )}
              </div>

              <div className="px-8 py-6 bg-zinc-50/50 border-t border-zinc-100 flex justify-end">
                 <button onClick={() => setSelectedTx(null)} className="px-8 py-2.5 bg-[#030037] text-white rounded-xl text-[10px] font-black uppercase tracking-widest">Tutup</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistoryPage;
