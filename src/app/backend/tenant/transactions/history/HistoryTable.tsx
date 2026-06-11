"use client";

import React, { useState, useTransition, useEffect, useRef } from "react";
import {
  Search,
  Calendar,
  Filter,
  Eye,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Receipt,
  X,
  Plus
} from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { deleteTransactionAction, changeTransactionStatusAction } from "../actions";

interface TransactionItem {
  id: string;
  name: string;
  amount: number;
  type: string;
  quantity: number;
  product_id: string | null;
  categories: { name: string } | null;
}

interface TransactionGroup {
  id: string;
  reference_number: string | null;
  transaction_date: string;
  total_income: number;
  total_expense: number;
  net_balance: number;
  description: string | null;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  order_status: number | null;
  transaction_items: TransactionItem[];
}

interface HistoryTableProps {
  initialData: TransactionGroup[];
  total: number;
  totalPages: number;
  stats: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
  };
  branches: Array<{ id: string; name: string }>;
  profile: any;
  searchParams: {
    search?: string;
    dateStart?: string;
    dateEnd?: string;
    page?: string;
  };
}

const ORDER_STATUSES = [
  { id: 1, label: "Pesanan Baru" },
  { id: 2, label: "Diterima & Dikonfirmasi" },
  { id: 3, label: "Diproses (Packing)" },
  { id: 4, label: "Ready (Packing)" },
  { id: 5, label: "Dikirim / Diambil" },
  { id: 6, label: "Selesai / Lunas" },
  { id: 7, label: "Penanganan Khusus" },
];

