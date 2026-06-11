"use client";

import React from "react";
import Image from "next/image";
import {
  X,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  ShieldCheck,
} from "lucide-react";
import {
  VirtualProduct,
  CartItem,
  Branch,
  formatCurrency,
} from "./types";

export interface ProductModalProps {
  vp: VirtualProduct;
  branches: Branch[];
  cart: CartItem[];
  onClose: () => void;
  onAddToCart: (vp: VirtualProduct) => void;
  onUpdateQuantity: (virtualId: string, delta: number) => void;
  onOpenCart: () => void;
}

export default function ProductModal({
  vp,
  branches,
  cart,
  onClose,
  onAddToCart,
  onUpdateQuantity,
  onOpenCart,
}: ProductModalProps) {
  const mp = vp.originalProduct;
  const mStock = vp.stock;
  const isOutOfStock = mStock <= 0;
  const cartItem = cart.find((ci) => ci.virtualProduct.virtualId === vp.virtualId);
  const isPusat =
    vp.branchName.toLowerCase().includes("utama") ||
    vp.branchName.toLowerCase().includes("pusat");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />

      <div
        className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200 z-10 border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Image */}
        <div className="w-full md:w-5/12 bg-slate-800/30 relative shrink-0 min-h-[220px] md:min-h-0 border-b md:border-b-0 md:border-r border-white/5">
          {mp.image_url ? (
            <Image
              src={mp.image_url}
              alt={mp.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
              <Package className="w-16 h-16 mb-2" />
              <span className="text-xs font-bold uppercase tracking-widest">No Image</span>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
            {isOutOfStock ? (
              <span className="bg-rose-500/90 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg">
                Habis
              </span>
            ) : mp.product_categories ? (
              <span className="bg-slate-900/70 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/10">
                {mp.product_categories.name}
              </span>
            ) : null}

            {branches.length > 0 && (
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg text-white ${
                  isPusat ? "bg-indigo-600/80" : "bg-blue-600/80"
                }`}
              >
                {isPusat ? "Pusat" : vp.branchName}
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto">
          <div className="mb-5">
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 pr-8">
              {mp.name}
            </h2>
            {mp.description && (
              <p className="text-sm text-slate-400 leading-relaxed">{mp.description}</p>
            )}
          </div>

          {/* Price */}
          <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-4 mb-5">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
              Harga Jual
            </p>
            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">
              {formatCurrency(Number(mp.sell_price))}
            </p>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Ketersediaan
              </p>
              <p className={`text-sm font-black ${isOutOfStock ? "text-rose-400" : "text-white"}`}>
                {isOutOfStock ? "Kosong" : `${mStock} Tersedia`}
              </p>
            </div>
            {mp.product_categories && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                  Kategori
                </p>
                <p className="text-sm font-black text-white line-clamp-1">
                  {mp.product_categories.name}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mt-auto pt-4">
            {isOutOfStock ? (
              <button
                disabled
                className="w-full py-3.5 rounded-xl bg-white/5 text-slate-500 text-sm font-bold uppercase tracking-widest cursor-not-allowed border border-white/5"
              >
                Stok Sedang Kosong
              </button>
            ) : cartItem ? (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-1.5 flex-1 h-[52px]">
                  <button
                    onClick={() => onUpdateQuantity(vp.virtualId, -1)}
                    className="w-10 h-full flex items-center justify-center text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-blue-300 text-lg px-2">{cartItem.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(vp.virtualId, 1)}
                    className="w-10 h-full flex items-center justify-center text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={onOpenCart}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 h-[52px] transition-all"
                >
                  <ShoppingCart className="w-4 h-4" /> Keranjang
                </button>
              </div>
            ) : (
              <button
                onClick={() => { onAddToCart(vp); onClose(); }}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5" /> Tambah ke Keranjang
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
