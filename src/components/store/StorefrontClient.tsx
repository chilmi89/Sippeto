"use client";

import React, { useState, useMemo, useEffect, ComponentType } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import {
  Search,
  Package,
  ShoppingCart,
  Plus,
  Minus,
  Check,
  Store,
} from "lucide-react";
import type { Profile, Product, Branch, VirtualProduct, CartItem } from "./types";
import { formatCurrency } from "./types";
import type { CartDrawerProps } from "./CartDrawer";
import type { ProductModalProps } from "./ProductModal";

// ─── Lazy-loaded heavy panels via next/dynamic (lebih kompatibel dengan TS) ──
const CartDrawer: ComponentType<CartDrawerProps> = dynamic(() => import("./CartDrawer"), { ssr: false });
const ProductModal: ComponentType<ProductModalProps> = dynamic(() => import("./ProductModal"), { ssr: false });


// ─── Types ────────────────────────────────────────────────────────────────────

interface StorefrontClientProps {
  profile: Profile;
  products: Product[];
  branches: Branch[];
}

// ─── Main Client Component ────────────────────────────────────────────────────

export default function StorefrontClient({
  profile,
  products,
  branches,
}: StorefrontClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBranchId] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedVP, setSelectedVP] = useState<VirtualProduct | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Scroll listener — mengontrol navbar sticky background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore cart dari localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${profile.id}`);
    if (!savedCart) return;
    try {
      const parsed = JSON.parse(savedCart);
      const migrated = parsed.map((item: any) => {
        if (item.product && !item.virtualProduct) {
          return {
            virtualProduct: {
              virtualId: `${item.product.id}_pusat`,
              originalProduct: item.product,
              branchId: "pusat",
              branchName: "Pusat",
              displayName: `${item.product.name} (Pusat)`,
              stock:
                item.product.product_stocks?.reduce(
                  (sum: number, s: any) => sum + s.stock,
                  0
                ) ?? 99,
              phone_number: profile.phone_number,
            },
            quantity: item.quantity,
          };
        }
        return item;
      });
      setCart(migrated);
    } catch (e) {
      console.error("Failed to parse cart", e);
    }
  }, [profile.id, profile.phone_number]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem(`cart_${profile.id}`, JSON.stringify(newCart));
  };

  // ─── Computed data (hanya sekali karena data server statis) ─────────────────

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.product_categories?.name) set.add(p.product_categories.name);
    });
    return Array.from(set);
  }, [products]);

  const pusatBranch = useMemo(() => {
    if (!branches.length) return null;
    return (
      branches.find(
        (b) =>
          b.name.toLowerCase().includes("utama") ||
          b.name.toLowerCase().includes("pusat")
      ) || branches[0]
    );
  }, [branches]);

  const virtualProducts = useMemo(() => {
    const list: VirtualProduct[] = [];
    products.forEach((p) => {
      const activeStocks = p.product_stocks || [];
      if (selectedBranchId === "all") {
        let renderedAny = false;
        activeStocks.forEach((ps) => {
          const branch = branches.find((b) => b.id === ps.branch_id);
          if (branch && ps.stock > 0) {
            const isPusat =
              branch.name.toLowerCase().includes("utama") ||
              branch.name.toLowerCase().includes("pusat");
            list.push({
              virtualId: `${p.id}_${branch.id}`,
              originalProduct: p,
              branchId: branch.id,
              branchName: branch.name,
              displayName: `${p.name} (${isPusat ? "Pusat" : branch.name})`,
              stock: ps.stock,
              phone_number: branch.phone_number,
            });
            renderedAny = true;
          }
        });
        if (!renderedAny) {
          const defaultBranch = pusatBranch || branches[0];
          list.push({
            virtualId: `${p.id}_${defaultBranch?.id ?? "pusat"}`,
            originalProduct: p,
            branchId: defaultBranch?.id ?? "pusat",
            branchName: defaultBranch?.name ?? "Pusat",
            displayName: `${p.name} (Pusat)`,
            stock: 0,
            phone_number: defaultBranch?.phone_number ?? null,
          });
        }
      } else {
        const branch = branches.find((b) => b.id === selectedBranchId);
        if (branch) {
          const ps = activeStocks.find((s) => s.branch_id === selectedBranchId);
          const isPusat =
            branch.name.toLowerCase().includes("utama") ||
            branch.name.toLowerCase().includes("pusat");
          list.push({
            virtualId: `${p.id}_${branch.id}`,
            originalProduct: p,
            branchId: branch.id,
            branchName: branch.name,
            displayName: `${p.name} (${isPusat ? "Pusat" : branch.name})`,
            stock: ps ? ps.stock : 0,
            phone_number: branch.phone_number,
          });
        }
      }
    });
    return list;
  }, [products, branches, selectedBranchId, pusatBranch]);

  const filteredProducts = useMemo(() => {
    return virtualProducts.filter((vp) => {
      const p = vp.originalProduct;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        vp.displayName.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "all" ||
        p.product_categories?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [virtualProducts, searchQuery, selectedCategory]);

  // ─── Cart actions ────────────────────────────────────────────────────────────

  const addToCart = (vp: VirtualProduct) => {
    const existing = cart.find(
      (item) => item.virtualProduct.virtualId === vp.virtualId
    );
    if (existing) {
      if (existing.quantity >= vp.stock) {
        alert("Tidak bisa menambah lebih dari stok yang tersedia");
        return;
      }
      saveCart(
        cart.map((item) =>
          item.virtualProduct.virtualId === vp.virtualId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      if (vp.stock <= 0) {
        alert("Stok produk ini sedang kosong");
        return;
      }
      saveCart([...cart, { virtualProduct: vp, quantity: 1 }]);
    }
  };

  const updateQuantity = (virtualId: string, delta: number) => {
    const existing = cart.find(
      (item) => item.virtualProduct.virtualId === virtualId
    );
    if (!existing) return;
    const newQty = existing.quantity + delta;
    if (newQty <= 0) {
      saveCart(cart.filter((item) => item.virtualProduct.virtualId !== virtualId));
    } else {
      if (newQty > existing.virtualProduct.stock) {
        alert("Stok produk terbatas");
        return;
      }
      saveCart(
        cart.map((item) =>
          item.virtualProduct.virtualId === virtualId
            ? { ...item, quantity: newQty }
            : item
        )
      );
    }
  };

  const cartTotalItems = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );
  const cartTotalPrice = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.quantity * Number(item.virtualProduct.originalProduct.sell_price),
        0
      ),
    [cart]
  );

  const activeQrCodeUrl = useMemo(() => {
    const uniqueBranches = Array.from(
      new Set(cart.map((item) => item.virtualProduct.branchId))
    );
    if (uniqueBranches.length === 1 && uniqueBranches[0] !== "pusat") {
      const selectedBranch = branches.find((b) => b.id === uniqueBranches[0]);
      if (selectedBranch?.payment_qr)
        return { url: selectedBranch.payment_qr, source: `Cabang ${selectedBranch.name}` };
    } else if (selectedBranchId !== "all") {
      const selectedBranch = branches.find((b) => b.id === selectedBranchId);
      if (selectedBranch?.payment_qr)
        return { url: selectedBranch.payment_qr, source: `Cabang ${selectedBranch.name}` };
    }
    if (profile.payment_qr) return { url: profile.payment_qr, source: "Pusat / Owner" };
    return null;
  }, [cart, branches, selectedBranchId, profile]);

  // ─── Checkout handler ────────────────────────────────────────────────────────

  const handleCheckoutSuccess = () => {
    saveCart([]);
    setIsCartOpen(false);
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 5000);
  };

  const storeName = profile.business_name || profile.username || "Toko UMKM";

  return (
    <>
      {/* ── STICKY NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-slate-900/85 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-blue-950/20"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Store className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-sm text-white tracking-tight hidden sm:block">
                {storeName}
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200"
              aria-label="Buka keranjang belanja"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartTotalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30">
                  {cartTotalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-6 mt-4">
        {/* Search & Filter */}
        <div className="flex flex-col lg:flex-row gap-3 mb-5">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="search"
              placeholder="Cari produk favorit Anda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all"
            />
          </div>

          {/* Category tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
            {["all", ...categories].map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500/40 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {cat === "all" ? "Semua" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status bar */}
        <div className="mb-4 flex justify-between items-center px-1">
          <p className="text-sm text-slate-400 font-medium">
            Menampilkan{" "}
            <span className="font-bold text-white">{filteredProducts.length}</span>{" "}
            produk
          </p>
        </div>

        {/* Success Alert */}
        {isSuccess && (
          <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-emerald-300 font-bold text-sm">Pesanan Berhasil Dibuat!</h4>
              <p className="text-emerald-400/70 text-xs mt-0.5">
                Silakan selesaikan pesanan Anda di WhatsApp toko.
              </p>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white/5 rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
              <Search className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Produk Tidak Ditemukan</h3>
            <p className="text-slate-500 text-sm max-w-sm">
              Maaf, kami tidak dapat menemukan produk yang sesuai.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {filteredProducts.map((vp) => {
              const product = vp.originalProduct;
              const isOutOfStock = vp.stock <= 0;
              const cartItem = cart.find(
                (item) => item.virtualProduct.virtualId === vp.virtualId
              );
              const isPusat =
                vp.branchName.toLowerCase().includes("utama") ||
                vp.branchName.toLowerCase().includes("pusat");

              return (
                <div
                  key={vp.virtualId}
                  onClick={() => setSelectedVP(vp)}
                  className="group relative h-[260px] sm:h-[300px] rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-blue-500/15 hover:-translate-y-0.5 transition-all duration-300 border border-white/10"
                >
                  {/* Product Image */}
                  <div className="absolute inset-0 bg-slate-800">
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        loading="lazy"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="w-10 h-10 text-slate-700" />
                      </div>
                    )}
                  </div>

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Top tags */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex flex-col items-start gap-1.5 z-10 pointer-events-none">
                    {isOutOfStock ? (
                      <span className="bg-rose-500/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                        Habis
                      </span>
                    ) : product.product_categories ? (
                      <span className="bg-slate-900/70 text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-white/10">
                        {product.product_categories.name}
                      </span>
                    ) : null}

                    {branches.length > 0 && (
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md text-white ${
                          isPusat
                            ? "bg-indigo-600/80"
                            : "bg-blue-600/80"
                        }`}
                      >
                        {isPusat ? "Pusat" : vp.branchName}
                      </span>
                    )}
                  </div>

                  {/* Bottom content */}
                  <div className="absolute inset-x-0 bottom-0 p-3.5 z-20">
                    <h4 className="text-sm font-bold text-white mb-1 line-clamp-2 drop-shadow-md">
                      {product.name}
                    </h4>
                    <p className="text-sm font-black text-blue-400 drop-shadow-md mb-0 group-hover:mb-3 transition-all duration-300">
                      {formatCurrency(Number(product.sell_price))}
                    </p>

                    {/* Action button — visible on hover */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 opacity-0 group-hover:opacity-100"
                    >
                      <div className="overflow-hidden">
                        {isOutOfStock ? (
                          <button
                            disabled
                            className="w-full py-2 rounded-xl bg-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-white/5"
                          >
                            Stok Habis
                          </button>
                        ) : cartItem ? (
                          <div className="flex items-center justify-between bg-blue-500/20 border border-blue-500/40 rounded-xl p-1 h-9">
                            <button
                              onClick={() => updateQuantity(vp.virtualId, -1)}
                              className="w-7 h-full flex items-center justify-center text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-white text-sm w-8 text-center">
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(vp.virtualId, 1)}
                              className="w-7 h-full flex items-center justify-center text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(vp)}
                            className="w-full py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-1.5"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" /> Tambah
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-white/5 py-8 mt-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Store className="w-3 h-3 text-white" />
            </div>
            <span className="font-black text-sm text-white">SiPetto</span>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
            © 2026 SiPetto
          </p>
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">
            Ekosistem UMKM Digital Indonesia
          </p>
        </div>
      </footer>

      {/* ── FLOATING CART BUTTON ── */}
      {cartTotalItems > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 border border-blue-400/30"
          aria-label="Lihat keranjang"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2.5 -right-2.5 bg-rose-500 text-white text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-slate-950">
              {cartTotalItems}
            </span>
          </div>
        </button>
      )}

      {/* ── CART DRAWER (Lazy via next/dynamic) ── */}
      {isCartOpen && (
        <CartDrawer
          cart={cart}
          profile={profile}
          branches={branches}
          selectedBranchId={selectedBranchId}
          cartTotalItems={cartTotalItems}
          cartTotalPrice={cartTotalPrice}
          activeQrCodeUrl={activeQrCodeUrl}
          onClose={() => setIsCartOpen(false)}
          onUpdateQuantity={updateQuantity}
          onCheckoutSuccess={handleCheckoutSuccess}
        />
      )}

      {/* ── PRODUCT MODAL (Lazy via next/dynamic) ── */}
      {selectedVP && (
        <ProductModal
          vp={selectedVP}
          branches={branches}
          cart={cart}
          onClose={() => setSelectedVP(null)}
          onAddToCart={addToCart}
          onUpdateQuantity={updateQuantity}
          onOpenCart={() => { setSelectedVP(null); setIsCartOpen(true); }}
        />
      )}
    </>
  );
}