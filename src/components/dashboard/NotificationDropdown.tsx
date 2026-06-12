"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { Bell, ShoppingBag, AlertTriangle, RefreshCw, X, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingOrder {
  id: string;
  reference_number: string;
  customer_name: string;
  total_price: number;
  created_at: string;
}

interface LowStockProduct {
  id: string;
  product_name: string;
  branch_name: string;
  stock: number;
  min_stock: number;
}

interface NotificationData {
  totalCount: number;
  pendingOrdersCount: number;
  lowStockCount: number;
  pendingOrders: PendingOrder[];
  lowStockProducts: LowStockProduct[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  return `${Math.floor(hrs / 24)} hari lalu`;
};

// ─── Component ────────────────────────────────────────────────────────────────

export const NotificationDropdown = () => {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState<NotificationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "stocks">("orders");
  // Jumlah notifikasi yang sudah "dilihat" oleh user
  const [seenCount, setSeenCount] = useState<number>(0);

  // Fetch notifikasi dari API
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/backend/tenant/notifications");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Gagal fetch notifikasi:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch saat mount dan setiap 60 detik (polling)
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalCount = data?.totalCount ?? 0;
  // Badge hanya tampil jika ada notifikasi baru yang belum dilihat
  const unreadCount = Math.max(0, totalCount - seenCount);
  const hasUnread = unreadCount > 0;

  // Handler buka/tutup dropdown — saat buka, tandai semua sudah terbaca
  const handleToggle = () => {
    setIsOpen((prev) => {
      const willOpen = !prev;
      if (willOpen) {
        // Tandai semua notifikasi saat ini sebagai sudah dilihat
        setSeenCount(totalCount);
      }
      return willOpen;
    });
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="relative p-2 bg-zinc-50 rounded-full hover:bg-zinc-100 transition-colors"
        suppressHydrationWarning
        aria-label="Notifikasi"
      >
        <Bell className={`w-5 h-5 ${isOpen ? "text-indigo-600" : "text-zinc-500"} transition-colors`} />
        {hasUnread && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center leading-none animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <div
        className={`absolute right-0 top-[calc(100%+12px)] w-[360px] bg-white border border-zinc-100 rounded-2xl shadow-2xl shadow-zinc-200/80 overflow-hidden transition-all duration-200 origin-top-right z-[9999]
          ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-800 tracking-tight">Notifikasi</h3>
            <p className="text-[10px] text-zinc-400 font-semibold mt-0.5 uppercase tracking-widest">
              {totalCount > 0 ? `${totalCount} perlu tindakan` : "Semua beres!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              disabled={isLoading}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-100">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all ${
              activeTab === "orders"
                ? "text-indigo-600 border-b-2 border-indigo-500 bg-indigo-50/40"
                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            Pesanan
            {(data?.pendingOrdersCount ?? 0) > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                {data?.pendingOrdersCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("stocks")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all ${
              activeTab === "stocks"
                ? "text-amber-600 border-b-2 border-amber-500 bg-amber-50/40"
                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Stok Menipis
            {(data?.lowStockCount ?? 0) > 0 && (
              <span className="min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center leading-none">
                {data?.lowStockCount}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[340px] overflow-y-auto overscroll-contain">
          {isLoading && !data ? (
            // Skeleton Loading
            <div className="p-4 flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-xl bg-zinc-100 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="h-3 bg-zinc-100 rounded w-3/4" />
                    <div className="h-2.5 bg-zinc-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : activeTab === "orders" ? (
            // TAB: Pesanan Pending
            (data?.pendingOrders?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-zinc-500">Tidak ada pesanan menunggu</p>
                <p className="text-xs text-zinc-400">Semua pesanan sudah diproses.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {data?.pendingOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/backend/tenant/orders");
                    }}
                    className="w-full flex items-start gap-3 px-5 py-4 hover:bg-indigo-50/40 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                      <ShoppingBag className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-zinc-800 truncate">{order.customer_name}</p>
                        <span className="text-[10px] font-semibold text-zinc-400 shrink-0">{timeAgo(order.created_at)}</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">#{order.reference_number}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs font-black text-indigo-600">{formatCurrency(order.total_price)}</span>
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                          PENDING
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            )
          ) : (
            // TAB: Stok Menipis
            (data?.lowStockProducts?.length ?? 0) === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center px-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-zinc-500">Stok aman</p>
                <p className="text-xs text-zinc-400">Tidak ada produk dengan stok menipis.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {data?.lowStockProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => {
                      setIsOpen(false);
                      router.push("/backend/tenant/stocks");
                    }}
                    className="w-full flex items-start gap-3 px-5 py-4 hover:bg-amber-50/40 transition-colors text-left group"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      product.stock <= 0 ? "bg-rose-100" : "bg-amber-100"
                    }`}>
                      <AlertTriangle className={`w-4 h-4 ${product.stock <= 0 ? "text-rose-600" : "text-amber-600"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-800 truncate">{product.product_name}</p>
                      <p className="text-[10px] text-zinc-400 font-semibold mt-0.5">{product.branch_name}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className={`text-xs font-black ${product.stock <= 0 ? "text-rose-600" : "text-amber-600"}`}>
                          Stok: {product.stock} / Min: {product.min_stock}
                        </span>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                          product.stock <= 0
                            ? "text-rose-600 bg-rose-50"
                            : "text-amber-600 bg-amber-50"
                        }`}>
                          {product.stock <= 0 ? "HABIS" : "MENIPIS"}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-amber-400 shrink-0 mt-1 transition-colors" />
                  </button>
                ))}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        {totalCount > 0 && (
          <div className="border-t border-zinc-100 px-5 py-3 bg-zinc-50/60">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(activeTab === "orders" ? "/backend/tenant/orders" : "/backend/tenant/stocks");
              }}
              className="w-full text-center text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors py-1"
            >
              Lihat Semua →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