const ORDER_STATUS_COLORS: { [key: number]: { bg: string, text: string, border: string } } = {
  1: { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" }, // Blue-100
  2: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" }, // Amber-100
  3: { bg: "#f3e8ff", text: "#6b21a8", border: "#e9d5ff" }, // Purple-100
  4: { bg: "#ecfeff", text: "#155e75", border: "#c5f6fa" }, // Cyan-100
  5: { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" }, // Indigo-100
  6: { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" }, // Emerald-100
  7: { bg: "#ffe4e6", text: "#9f1239", border: "#fecdd3" }, // Rose-100
};

export default function HistoryTable({
  initialData,
  total,
  totalPages,
  stats,
  branches,
  profile,
  searchParams
}: HistoryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // State untuk input filter (lokal agar ketikan tidak memicu reload instan)
  const [searchVal, setSearchVal] = useState(searchParams.search || "");
  const [dateStartVal, setDateStartVal] = useState(searchParams.dateStart || "");
  const [dateEndVal, setDateEndVal] = useState(searchParams.dateEnd || "");

  // Modal Detail state
  const [selectedTx, setSelectedTx] = useState<TransactionGroup | null>(null);

  // Debouncing pencarian
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const updateQueryParams = (newParams: Record<string, string | number | null | undefined>) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      Object.entries(newParams).forEach(([key, val]) => {
        if (val === undefined || val === null || val === "") {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      });
      // Selalu reset page ke 1 jika filter non-page berubah
      if (!newParams.hasOwnProperty("page")) {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchVal(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      updateQueryParams({ search: value });
    }, 400);
  };

  const handleDateStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateStartVal(value);
    updateQueryParams({ dateStart: value });
  };

  const handleDateEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDateEndVal(value);
    updateQueryParams({ dateEnd: value });
  };

  const handlePageChange = (newPage: number) => {
    updateQueryParams({ page: newPage });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) return;
    try {
      const res = await deleteTransactionAction(id);
      if (res.status === "success") {
        toast.success("Transaksi berhasil dihapus");
        router.refresh();
      } else {
        toast.error(res.message || "Gagal menghapus transaksi");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan");
    }
  };

  const handleStatusChange = async (id: string, newStatus: number) => {
    try {
      const res = await changeTransactionStatusAction(id, newStatus);
      if (res.status === "success") {
        toast.success("Status pesanan diperbarui!");
        router.refresh();
      } else {
        toast.error(res.message || "Gagal memperbarui status");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan");
    }
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  const currentPage = Number(searchParams.page || "1");

  return (
    <div className="flex flex-col gap-4 w-full max-w-full pb-16 px-4 sm:px-6 py-2" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-[2px] bg-primary rounded-full" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Riwayat Finansial</span>
          </div>
          <h1 className="text-2xl font-black text-[#030037] tracking-tighter">Laporan <span className="text-primary">Transaksi</span></h1>
          <p className="text-zinc-500 text-xs font-medium">Kelola dan tinjau semua aktivitas kas masuk dan keluar UMKM Anda.</p>
        </div>
        
        <button 
          onClick={() => router.push("/backend/tenant/transactions")}
          className="flex items-center gap-2 px-5 py-2 bg-[#030037] text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95 h-[34px]"
        >
          <Plus className="w-4 h-4" /> Tambah Transaksi
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-zinc-100 px-4 py-3 rounded-xl shadow-sm flex flex-col gap-0.5">
           <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Total Pemasukan</span>
           <h3 className="text-lg font-black text-emerald-600 tracking-tight">
             {formatCurrency(stats.totalIncome)}
           </h3>
        </div>
        <div className="bg-white border border-zinc-100 px-4 py-3 rounded-xl shadow-sm flex flex-col gap-0.5">
           <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Pengeluaran</span>
           <h3 className="text-lg font-black text-rose-600 tracking-tight">
             {formatCurrency(stats.totalExpense)}
           </h3>
        </div>
        <div className="bg-[#030037] px-4 py-3 rounded-xl shadow-md flex flex-col gap-0.5">
           <span className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Saldo Filter</span>
           <h3 className={`text-lg font-black tracking-tight ${stats.netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
             {formatCurrency(stats.netBalance)}
           </h3>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-zinc-100 rounded-xl p-3 flex flex-col lg:flex-row gap-3 shadow-sm">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Cari nomor referensi..." 
            className="w-full bg-zinc-50 border border-zinc-100 px-11 py-2 rounded-lg text-xs font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 outline-none transition-all text-black"
            value={searchVal}
            onChange={handleSearchChange}
          />
        </div>

        <div className="flex items-center gap-2">
           <div className="relative group">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="date" 
                className="bg-zinc-50 border border-zinc-100 pl-9 pr-4 py-2 rounded-lg text-[10px] font-black uppercase text-black outline-none focus:bg-white"
                value={dateStartVal}
                onChange={handleDateStartChange}
              />
           </div>
           <span className="text-zinc-300 font-bold text-xs">s/d</span>
           <div className="relative group">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="date" 
                className="bg-zinc-50 border border-zinc-100 pl-9 pr-4 py-2 rounded-lg text-[10px] font-black uppercase text-black outline-none focus:bg-white"
                value={dateEndVal}
                onChange={handleDateEndChange}
              />
           </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-zinc-100 rounded-xl overflow-hidden shadow-sm relative">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-50">
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-455 uppercase tracking-widest">Nota</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-455 uppercase tracking-widest">Nama Pembeli</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-455 uppercase tracking-widest text-center">Detail</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-455 uppercase tracking-widest">Transaksi</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-455 uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-zinc-455 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {initialData.length > 0 ? (
                initialData.map((tx) => {
                   const isPOSTransaction = tx.transaction_items?.some((item) => item.product_id);
                   return (
                      <tr key={tx.id} className="group hover:bg-zinc-50/50 transition-colors">
                        {/* 1. NOTA */}
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3 text-center">
                           <button 
                              onClick={() => setSelectedTx(tx)} 
                              className="px-3 py-1.5 bg-zinc-50 border border-zinc-100 hover:bg-primary hover:text-white hover:border-primary text-zinc-600 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                           >
                              Lihat Detail
                           </button>
                        </td>
     
                        {/* 4. TRANSAKSI */}
                        <td className="px-4 py-3">
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
                        <td className="px-4 py-3">
                           {isPOSTransaction ? (
                             <div className="relative flex items-center w-fit">
                                {(() => {
                                  const sc = ORDER_STATUS_COLORS[tx.order_status ?? 6] || { bg: "#f4f4f5", text: "#27272a", border: "#e4e4e7" };
                                  return (
                                    <select
                                      value={tx.order_status ?? 6}
                                      onChange={(e) => handleStatusChange(tx.id, Number(e.target.value))}
                                      className="text-[9px] font-black uppercase tracking-tight py-1 pl-6 pr-6 rounded-full border cursor-pointer outline-none transition-all appearance-none text-zinc-900 text-center"
                                      style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}
                                    >
                                      {ORDER_STATUSES.map(status => (
                                        <option key={status.id} value={status.id} className="bg-white text-zinc-900 font-bold uppercase text-[9px] text-center">
                                          {status.label}
                                        </option>
                                      ))}
                                    </select>
                                  );
                                })()}
                                <ChevronDown className="absolute right-2 w-3 h-3 text-zinc-500 pointer-events-none" />
                             </div>
                           ) : (
                             <span className="text-zinc-400 font-bold text-xs block text-center max-w-[120px]">-</span>
                           )}
                        </td>
     
                        {/* 6. AKSI (EDIT & DELETE) */}
                        <td className="px-4 py-3 text-center">
                           <div className="flex items-center justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button 
                                 onClick={() => {
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
                   );
                })
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
              Menampilkan {initialData.length} dari {total} Transaksi
           </p>
           
           {totalPages > 1 && (
             <div className="flex items-center gap-1.5">
                <button onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-100 text-zinc-400 hover:text-primary disabled:opacity-20 transition-all">
                   <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 text-[10px] font-black text-[#030037]">{currentPage} / {totalPages}</div>
                <button onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-100 text-zinc-400 hover:text-primary disabled:opacity-20 transition-all">
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
                       {(() => {
                         const sc = ORDER_STATUS_COLORS[selectedTx.order_status ?? 6] || { bg: "#f4f4f5", text: "#27272a", border: "#e4e4e7" };
                         return (
                           <span 
                             className="inline-block text-[10px] font-black uppercase tracking-tight py-1 px-3 rounded-full border"
                             style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}
                           >
                             {ORDER_STATUSES.find(s => s.id === (selectedTx.order_status ?? 6))?.label || "Selesai"}
                           </span>
                         );
                       })()}
                    </div>
                 </div>

                 {/* Customer Information */}
                 {(selectedTx.customer_name || selectedTx.customer_phone || selectedTx.customer_address) && (
                    <div className="space-y-3 bg-[#f8f9fa] border border-zinc-200/60 p-5 rounded-2xl shadow-sm">
                       <h5 className="text-[10px] font-black text-[#030037] uppercase tracking-widest border-b border-zinc-250/50 pb-1.5 flex items-center gap-2">
                          Informasi Pembeli
                       </h5>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                          {selectedTx.customer_name && (
                             <div className="space-y-0.5">
                                <span className="text-[8px] text-zinc-400 uppercase block">Nama Pembeli</span>
                                <span className="text-zinc-805 text-black">{selectedTx.customer_name}</span>
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
                       {selectedTx.transaction_items.map((item) => (
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
}
