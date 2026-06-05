"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Calendar,
  ShoppingCart,
  Eye,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Printer,
  X,
  Package,
  User,
  ArrowLeft,
  Plus,
  Receipt,
  TrendingUp,
  CheckCircle2,
  Hash,
} from "lucide-react";
import FullPageLoader from "@/components/layout/FullPageLoader";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TransactionItem {
  id: string;
  name: string;
  amount: number;
  quantity: number | null;
  product_id: string | null;
  payment_method_id: string | null;
  categories?: { name: string } | null;
  payment_methods?: { name: string } | null;
}

interface SaleTransaction {
  id: string;
  reference_number: string | null;
  transaction_date: string;
  total_income: number;
  description: string | null;
  customer_name: string | null;
  created_at: string;
  transaction_items: TransactionItem[];
  branch_id: string | null;
  order_status: number | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function SalesHistoryPage() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<SaleTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("SiPetto UMKM");

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dateStart, setDateStart] = useState("");
  const [dateEnd, setDateEnd] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 15;

  // Modal detail
  const [selectedTx, setSelectedTx] = useState<SaleTransaction | null>(null);

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setPage(1);
    }, 500);
  };

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchSales = useCallback(async () => {
    if (!profileId) return;
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        profile_id: profileId,
        page: String(page),
        limit: String(limit),
        // Filter hanya transaksi POS (status 6 = selesai dari kasir)
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(dateStart && { date_start: dateStart }),
        ...(dateEnd && { date_end: dateEnd }),
      });

      const res = await fetch(`/api/backend/transaction/group?${params}`);
      if (res.ok) {
        const json = await res.json();
        // Filter hanya transaksi yang berasal dari POS (punya product_id di item)
        const posOnly: SaleTransaction[] = (json.data || []).filter(
          (tx: SaleTransaction) =>
            tx.transaction_items?.some((item) => item.product_id !== null)
        );
        setTransactions(posOnly);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      }
    } catch {
      toast.error("Gagal mengambil data penjualan");
    } finally {
      setIsLoading(false);
    }
  }, [profileId, page, debouncedSearch, dateStart, dateEnd]);

  // Init profile
  useEffect(() => {
    const init = async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const json = await res.json();
        const tid = json.tenant_owner_id || json.id;
        setProfileId(tid);
        setBusinessName(json.business_name || "SiPetto UMKM");
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Hapus data penjualan ini? Stok akan dikembalikan secara otomatis.")) return;
    try {
      const res = await fetch(`/api/backend/transaction/group?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Data penjualan berhasil dihapus");
        if (selectedTx?.id === id) setSelectedTx(null);
        fetchSales();
      } else {
        toast.error("Gagal menghapus data penjualan");
      }
    } catch {
      toast.error("Kesalahan jaringan");
    }
  };

  // ─── Print Nota PDF ────────────────────────────────────────────────────────
  const handlePrintNota = (tx: SaleTransaction) => {
    const doc = new jsPDF({ unit: "mm", format: [80, 160] });

    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    doc.text(businessName.toUpperCase(), 40, 10, { align: "center" });

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text("---------------------------------", 40, 15, { align: "center" });
    doc.text(`Nota  : #${tx.reference_number || "-"}`, 5, 20);
    doc.text(`Tgl   : ${new Date(tx.transaction_date).toLocaleDateString("id-ID")}`, 5, 25);
    doc.text(`Cust  : ${tx.customer_name || "Pembeli Umum"}`, 5, 30);
    const payMethod = tx.transaction_items[0]?.payment_methods?.name || "Tunai";
    doc.text(`Bayar : ${payMethod}`, 5, 35);
    doc.text("---------------------------------", 40, 40, { align: "center" });

    let y = 46;
    tx.transaction_items.forEach((item) => {
      const nameTrunc = item.name.slice(0, 22);
      const qty = item.quantity || 1;
      const unitPrice = Math.round(item.amount / qty);
      const subtotal = new Intl.NumberFormat("id-ID").format(item.amount);
      const unitPriceFmt = new Intl.NumberFormat("id-ID").format(unitPrice);

      doc.setFont("courier", "bold");
      doc.text(nameTrunc, 5, y);
      doc.setFont("courier", "normal");
      doc.text(`${qty} x ${unitPriceFmt}`, 5, y + 4);
      doc.text(subtotal, 75, y + 4, { align: "right" });
      y += 10;
    });

    const totalFmt = new Intl.NumberFormat("id-ID").format(Number(tx.total_income));
    doc.text("---------------------------------", 40, y, { align: "center" });
    doc.setFont("courier", "bold");
    doc.text("TOTAL  :", 5, y + 5);
    doc.text(totalFmt, 75, y + 5, { align: "right" });
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.text("Terima kasih telah berbelanja!", 40, y + 13, { align: "center" });
    doc.text("Powered by SiPetto", 40, y + 17, { align: "center" });

    window.open(doc.output("bloburl"));
  };

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(v);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const totalRevenue = transactions.reduce(
    (sum, tx) => sum + Number(tx.total_income),
    0
  );
  const totalItems = transactions.reduce(
    (sum, tx) =>
      sum +
      tx.transaction_items.reduce((s, i) => s + (i.quantity || 1), 0),
    0
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col gap-6 w-full max-w-full pb-20 px-4 sm:px-6 py-2"
      style={{ fontFamily: "var(--font-jakarta), sans-serif" }}
    >
      {isLoading && <FullPageLoader />}

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/backend/tenant/sales")}
              className="flex items-center gap-1.5 text-[10px] font-black text-zinc-400 hover:text-[#3c39d6] uppercase tracking-widest transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Kembali ke Kasir
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-1 bg-emerald-500 rounded-full" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
              Riwayat Penjualan POS
            </span>
          </div>
          <h1 className="text-3xl font-black text-[#030037] tracking-tighter">
            Data <span className="text-[#3c39d6]">Penjualan Kasir</span>
          </h1>
          <p className="text-zinc-400 text-xs font-medium">
            Semua transaksi yang dicatat melalui kasir POS — bisa diedit, lihat nota, dan hapus.
          </p>
        </div>

        <button
          onClick={() => router.push("/backend/tenant/sales")}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#3c39d6] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2a28b8] transition-all shadow-lg shadow-indigo-200 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Transaksi Baru
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            Omzet (Halaman ini)
          </span>
          <h3 className="text-lg font-black text-emerald-600 tracking-tight">
            {formatCurrency(totalRevenue)}
          </h3>
          <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {transactions.length} nota
          </span>
        </div>
        <div className="bg-white border border-zinc-100 p-5 rounded-2xl shadow-sm flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
            Total Item Terjual
          </span>
          <h3 className="text-lg font-black text-[#3c39d6] tracking-tight">
            {totalItems.toLocaleString("id-ID")} pcs
          </h3>
          <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
            <Package className="w-3 h-3" />
            semua produk
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-[#030037] p-5 rounded-2xl shadow-lg flex flex-col gap-1.5">
          <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">
            Rata-Rata Nota
          </span>
          <h3 className="text-lg font-black text-emerald-400 tracking-tight">
            {transactions.length > 0
              ? formatCurrency(totalRevenue / transactions.length)
              : "Rp 0"}
          </h3>
          <span className="text-[10px] text-white/40 font-medium flex items-center gap-1">
            <Receipt className="w-3 h-3" />
            per transaksi
          </span>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="bg-white border border-zinc-100 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari no. nota atau nama pelanggan..."
            className="w-full bg-zinc-50 border border-zinc-200 pl-11 pr-4 py-2.5 rounded-xl text-xs font-bold focus:outline-none focus:border-[#3c39d6] focus:bg-white transition-all text-zinc-800 placeholder:font-medium"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        {/* Date range */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              className="bg-transparent border-0 text-xs font-bold text-zinc-700 focus:ring-0 outline-none w-32"
              value={dateStart}
              onChange={(e) => { setDateStart(e.target.value); setPage(1); }}
            />
          </div>
          <span className="text-zinc-300 text-xs">—</span>
          <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="date"
              className="bg-transparent border-0 text-xs font-bold text-zinc-700 focus:ring-0 outline-none w-32"
              value={dateEnd}
              onChange={(e) => { setDateEnd(e.target.value); setPage(1); }}
            />
          </div>
          {(dateStart || dateEnd) && (
            <button
              onClick={() => { setDateStart(""); setDateEnd(""); setPage(1); }}
              className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
              title="Reset tanggal"
            >
              <X className="w-3.5 h-3.5 text-zinc-500" />
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-zinc-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-100">
                <th className="px-5 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">No. Nota</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pelanggan</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Produk</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={6}>
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-3xl flex items-center justify-center">
                        <ShoppingCart className="w-7 h-7 text-zinc-300" />
                      </div>
                      <div>
                        <p className="font-black text-zinc-700 text-sm">Belum ada data penjualan</p>
                        <p className="text-xs text-zinc-400 font-medium mt-1">
                          Mulai transaksi dari halaman kasir POS
                        </p>
                      </div>
                      <button
                        onClick={() => router.push("/backend/tenant/sales")}
                        className="flex items-center gap-2 px-5 py-2 bg-[#3c39d6] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#2a28b8] transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Buka Kasir
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const itemsCount = tx.transaction_items.reduce(
                    (s, i) => s + (i.quantity || 1),
                    0
                  );
                  const productNames = tx.transaction_items
                    .slice(0, 2)
                    .map((i) => i.name.replace(/\s*\(x\d+\)/, ""))
                    .join(", ");
                  const moreCount = tx.transaction_items.length - 2;

                  return (
                    <tr
                      key={tx.id}
                      className="group border-b border-zinc-50 hover:bg-zinc-50/70 transition-colors"
                    >
                      {/* Nota */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                            <Hash className="w-3 h-3 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-zinc-800">
                              {tx.reference_number || "—"}
                            </p>
                            <span className="flex items-center gap-1 mt-0.5">
                              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                              <span className="text-[9px] font-bold text-emerald-600">Lunas</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Tanggal */}
                      <td className="px-5 py-4">
                        <p className="text-xs font-bold text-zinc-700">{formatDate(tx.transaction_date)}</p>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {new Date(tx.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </td>

                      {/* Pelanggan */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-700">
                            {tx.customer_name || "Pembeli Umum"}
                          </span>
                        </div>
                      </td>

                      {/* Produk */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <p className="text-xs font-bold text-zinc-700 truncate max-w-[180px]">
                            {productNames}
                            {moreCount > 0 && (
                              <span className="text-zinc-400 font-medium"> +{moreCount} lainnya</span>
                            )}
                          </p>
                          <span className="text-[10px] text-zinc-400 font-medium flex items-center gap-1">
                            <Package className="w-2.5 h-2.5" />
                            {itemsCount} item · {tx.transaction_items.length} produk
                          </span>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-emerald-600">
                          {formatCurrency(Number(tx.total_income))}
                        </p>
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {/* Lihat Detail */}
                          <button
                            onClick={() => setSelectedTx(tx)}
                            className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-[#3c39d6] hover:border-indigo-100 shadow-sm transition-all"
                            title="Lihat Detail Nota"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {/* Cetak Nota */}
                          <button
                            onClick={() => handlePrintNota(tx)}
                            className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-emerald-500 hover:border-emerald-100 shadow-sm transition-all"
                            title="Cetak Nota PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => router.push(`/backend/tenant/sales?id=${tx.id}`)}
                            className="p-2 bg-white border border-zinc-100 rounded-lg text-zinc-400 hover:text-amber-500 hover:border-amber-100 shadow-sm transition-all"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Hapus */}
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
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-4 border-t border-zinc-100 flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold text-zinc-400">
              Menampilkan {transactions.length} dari {total} nota penjualan
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-zinc-600" />
              </button>
              <span className="text-xs font-black text-zinc-700 px-2">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 bg-zinc-50 border border-zinc-200 rounded-lg hover:bg-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Detail Nota ── */}
      {selectedTx && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedTx(null); }}
        >
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border border-zinc-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-1 bg-emerald-500 rounded-full" />
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Detail Nota</span>
                </div>
                <h3 className="text-base font-black text-[#030037]">
                  #{selectedTx.reference_number || "—"}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintNota(selectedTx)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#030037] text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all"
                >
                  <Printer className="w-3 h-3" />
                  Cetak
                </button>
                <button
                  onClick={() => setSelectedTx(null)}
                  className="p-2 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
                >
                  <X className="w-4 h-4 text-zinc-500" />
                </button>
              </div>
            </div>

            {/* Meta Info */}
            <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-100 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Tanggal</p>
                <p className="text-xs font-bold text-zinc-800">{formatDate(selectedTx.transaction_date)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Pelanggan</p>
                <p className="text-xs font-bold text-zinc-800">{selectedTx.customer_name || "Pembeli Umum"}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Metode Bayar</p>
                <p className="text-xs font-bold text-zinc-800">
                  {selectedTx.transaction_items[0]?.payment_methods?.name || "Tunai"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">Keterangan</p>
                <p className="text-xs font-bold text-zinc-800">{selectedTx.description || "—"}</p>
              </div>
            </div>

            {/* Items List */}
            <div className="px-6 py-4 max-h-64 overflow-y-auto space-y-2">
              {selectedTx.transaction_items.map((item, idx) => {
                const qty = item.quantity || 1;
                const unitPrice = Math.round(item.amount / qty);
                return (
                  <div key={item.id || idx} className="flex items-center gap-3 py-2 border-b border-zinc-50 last:border-0">
                    <div className="w-8 h-8 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <Package className="w-3.5 h-3.5 text-[#3c39d6]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 truncate">
                        {item.name.replace(/\s*\(x\d+\)/, "")}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        {qty} × {formatCurrency(unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-black text-zinc-800 shrink-0">
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Total Footer */}
            <div className="px-6 py-4 bg-[#030037] flex items-center justify-between">
              <span className="text-xs font-black text-white/60 uppercase tracking-widest">Total Pembayaran</span>
              <span className="text-xl font-black text-emerald-400">
                {formatCurrency(Number(selectedTx.total_income))}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 px-6 py-4">
              <button
                onClick={() => {
                  setSelectedTx(null);
                  router.push(`/backend/tenant/sales?id=${selectedTx.id}`);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Transaksi
              </button>
              <button
                onClick={() => {
                  setSelectedTx(null);
                  handleDelete(selectedTx.id);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
