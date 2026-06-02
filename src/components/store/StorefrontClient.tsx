"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  Package,
  MapPin,
  Phone,
  ShoppingCart,
  X,
  Plus,
  Minus,
  Check,
  Store,
  MessageSquareShare,
  Calendar,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Eye,
} from "lucide-react";

interface Product {
  id: string;
  profile_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: any;
  sell_price: any;
  image_url: string | null;
  is_active: boolean;
  product_categories: { name: string } | null;
  product_stocks: { stock: number; branch_id: string }[];
}

interface Profile {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  address: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  username: string | null;
  created_at: any;
  payment_qr?: string | null;
}

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone_number: string | null;
  payment_qr?: string | null;
}

interface VirtualProduct {
  virtualId: string;
  originalProduct: Product;
  branchId: string;
  branchName: string;
  displayName: string;
  stock: number;
  phone_number: string | null;
}

interface StorefrontClientProps {
  profile: Profile;
  products: Product[];
  branches: Branch[];
}

interface CartItem {
  virtualProduct: VirtualProduct;
  quantity: number;
}

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
  const [checkoutName, setCheckoutName] = useState("");
  const [checkoutPhone, setCheckoutPhone] = useState("");
  const [checkoutAddress, setCheckoutAddress] = useState("");
  const [checkoutPayment, setCheckoutPayment] = useState("COD");
  const [isSuccess, setIsSuccess] = useState(false);
  const [selectedVP, setSelectedVP] = useState<VirtualProduct | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem(`cart_${profile.id}`);
    if (savedCart) {
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
    }
  }, [profile.id, profile.phone_number]);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem(`cart_${profile.id}`, JSON.stringify(newCart));
  };

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.product_categories?.name) set.add(p.product_categories.name);
    });
    return Array.from(set);
  }, [products]);

  const pusatBranch = useMemo(() => {
    if (!branches || branches.length === 0) return null;
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
            virtualId: `${p.id}_${defaultBranch ? defaultBranch.id : "pusat"}`,
            originalProduct: p,
            branchId: defaultBranch ? defaultBranch.id : "pusat",
            branchName: defaultBranch ? defaultBranch.name : "Pusat",
            displayName: `${p.name} (Pusat)`,
            stock: 0,
            phone_number: defaultBranch ? defaultBranch.phone_number : null,
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
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description &&
          p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        vp.displayName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" ||
        (p.product_categories &&
          p.product_categories.name === selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [virtualProducts, searchQuery, selectedCategory]);

  const featuredProducts = useMemo(() => {
    return filteredProducts.filter((vp) => vp.stock > 0).slice(0, 6);
  }, [filteredProducts]);

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
      saveCart(
        cart.filter((item) => item.virtualProduct.virtualId !== virtualId)
      );
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
        (sum, item) =>
          sum + item.quantity * Number(item.virtualProduct.originalProduct.sell_price),
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
      if (selectedBranch && selectedBranch.payment_qr) {
        return {
          url: selectedBranch.payment_qr,
          source: `Cabang ${selectedBranch.name}`
        };
      }
    } else if (selectedBranchId !== "all") {
      const selectedBranch = branches.find((b) => b.id === selectedBranchId);
      if (selectedBranch && selectedBranch.payment_qr) {
        return {
          url: selectedBranch.payment_qr,
          source: `Cabang ${selectedBranch.name}`
        };
      }
    }

    if (profile.payment_qr) {
      return {
        url: profile.payment_qr,
        source: "Pusat / Owner"
      };
    }

    return null;
  }, [cart, branches, selectedBranchId, profile]);
  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(v);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutName || !checkoutPhone || !checkoutAddress) {
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
        if (selectedBranch.phone_number)
          targetPhone = selectedBranch.phone_number;
      }
    } else if (selectedBranchId !== "all") {
      const selectedBranch = branches.find((b) => b.id === selectedBranchId);
      if (selectedBranch) {
        branchName = selectedBranch.name;
        if (selectedBranch.phone_number)
          targetPhone = selectedBranch.phone_number;
      }
    }
    if (targetPhone.startsWith("0")) targetPhone = "62" + targetPhone.slice(1);
    else if (targetPhone.startsWith("+")) targetPhone = targetPhone.slice(1);
    if (!targetPhone) {
      alert("Nomor WhatsApp untuk pemesanan tidak ditemukan. Harap hubungi toko.");
      return;
    }

    const storeTitle = profile.business_name || profile.username;
    const branchGreeting = branchName ? ` (Cabang ${branchName})` : "";

    let message = `*Halo ${storeTitle}${branchGreeting}! Saya ingin memesan produk berikut:*\n\n`;
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
    message += `📍 *Alamat Lengkap:* ${checkoutAddress}\n`;
    if (branchName) message += `📍 *Cabang Pengiriman:* ${branchName}\n`;
    message += `💳 *Metode Pembayaran:* ${checkoutPayment}\n\n`;
    message += `_Pesanan dibuat via E-Catalog SiPetto_`;

    window.open(
      `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodeURIComponent(message)}`,
      "_blank"
    );

    saveCart([]);
    setIsCartOpen(false);
    setCheckoutName("");
    setCheckoutPhone("");
    setCheckoutAddress("");
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 5000);
  };

  const storeName = profile.business_name || profile.username || "Toko UMKM";
  const joinYear = profile.created_at
    ? new Date(profile.created_at).getFullYear()
    : null;

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 pb-20 relative overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-indigo-600/8 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[80px]" />
      </div>

      {/* ── STICKY NAVBAR ── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-slate-900/80 backdrop-blur-xl border-b border-white/5 shadow-2xl shadow-blue-950/20"
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

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsCartOpen(true)}
                className="relative w-10 h-10 rounded-xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 hover:text-white hover:border-blue-500/30 transition-all duration-300"
              >
                <ShoppingCart className="w-4 h-4" />
                {cartTotalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 animate-bounce">
                    {cartTotalItems}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <header className="relative pt-20 sm:pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12">
        {/* Banner */}
        <div className="w-full h-[45vh] min-h-[250px] max-h-[450px] relative overflow-hidden rounded-3xl shadow-2xl border border-white/5">
          {profile.banner_url ? (
            <img
              src={profile.banner_url}
              alt="Banner Toko"
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500 rounded-full blur-[100px]" />
                <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-500 rounded-full blur-[120px]" />
              </div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA2MCAwIEwgMCAwIDAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBzdHJva2Utb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
            </div>
          )}
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 to-transparent" />
        </div>

        {/* Profile Info - Overlapping Banner */}
        <div className="relative z-10 -mt-16 sm:-mt-20 px-4 sm:px-8">
          <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
            {/* Avatar */}
            <div className="relative group mx-auto md:mx-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500" />
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-900 p-1.5 shadow-2xl">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Logo Toko"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                    <Store className="w-10 h-10 sm:w-12 sm:h-12 text-white/80" />
                  </div>
                )}
              </div>
              {/* Verified Badge */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center border-[3px] border-slate-950 shadow-lg">
                <ShieldCheck className="w-3 h-3 text-white" />
              </div>
            </div>

            {/* Store Info */}
            <div className="flex-1 text-center md:text-left pb-2">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-none">
                  {storeName}
                </h1>
                <span className="inline-flex items-center justify-center gap-1 bg-blue-500/10 backdrop-blur-md text-blue-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-blue-500/20 mx-auto md:mx-0">
                  <Sparkles className="w-3 h-3" /> Official Store
                </span>
              </div>

              {profile.bio ? (
                <p className="text-sm text-slate-400 font-medium max-w-2xl leading-relaxed mb-4 mx-auto md:mx-0">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-sm text-slate-500 font-medium mb-4">
                  Selamat datang di toko kami. Temukan produk terbaik untuk Anda.
                </p>
              )}

              {/* Meta Chips */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                {profile.address && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-md text-slate-300 text-xs font-medium rounded-full border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-300">
                    <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span className="line-clamp-1 max-w-[200px]">
                      {profile.address}
                    </span>
                  </div>
                )}
                {profile.phone_number && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-md text-slate-300 text-xs font-medium rounded-full border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-300">
                    <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>{profile.phone_number}</span>
                  </div>
                )}
                {joinYear && (
                  <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 backdrop-blur-md text-slate-300 text-xs font-medium rounded-full border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all duration-300">
                    <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                    <span>Bergabung {joinYear}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex gap-3 mb-2">
              <div className="flex flex-col items-center justify-center px-5 py-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                <span className="text-2xl font-black text-white">
                  {products.length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Produk
                </span>
              </div>
              <div className="flex flex-col items-center justify-center px-5 py-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                <span className="text-2xl font-black text-white">
                  {categories.length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Kategori
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 2xl:px-12 py-6">
        {/* Search & Filter */}
        <div className="flex flex-col lg:flex-row gap-4 mb-5">
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
              <Search className="h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Cari produk favorit Anda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-3.5 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 focus:bg-white/10 transition-all shadow-lg shadow-slate-950/20"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar shrink-0">
            {["all", ...categories].map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 px-5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 border backdrop-blur-md ${
                    isActive
                      ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-blue-500/50 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white hover:border-blue-500/30"
                  }`}
                >
                  {cat === "all" ? "Semua" : cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status */}
        <div className="mb-5 flex justify-between items-center px-1">
          <p className="text-sm text-slate-400 font-medium">
            Menampilkan{" "}
            <span className="font-bold text-white">
              {filteredProducts.length}
            </span>{" "}
            produk
          </p>
        </div>

        {/* Success Alert */}
        {isSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 backdrop-blur-xl border border-emerald-500/20 flex items-start gap-3 shadow-lg">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="text-emerald-300 font-bold text-sm">
                Pesanan Berhasil Dibuat!
              </h4>
              <p className="text-emerald-400/70 text-xs mt-0.5">
                Silakan selesaikan pesanan Anda di WhatsApp toko.
              </p>
            </div>
          </div>
        )}

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
              <Search className="w-10 h-10 text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">
              Produk Tidak Ditemukan
            </h3>
            <p className="text-slate-500 text-sm max-w-sm">
              Maaf, kami tidak dapat menemukan produk yang sesuai dengan
              pencarian atau kategori ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
            {filteredProducts.map((vp) => {
              const product = vp.originalProduct;
              const stock = vp.stock;
              const isOutOfStock = stock <= 0;
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
                  className="group relative h-[280px] sm:h-[320px] rounded-2xl overflow-hidden cursor-pointer hover:shadow-2xl hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-500 border border-white/10"
                >
                  {/* Background Image Area */}
                  <div className="absolute inset-0 bg-slate-800">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Package className="w-12 h-12 text-slate-700 group-hover:text-slate-600 transition-colors" />
                      </div>
                    )}
                  </div>

                  {/* Permanent Bottom Gradient for Readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-90" />

                  {/* Hover Backdrop (Dark transparent bg) */}
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-500" />

                  {/* Top Tags (Always Visible) */}
                  <div className="absolute top-3 left-3 right-3 flex flex-col items-start gap-1.5 z-10 pointer-events-none">
                    {isOutOfStock ? (
                      <span className="bg-rose-500/90 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-lg shadow-lg">
                        Habis
                      </span>
                    ) : product.product_categories ? (
                      <span className="bg-slate-900/70 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border border-white/10">
                        {product.product_categories.name}
                      </span>
                    ) : null}

                    {branches.length > 0 && (
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg shadow-lg text-white backdrop-blur-md ${
                          isPusat
                            ? "bg-indigo-600/80 border border-indigo-400/30"
                            : "bg-blue-600/80 border border-blue-400/30"
                        }`}
                      >
                        {isPusat ? "Pusat" : vp.branchName}
                      </span>
                    )}

                    {!isOutOfStock && (
                      <span className="bg-slate-900/70 backdrop-blur-md text-slate-300 text-[9px] font-bold px-2 py-1 rounded-lg border border-white/10 mt-1">
                        Stok: {stock}
                      </span>
                    )}
                  </div>

                  {/* Bottom Content Area */}
                  <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col justify-end z-20">
                    {/* Text that slides up slightly on hover */}
                    <div className="transform transition-transform duration-500 group-hover:-translate-y-1">
                      <h4 className="text-sm font-bold text-white mb-1 line-clamp-2 drop-shadow-md">
                        {product.name}
                      </h4>
                      <p className="text-base font-black text-blue-400 drop-shadow-md">
                        {formatCurrency(Number(product.sell_price))}
                      </p>
                    </div>

                    {/* Action Button (Fades in and expands on hover) */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 opacity-0 group-hover:opacity-100 mt-0 group-hover:mt-3"
                    >
                      <div className="overflow-hidden">
                        {isOutOfStock ? (
                          <button
                            disabled
                            className="w-full py-2.5 rounded-xl bg-white/5 text-slate-500 text-xs font-bold uppercase tracking-wider cursor-not-allowed border border-white/5"
                          >
                            Stok Habis
                          </button>
                        ) : cartItem ? (
                          <div className="flex items-center justify-between bg-blue-500/20 backdrop-blur-md border border-blue-500/40 rounded-xl p-1 h-[40px]">
                            <button
                              onClick={() => updateQuantity(vp.virtualId, -1)}
                              className="w-8 h-full flex items-center justify-center text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="font-black text-white text-sm w-8 text-center">
                              {cartItem.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(vp.virtualId, 1)}
                              className="w-8 h-full flex items-center justify-center text-blue-300 hover:bg-blue-500/30 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(vp)}
                            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
                          >
                            <ShoppingCart className="w-4 h-4" /> Tambah
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
      <footer className="relative z-10 border-t border-white/5 py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-white" />
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
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/30 flex items-center justify-center hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-300 border border-blue-400/30"
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -top-2.5 -right-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] sm:text-[11px] font-black min-w-[20px] h-[20px] sm:min-w-[24px] sm:h-[24px] px-1 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-lg">
              {cartTotalItems}
            </span>
          </div>
        </button>
      )}

      {/* ── CART DRAWER ── */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsCartOpen(false)}
          />

          <div className="relative w-full max-w-md h-full bg-slate-900/95 backdrop-blur-xl border-l border-white/10 shadow-2xl flex flex-col animate-in slide-in-from-right-8 duration-300 z-10">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 backdrop-blur-md border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    Keranjang Belanja
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {cartTotalItems} produk dipilih
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
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
                  const subtotal =
                    item.quantity * Number(product.sell_price);
                  const virtualId = item.virtualProduct.virtualId;
                  return (
                    <div
                      key={virtualId}
                      className="flex gap-4 p-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md hover:border-blue-500/20 transition-all"
                    >
                      <div className="w-16 h-16 rounded-xl bg-slate-800/50 border border-white/5 overflow-hidden shrink-0 flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-600" />
                        )}
                      </div>

                      <div className="flex-1 flex flex-col justify-between py-0.5">
                        <h4 className="text-sm font-bold text-white line-clamp-1">
                          {product.name}
                        </h4>
                        <p className="text-xs font-bold text-blue-400">
                          {formatCurrency(Number(product.sell_price))}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 h-7">
                            <button
                              onClick={() => updateQuantity(virtualId, -1)}
                              className="w-7 h-full flex items-center justify-center text-slate-400 hover:text-blue-400 transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-white w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(virtualId, 1)}
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
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-4 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full" />
                  <h4 className="text-sm font-black text-white uppercase tracking-wide">
                    Data Pengiriman
                  </h4>
                </div>

                <form
                  id="checkout-form"
                  onSubmit={handleCheckoutSubmit}
                  className="flex flex-col gap-4"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Nama Lengkap{" "}
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Budi Santoso"
                      value={checkoutName}
                      onChange={(e) => setCheckoutName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      No. WhatsApp{" "}
                      <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0812xxxxxx"
                      value={checkoutPhone}
                      onChange={(e) => setCheckoutPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Alamat Lengkap{" "}
                      <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      placeholder="Alamat rumah, RT/RW, Kelurahan..."
                      value={checkoutAddress}
                      onChange={(e) => setCheckoutAddress(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Metode Pembayaran
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {["COD", "Transfer"].map((method) => {
                        const isActive = checkoutPayment === method;
                        return (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setCheckoutPayment(method)}
                            className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all backdrop-blur-md ${
                              isActive
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                                : "bg-white/5 border-white/10 text-slate-400 hover:border-blue-500/20 hover:text-white"
                            }`}
                          >
                            {method === "COD" ? "Di Tempat" : "Transfer"}
                          </button>
                        );
                      })}
                    </div>
                    {checkoutPayment === "Transfer" && (
                      <div className="mt-3 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                        {activeQrCodeUrl ? (
                          <>
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 mb-3">
                              QR Pembayaran ({activeQrCodeUrl.source})
                            </span>
                            <div className="relative group/qr p-2 bg-white rounded-xl shadow-lg border border-white/15 max-w-[150px] aspect-square overflow-hidden mb-2 hover:scale-102 transition-all">
                              <img
                                src={activeQrCodeUrl.url}
                                alt={`QR Pembayaran ${activeQrCodeUrl.source}`}
                                className="w-full h-full object-contain"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-[280px]">
                              Silakan screenshot (SS) QR Code di atas untuk memproses pembayaran via transfer/QRIS, lalu kirim bukti transfer saat konsultasi via WhatsApp.
                            </p>
                            <a
                              href={activeQrCodeUrl.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 text-[9px] font-bold text-blue-400 hover:text-blue-300 hover:underline transition-all uppercase tracking-wider"
                            >
                              Buka Ukuran Penuh
                            </a>
                          </>
                        ) : (
                          <>
                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 mb-2">
                              QR Code Belum Tersedia
                            </span>
                            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                              Hubungi toko/cabang via WhatsApp untuk mendapatkan detail nomor rekening atau QR pembayaran transfer.
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
            <div className="p-5 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 shrink-0">
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
                className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
              >
                <MessageSquareShare className="w-5 h-5" /> Pesan via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT DETAIL MODAL ── */}
      {selectedVP &&
        (() => {
          const mp = selectedVP.originalProduct;
          const mStock = selectedVP.stock;
          const mOutOfStock = mStock <= 0;
          const mCartItem = cart.find(
            (ci) => ci.virtualProduct.virtualId === selectedVP.virtualId
          );
          const mIsPusat =
            selectedVP.branchName.toLowerCase().includes("utama") ||
            selectedVP.branchName.toLowerCase().includes("pusat");

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
              onClick={() => setSelectedVP(null)}
            >
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200" />

              <div
                className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-500/10 flex flex-col md:flex-row overflow-hidden animate-in zoom-in-95 duration-200 z-10 border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedVP(null)}
                  className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Image */}
                <div className="w-full md:w-5/12 bg-slate-800/30 relative shrink-0 min-h-[250px] md:min-h-0 border-b md:border-b-0 md:border-r border-white/5">
                  {mp.image_url ? (
                    <img
                      src={mp.image_url}
                      alt={mp.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                      <Package className="w-16 h-16 mb-2" />
                      <span className="text-xs font-bold uppercase tracking-widest">
                        No Image
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-1.5 items-start">
                    {mOutOfStock ? (
                      <span className="bg-rose-500/90 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg">
                        Habis
                      </span>
                    ) : mp.product_categories ? (
                      <span className="bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border border-white/10">
                        {mp.product_categories.name}
                      </span>
                    ) : null}

                    {branches.length > 0 && (
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg shadow-lg text-white backdrop-blur-md ${
                          mIsPusat
                            ? "bg-indigo-600/80 border border-indigo-400/30"
                            : "bg-blue-600/80 border border-blue-400/30"
                        }`}
                      >
                        {mIsPusat ? "Pusat" : selectedVP.branchName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col p-6 sm:p-8 overflow-y-auto">
                  <div className="mb-6">
                    <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mb-2 pr-6">
                      {mp.name}
                    </h2>
                    {mp.description && (
                      <p className="text-sm text-slate-400 leading-relaxed">
                        {mp.description}
                      </p>
                    )}
                  </div>

                  <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-2xl p-5 mb-6 backdrop-blur-md">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">
                      Harga Jual
                    </p>
                    <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">
                      {formatCurrency(Number(mp.sell_price))}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                        Ketersediaan
                      </p>
                      <p
                        className={`text-sm font-black ${
                          mOutOfStock ? "text-rose-400" : "text-white"
                        }`}
                      >
                        {mOutOfStock ? "Kosong" : `${mStock} Tersedia`}
                      </p>
                    </div>
                    {mp.product_categories && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
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
                    {mOutOfStock ? (
                      <button
                        disabled
                        className="w-full py-3.5 rounded-xl bg-white/5 text-slate-500 text-sm font-bold uppercase tracking-widest cursor-not-allowed border border-white/5"
                      >
                        Stok Sedang Kosong
                      </button>
                    ) : mCartItem ? (
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex items-center justify-between bg-blue-500/10 border border-blue-500/20 rounded-xl p-1.5 flex-1 h-[52px]">
                          <button
                            onClick={() =>
                              updateQuantity(selectedVP.virtualId, -1)
                            }
                            className="w-10 h-full flex items-center justify-center text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="font-black text-blue-300 text-lg px-2">
                            {mCartItem.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(selectedVP.virtualId, 1)
                            }
                            className="w-10 h-full flex items-center justify-center text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedVP(null);
                            setIsCartOpen(true);
                          }}
                          className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 h-[52px] transition-all"
                        >
                          <ShoppingCart className="w-4 h-4" /> Keranjang
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          addToCart(selectedVP);
                          setSelectedVP(null);
                        }}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98]"
                      >
                        <ShoppingCart className="w-5 h-5" /> Tambah ke
                        Keranjang
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}