"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  ShoppingCart,
  X,
  Plus,
  Minus,
  Package,
  MessageSquareShare,
} from "lucide-react";
import {
  CartItem,
  Profile,
  Branch,
  formatCurrency,
} from "./types";

export interface CartDrawerProps {
  cart: CartItem[];
  profile: Profile;
  branches: Branch[];
  selectedBranchId: string;
  cartTotalItems: number;
  cartTotalPrice: number;
  activeQrCodeUrl: { url: string; source: string } | null;
  onClose: () => void;
  onUpdateQuantity: (virtualId: string, delta: number) => void;
  onCheckoutSuccess: () => void;
}

export default function CartDrawer({
  cart,
  profile,
  branches,
  selectedBranchId,
  cartTotalItems,
  cartTotalPrice,
  activeQrCodeUrl,
  onClose,
  onUpdateQuantity,
  onCheckoutSuccess,
}: CartDrawerProps) {
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutPayment, setCheckoutPayment] = useState("COD");

  const isAddressRequired = !(profile.metadata?.hide_checkout_address);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutName || !checkoutPhone || (isAddressRequired && !checkoutAddress)) {
      alert("Harap lengkapi semua data formulir pengiriman");
      return;
    }

    let targetPhone = profile.phone_number || "";
    let branchName = "";
    const uniqueBranches = Array.from(
      new Set(cart.map((item) => item.virtualProduct.branchId))
    );
    if (uniqueBranches.length === 1 && uniqueBranches[0] !== "pusat") {
      const selectedBranch = branches.find((b) => b.id === uniqueBranches[0]);
      if (selectedBranch) {
        branchName = selectedBranch.name;
        if (selectedBranch.phone_number) targetPhone = selectedBranch.phone_number;
      }
    } else if (selectedBranchId !== "all") {
      const selectedBranch = branches.find((b) => b.id === selectedBranchId);
      if (selectedBranch) {
        branchName = selectedBranch.name;
        if (selectedBranch.phone_number) targetPhone = selectedBranch.phone_number;
      }
    }

    // Bersihkan karakter non-angka (spasi, strip, tanda tambah, kurung, dll.)
    targetPhone = targetPhone.replace(/\D/g, "");
    if (targetPhone.startsWith("0")) {
      targetPhone = "62" + targetPhone.slice(1);
    }

    if (!targetPhone) {
      alert("Nomor WhatsApp untuk pemesanan tidak ditemukan. Harap hubungi toko.");
      return;
    }

    let orderRef = `ORD-${Date.now().toString().slice(-6)}`;
    try {
      const checkoutItems = cart.map((item) => ({
        product_id: item.virtualProduct.originalProduct.id,
        quantity: item.quantity,
        price: Number(item.virtualProduct.originalProduct.sell_price),
      }));

      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id: profile.id,
          branch_id:
            selectedBranchId !== "all"
              ? selectedBranchId
              : (cart[0]?.virtualProduct.branchId || null),
          customer_name: checkoutName,
          customer_phone: checkoutPhone,
          customer_address: isAddressRequired ? checkoutAddress : null,
          payment_method: checkoutPayment,
          total_price: cartTotalPrice,
          items: checkoutItems,
        }),
      });

      const resData = await response.json();
      if (response.ok && resData.order) orderRef = resData.order.reference_number;
    } catch (err) {
      console.error("Gagal mencatat checkout:", err);
    }

    const storeTitle = profile.business_name || profile.username;
    const branchGreeting = branchName ? ` (Cabang ${branchName})` : "";

    let message = `*Halo ${storeTitle}${branchGreeting}! Saya ingin memesan produk berikut:*\n`;
    message += `👉 *Nomor Referensi Pesanan:* ${orderRef}\n\n`;
    message += `───────────────────────\n`;
    cart.forEach((item) => {
      const vp = item.virtualProduct;
      const subtotal = item.quantity * Number(vp.originalProduct.sell_price);
      message += `🛍️ *${vp.displayName}*\n`;
      message += `   ${item.quantity} x ${formatCurrency(Number(vp.originalProduct.sell_price))} = *${formatCurrency(subtotal)}*\n\n`;
    });
    message += `───────────────────────\n`;
    message += `💵 *Total Belanja:* ${formatCurrency(cartTotalPrice)}\n\n`;
    message += `*📋 DATA PENGIRIMAN:*\n`;
    message += `👤 *Nama Penerima:* ${checkoutName}\n`;
    message += `📞 *No. WhatsApp:* ${checkoutPhone}\n`;
    if (isAddressRequired) message += `📍 *Alamat Lengkap:* ${checkoutAddress}\n`;
    if (branchName) message += `📍 *Cabang Pengiriman:* ${branchName}\n`;
    message += `💳 *Metode Pembayaran:* ${checkoutPayment}\n\n`;
    message += `_Pesanan dibuat via E-Catalog SiPetto_`;

    window.open(
      `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`,
      "_blank"
    );

    onCheckoutSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="relative w-full max-w-md h-full bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Keranjang Belanja</h3>
              <p className="text-xs text-slate-400 font-medium">{cartTotalItems} produk dipilih</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Cart Items */}
          <div className="flex flex-col gap-3 mb-8">
            {cart.map((item) => {
              const product = item.virtualProduct.originalProduct;
              const subtotal = item.quantity * Number(product.sell_price);
              const virtualId = item.virtualProduct.virtualId;
              return (
                <div
                  key={virtualId}
                  className="flex gap-3 p-3 bg-white/5 border border-white/10 rounded-2xl hover:border-blue-500/20 transition-all"
                >
                  <div className="w-16 h-16 rounded-xl bg-slate-800/50 border border-white/5 overflow-hidden shrink-0 relative">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-slate-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between py-0.5">
                    <h4 className="text-sm font-bold text-white line-clamp-1">{product.name}</h4>
                    <p className="text-xs font-bold text-blue-400">
                      {formatCurrency(Number(product.sell_price))}
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 h-7">
                        <button
                          onClick={() => onUpdateQuantity(virtualId, -1)}
                          className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-white w-6 text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(virtualId, 1)}
                          className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-white">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
              <h4 className="text-sm font-black text-white uppercase tracking-wide">
                Data Pengiriman
              </h4>
            </div>

            <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="flex flex-col gap-4">
              {[
                { label: "Nama Lengkap", placeholder: "Budi Santoso", value: checkoutName, setter: setCheckoutName, type: "text" },
                { label: "No. WhatsApp", placeholder: "0812xxxxxx", value: checkoutPhone, setter: setCheckoutPhone, type: "tel" },
              ].map(({ label, placeholder, value, setter, type }) => (
                <div key={label}>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    {label} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={type}
                    required
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all"
                  />
                </div>
              ))}

              {isAddressRequired && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Alamat Lengkap <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Alamat rumah, RT/RW, Kelurahan..."
                    value={checkoutAddress}
                    onChange={(e) => setCheckoutAddress(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all resize-none"
                  />
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Metode Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["COD", "Transfer"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setCheckoutPayment(method)}
                      className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
                        checkoutPayment === method
                          ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                          : "bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/20 hover:text-white"
                      }`}
                    >
                      {method === "COD" ? "Di Tempat" : "Transfer"}
                    </button>
                  ))}
                </div>

                {checkoutPayment === "Transfer" && (
                  <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center text-center">
                    {activeQrCodeUrl ? (
                      <>
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 mb-3">
                          QR Pembayaran ({activeQrCodeUrl.source})
                        </span>
                        <div className="relative w-[140px] h-[140px] bg-white rounded-xl p-2 mb-2">
                          <Image
                            src={activeQrCodeUrl.url}
                            alt={`QR ${activeQrCodeUrl.source}`}
                            fill
                            className="object-contain p-2"
                            sizes="140px"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-[280px]">
                          Screenshot QR Code di atas untuk proses transfer/QRIS, lalu kirim bukti transfer via WhatsApp.
                        </p>
                        <a
                          href={activeQrCodeUrl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 text-[9px] font-bold text-blue-400 hover:text-blue-300 hover:underline uppercase tracking-wider"
                        >
                          Buka Ukuran Penuh
                        </a>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 mb-2">
                          QR Code Belum Tersedia
                        </span>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          Hubungi toko via WhatsApp untuk detail rekening.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Footer Summary */}
        <div className="p-5 bg-slate-900/80 border-t border-white/10 shrink-0">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Pembayaran
            </span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              {formatCurrency(cartTotalPrice)}
            </span>
          </div>
          <button
            type="submit"
            form="checkout-form"
            className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98]"
          >
            <MessageSquareShare className="w-5 h-5" /> Pesan via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
