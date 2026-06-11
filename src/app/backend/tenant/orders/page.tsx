"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingBag, Calendar, User, Phone, MapPin, CreditCard, 
  CheckCircle2, XCircle, ChevronDown, ChevronUp, Search, 
  ExternalLink, Filter, Package, AlertCircle
} from "lucide-react";
import { toast } from "react-toastify";
import SectionLoader from "@/components/layout/SectionLoader";

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  products?: {
    name: string;
  } | null;
}

interface Order {
  id: string;
  reference_number: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string | null;
  payment_method: string;
  total_price: string;
  status: "PENDING" | "SUCCESS" | "CANCELLED";
  created_at: string;
  branches?: {
    name: string;
  } | null;
  order_items: OrderItem[];
}

export default function TenantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "SUCCESS" | "CANCELLED">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/backend/tenant/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      } else {
        toast.error("Gagal mengambil daftar pesanan.");
      }
    } catch {
      toast.error("Kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    orderId: string;
    reference: string;
    newStatus: "SUCCESS" | "CANCELLED";
    message: string;
  }>({
    isOpen: false,
    orderId: "",
    reference: "",
    newStatus: "SUCCESS",
    message: "",
  });

  const triggerUpdateStatus = (orderId: string, reference: string, newStatus: "SUCCESS" | "CANCELLED") => {
    const message = newStatus === "SUCCESS"
      ? `Konfirmasi lunas pesanan ${reference}? Tindakan ini akan memotong stok produk dan mencatat pemasukan keuangan secara otomatis.`
      : `Batalkan pesanan ${reference}?`;
      
    setConfirmModal({
      isOpen: true,
      orderId,
      reference,
      newStatus,
      message,
    });
  };

  const handleConfirmAction = async () => {
    const { orderId, newStatus } = confirmModal;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    setActionLoading(prev => ({ ...prev, [orderId]: true }));
    try {
      const res = await fetch("/api/backend/tenant/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(newStatus === "SUCCESS" ? "Pembayaran berhasil dikonfirmasi & stok berkurang!" : "Pesanan berhasil dibatalkan.");
        fetchOrders();
      } else {
        toast.error(data.error || "Gagal memperbarui status pesanan.");
      }
    } catch {
      toast.error("Kesalahan jaringan saat memproses aksi.");
    } finally {
      setActionLoading(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    const matchesSearch = 
      order.reference_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_phone.includes(searchQuery);
    return matchesStatus && matchesSearch;
  });

  const formatCurrency = (val: string | number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(Number(val));
  };

  return (
    <div className="w-full flex flex-col gap-4 pb-16" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-zinc-100 px-6 py-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-widest mb-1">
            <div className="w-4 h-0.5 bg-primary rounded-full" />
            Integrasi E-Catalog
          </div>
          <h1 className="text-xl font-bold text-[#030037] tracking-tight">Kelola Pesanan Masuk</h1>
          <p className="text-xs text-zinc-400 font-semibold mt-1">Konfirmasi pesanan WhatsApp secara digital, potong stok otomatis, dan catat laporan kas masuk.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Cari No. Referensi atau Nama Pelanggan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 text-black p-2.5 pl-9 rounded-xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 md:pb-0">
          {(["ALL", "PENDING", "SUCCESS", "CANCELLED"] as const).map((status) => {
            const label = status === "ALL" ? "Semua" : status === "PENDING" ? "Baru / Pending" : status === "SUCCESS" ? "Konfirmasi Lunas" : "Dibatalkan";
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all select-none border shrink-0 ${
                  isActive 
                    ? "bg-[#030037] border-[#030037] text-white shadow-md shadow-[#030037]/10" 
                    : "bg-white border-zinc-200 text-zinc-6500 hover:bg-zinc-50 hover:text-black"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 flex items-center justify-center shadow-sm">
          <SectionLoader text="Memuat pesanan..." />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-100 p-12 text-center shadow-sm flex flex-col items-center justify-center gap-3">
          <div className="p-3 bg-zinc-50 rounded-2xl text-zinc-300">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <h3 className="text-sm font-bold text-[#030037]">Tidak Ada Pesanan Ditemukan</h3>
          <p className="text-xs text-zinc-400 font-semibold max-w-xs leading-relaxed">Belum ada pesanan dari E-Catalog yang masuk dengan pencarian atau filter status ini.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrders[order.id];
            const isPending = order.status === "PENDING";
            const isSuccess = order.status === "SUCCESS";
            const isCancelled = order.status === "CANCELLED";
            const isWorking = !!actionLoading[order.id];

            return (
              <div 
                key={order.id} 
                className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm relative overflow-hidden ${
                  isExpanded ? "ring-1 ring-primary/20 border-primary/20" : "border-zinc-100 hover:shadow-md"
                }`}
              >
                {/* Status Indicator Stripe */}
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                  isPending ? "bg-amber-500" : isSuccess ? "bg-emerald-500" : "bg-zinc-300"
                }`} />

                {/* Primary Card View */}
                <div className="p-5 pl-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                    {/* Order Reference */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-900 tracking-wider font-mono bg-zinc-100 px-2.5 py-0.5 rounded-lg border border-zinc-200">
                          {order.reference_number}
                        </span>
                        {order.branches && (
                          <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100 uppercase">
                            {order.branches.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-semibold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs font-bold text-[#030037] truncate">{order.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <a 
                          href={`https://wa.me/${order.customer_phone.startsWith("0") ? "62" + order.customer_phone.slice(1) : order.customer_phone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                        >
                          {order.customer_phone}
                          <ExternalLink className="w-3 h-3 text-emerald-500" />
                        </a>
                      </div>
                    </div>

                    {/* Payment & Price */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs font-bold text-zinc-900">{order.payment_method}</span>
                      </div>
                      <div className="text-sm font-black text-[#030037]">
                        {formatCurrency(order.total_price)}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        isPending 
                          ? "bg-amber-50 text-amber-600 border border-amber-100" 
                          : isSuccess 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-zinc-50 text-zinc-400 border border-zinc-200"
                      }`}>
                        {isPending ? "Pending" : isSuccess ? "Lunas" : "Dibatalkan"}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Expand Toggle */}
                  <div className="flex items-center gap-3 border-t lg:border-t-0 pt-4 lg:pt-0 border-zinc-100">
                    {isPending && (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => triggerUpdateStatus(order.id, order.reference_number, "SUCCESS")}
                          disabled={isWorking}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Konfirmasi Lunas
                        </button>
                        <button
                          onClick={() => triggerUpdateStatus(order.id, order.reference_number, "CANCELLED")}
                          disabled={isWorking}
                          className="flex-1 sm:flex-none px-4 py-2 bg-zinc-105 hover:bg-zinc-200 text-zinc-700 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50 border border-zinc-200"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Batalkan
                        </button>
                      </div>
                    )}

                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="p-2 hover:bg-zinc-50 rounded-xl border border-zinc-200 text-zinc-400 hover:text-black transition-all shrink-0"
                      title="Lihat Detail Barang"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detail Panel */}
                {isExpanded && (
                  <div className="px-5 pb-5 pl-6 border-t border-zinc-100 bg-zinc-50/40 animate-in fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 pt-4">
                      {/* Products List (8 columns) */}
                      <div className="md:col-span-7 space-y-3">
                        <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5" /> Daftar Barang Pesanan
                        </h5>
                        <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-zinc-550/10 border-b border-zinc-200 text-[8px] font-bold text-zinc-400 uppercase tracking-widest">
                                <th className="p-3 pl-4">Produk</th>
                                <th className="p-3 text-center">Jumlah</th>
                                <th className="p-3 text-right">Harga</th>
                                <th className="p-3 text-right pr-4">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="text-xs divide-y divide-zinc-100">
                              {order.order_items.map((item) => {
                                const productName = item.products?.name || "Produk Tidak Dikeahui";
                                const priceNum = Number(item.price);
                                const subtotal = item.quantity * priceNum;
                                return (
                                  <tr key={item.id} className="hover:bg-zinc-50/50 text-black font-bold">
                                    <td className="p-3 pl-4 font-bold text-zinc-900">{productName}</td>
                                    <td className="p-3 text-center text-zinc-500">{item.quantity}</td>
                                    <td className="p-3 text-right text-zinc-500">{formatCurrency(priceNum)}</td>
                                    <td className="p-3 text-right pr-4 text-zinc-900">{formatCurrency(subtotal)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Delivery/Shipping details (5 columns) */}
                      <div className="md:col-span-5 space-y-3">
                        <h5 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" /> Informasi Alamat
                        </h5>
                        <div className="bg-white border border-zinc-200 rounded-2xl p-4 space-y-3 shadow-sm text-xs">
                          {order.customer_address ? (
                            <div className="flex gap-2.5">
                              <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Alamat Pengiriman</span>
                                <p className="text-black font-bold leading-relaxed">{order.customer_address}</p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2.5 text-zinc-400 items-center py-2">
                              <AlertCircle className="w-4 h-4" />
                              <span className="italic font-semibold">Tidak memerlukan alamat pengiriman (Ambil Sendiri / Toko Offline).</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-zinc-200 p-6 shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col items-center text-center gap-4">
            
            {confirmModal.newStatus === "SUCCESS" ? (
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8" />
              </div>
            )}

            <div className="space-y-2">
              <h3 className="text-base font-bold text-[#030037] leading-tight">
                {confirmModal.newStatus === "SUCCESS" ? "Konfirmasi Pembayaran Lunas" : "Batalkan Pesanan"}
              </h3>
              <p className="text-xs text-zinc-900 font-bold px-2 leading-relaxed">
                {confirmModal.message}
              </p>
            </div>

            <div className="flex gap-3 w-full pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-all border border-zinc-200"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`flex-1 py-3 text-white text-xs font-bold rounded-xl transition-all shadow-md ${
                  confirmModal.newStatus === "SUCCESS" 
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10" 
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/10"
                }`}
              >
                {confirmModal.newStatus === "SUCCESS" ? "Ya, Konfirmasi Lunas" : "Ya, Batalkan"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
