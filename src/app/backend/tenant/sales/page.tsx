"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  User,
  Phone,
  MapPin,
  CreditCard,
  Check,
  Printer,
  X,
  Package,
  Layers,
  Store,
  Calendar,
  ChevronDown,
  Edit2,
  AlertTriangle,
  Receipt
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import SectionLoader from "@/components/layout/SectionLoader";
import FullPageLoader from "@/components/layout/FullPageLoader";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Product {
  id: string;
  name: string;
  sell_price: number;
  base_price: number;
  image_url: string | null;
  category_id: string | null;
  product_categories?: {
    name: string;
  } | null;
  current_branch_stock?: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Category {
  id: string;
  name: string;
}

interface Branch {
  id: string;
  name: string;
}

interface PaymentMethod {
  id: string;
  name: string;
}

function POSKasirContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id"); // ID transaksi yang sedang diedit

  // User & Profile
  const [profileId, setProfileId] = useState<string | null>(null);
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [businessName, setBusinessName] = useState<string>("");

  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [txCategories, setTxCategories] = useState<any[]>([]);

  // Selection States
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  
  // Cart & Transaction Form States
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");

  // Loadings
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // UI Toggle — sembunyikan detail pembeli untuk transaksi walk-in cepat
  const [showCustomerDetail, setShowCustomerDetail] = useState(false);

  // Success Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  // Fetch Master Data & Init
  useEffect(() => {
    const initPOS = async () => {
      try {
        setIsLoading(true);
        // 1. Get Me
        const meRes = await fetch("/api/auth/me");
        if (!meRes.ok) throw new Error("Gagal mengambil data autentikasi");
        const meData = await meRes.json();
        
        const currentProfileId = meData.id;
        const tenantOwnerId = meData.tenant_owner_id || currentProfileId;
        setProfileId(tenantOwnerId);
        setBusinessName(meData.business_name || "SiPetto UMKM");
        setUserRole(meData.role || "");

        const branchId = meData.branch_id;
        setUserBranchId(branchId);

        // Fetch Branches
        const branchesRes = await fetch(`/api/backend/branches?tenant_id=${tenantOwnerId}`);
        let branchesList: Branch[] = [];
        if (branchesRes.ok) {
          const resJson = await branchesRes.json();
          branchesList = resJson.data || [];
          setBranches(branchesList);
        }

        let initialBranchId = "";
        if (branchId) {
          initialBranchId = branchId;
          setSelectedBranchId(branchId);
        } else if (branchesList.length > 0) {
          initialBranchId = branchesList[0].id;
          setSelectedBranchId(branchesList[0].id);
        }

        // Parallel Fetch
        const [catRes, payRes, txCatRes] = await Promise.all([
          fetch(`/api/backend/product-categories?profile_id=${tenantOwnerId}&limit=100`),
          fetch(`/api/backend/payment_kategori?profile_id=${tenantOwnerId}&limit=100`),
          fetch(`/api/backend/kategori?profile_id=${tenantOwnerId}&limit=100`)
        ]);

        let loadedPaymentMethods: PaymentMethod[] = [];
        if (catRes.ok) setCategories((await catRes.json()).data || []);
        if (payRes.ok) {
          const payData = (await payRes.json()).data || [];
          setPaymentMethods(payData);
          loadedPaymentMethods = payData;
          if (payData.length > 0) setPaymentMethodId(payData[0].id);
        }
        if (txCatRes.ok) {
          const txCatData = (await txCatRes.json()).data || [];
          setTxCategories(txCatData);
        }

        // ─── Mode Edit: Muat Data Transaksi Lama ke dalam Keranjang ───
        if (editId) {
          const txRes = await fetch(`/api/backend/transaction/group?id=${editId}`);
          if (txRes.ok) {
            const txJson = await txRes.json();
            const tx = txJson.data?.[0];
            if (tx) {
              // Isi form dari data transaksi lama
              setReference(tx.reference_number || "");
              setDate(tx.transaction_date?.split("T")[0] || new Date().toISOString().split("T")[0]);
              setDescription(tx.description || "");
              setCustomerName(tx.customer_name || "");
              if (tx.branch_id) setSelectedBranchId(tx.branch_id);

              // Cari metode bayar dari item pertama
              if (tx.transaction_items?.length > 0) {
                const firstItemPaymentId = tx.transaction_items[0].payment_method_id;
                if (firstItemPaymentId) setPaymentMethodId(firstItemPaymentId);
                else if (loadedPaymentMethods.length > 0) setPaymentMethodId(loadedPaymentMethods[0].id);
              }

              // Ambil produk cabang untuk mendapatkan detail produk
              const editBranchId = tx.branch_id || initialBranchId;
              if (editBranchId) {
                const prodRes = await fetch(`/api/backend/products?branch_id=${editBranchId}`);
                if (prodRes.ok) {
                  const prodJson = await prodRes.json();
                  const availableProducts: Product[] = prodJson.data || [];

                  // Rebuild cart dari transaction_items lama
                  const rebuiltCart: CartItem[] = [];
                  for (const item of tx.transaction_items) {
                    if (item.product_id) {
                      const found = availableProducts.find((p: Product) => p.id === item.product_id);
                      if (found) {
                        rebuiltCart.push({ product: found, quantity: item.quantity || 1 });
                      }
                    }
                  }
                  setCart(rebuiltCart);
                  setProducts(availableProducts);
                }
              }
            }
          } else {
            toast.error("Gagal memuat data transaksi yang akan diedit");
          }
        } else {
          // Init Form Values untuk transaksi baru
          const now = new Date();
          setDate(now.toISOString().split("T")[0]);
          setReference(`POS-${now.getTime().toString().slice(-6)}`);
        }

      } catch (err) {
        console.error("POS INIT ERROR:", err);
        toast.error("Gagal memuat konfigurasi POS");
      } finally {
        setIsLoading(false);
      }
    };

    initPOS();
  }, [editId]);

  // Fetch Products based on selected branch
  const fetchProducts = useCallback(async () => {
    if (!selectedBranchId) return;
    try {
      const res = await fetch(`/api/backend/products?branch_id=${selectedBranchId}`);
      if (res.ok) {
        const json = await res.json();
        setProducts(json.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedBranchId]);

  useEffect(() => {
    fetchProducts();
  }, [selectedBranchId, fetchProducts]);

  // Cart operations
  const addToCart = (product: Product) => {
    const stockLimit = product.current_branch_stock ?? 0;
    const existing = cart.find(item => item.product.id === product.id);

    if (existing) {
      if (existing.quantity >= stockLimit) {
        toast.warning(`Stok produk tidak mencukupi (Maksimal: ${stockLimit} pcs)`);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
      ));
    } else {
      if (stockLimit <= 0) {
        toast.warning("Stok produk habis!");
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    const stockLimit = item.product.current_branch_stock ?? 0;

    if (newQty <= 0) {
      removeFromCart(productId);
    } else if (newQty > stockLimit) {
      toast.warning(`Stok produk terbatas pada ${stockLimit} pcs`);
    } else {
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
    }
  };

  const handleQtyInput = (productId: string, val: string) => {
    const num = parseInt(val);
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const stockLimit = item.product.current_branch_stock ?? 0;

    if (isNaN(num) || num <= 0) {
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: 1 } : i));
    } else if (num > stockLimit) {
      toast.warning(`Stok produk terbatas pada ${stockLimit} pcs`);
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: stockLimit } : i));
    } else {
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: num } : i));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // Calculations
  const cartSubtotal = cart.reduce((sum, item) => sum + (item.product.sell_price * item.quantity), 0);

  // Submit Transaction (POST for new, PATCH for edit)
  const handleSubmitTransaction = async () => {
    if (!profileId) return toast.error("Sesi berakhir, silakan login kembali");
    if (cart.length === 0) return toast.warning("Keranjang belanja masih kosong");
    if (!paymentMethodId) return toast.warning("Mohon pilih metode pembayaran");

    try {
      setIsSubmitting(true);
      
      // Find category named "Penjualan Produk" or any income category
      const targetCat = txCategories.find(c => c.type === "pemasukan" && c.name.toLowerCase().includes("penjualan")) 
                        || txCategories.find(c => c.type === "pemasukan") 
                        || { id: null };

      // Map cart items into transaction items format
      const itemsPayload = cart.map(item => ({
        name: `${item.product.name} (x${item.quantity})`,
        amount: item.product.sell_price * item.quantity,
        category_id: targetCat.id,
        payment_method_id: paymentMethodId,
        type: "INCOME",
        product_id: item.product.id,
        quantity: item.quantity
      }));

      const isEditMode = !!editId;

      const payload = {
        ...(isEditMode && { id: editId }),
        profile_id: profileId,
        branch_id: selectedBranchId,
        reference_number: reference,
        transaction_date: date,
        description: description || "Transaksi POS Kasir",
        customer_name: customerName || "Pembeli Umum",
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        order_status: 6,
        items: itemsPayload
      };

      const res = await fetch("/api/backend/transaction/group", {
        method: isEditMode ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const txGroup = await res.json();

        if (isEditMode) {
          // Mode edit: kembali ke riwayat setelah berhasil disimpan
          toast.success("Transaksi berhasil diperbarui dan stok telah disesuaikan!");
          router.push("/backend/tenant/sales/history");
        } else {
          // Mode baru: tampilkan modal struk
          setLastTransaction({
            ...txGroup,
            items: cart,
            customer_name: customerName || "Pembeli Umum",
            payment_method: paymentMethods.find(pm => pm.id === paymentMethodId)?.name || "Tunai"
          });
          toast.success("Transaksi kasir berhasil disimpan!");
          
          // Reset states
          setCart([]);
          setCustomerName("");
          setCustomerPhone("");
          setCustomerAddress("");
          setDescription("");
          
          // Refresh products stock locally
          fetchProducts();

          // Generate new reference number
          const now = new Date();
          setReference(`POS-${now.getTime().toString().slice(-6)}`);
          
          // Show Receipt Modal
          setShowReceiptModal(true);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal memproses transaksi");
      }

    } catch (e) {
      toast.error("Kesalahan jaringan saat memproses transaksi");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate Receipt PDF
  const handlePrintReceipt = () => {
    if (!lastTransaction) return;

    const doc = new jsPDF({
      unit: "mm",
      format: [80, 150] // POS thermal roll paper size (80mm width)
    });

    const activeBranchName = branches.find(b => b.id === selectedBranchId)?.name || "Cabang Utama";

    // Typography setup
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    
    // Header
    doc.text(businessName.toUpperCase(), 40, 10, { align: "center" });
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(activeBranchName, 40, 14, { align: "center" });
    doc.text("---------------------------------", 40, 18, { align: "center" });
    
    // Meta
    doc.text(`Nota : #${lastTransaction.reference_number}`, 5, 23);
    doc.text(`Tgl  : ${new Date(lastTransaction.transaction_date).toLocaleDateString()}`, 5, 27);
    doc.text(`Cust : ${lastTransaction.customer_name}`, 5, 31);
    doc.text(`Bayar: ${lastTransaction.payment_method}`, 5, 35);
    doc.text("---------------------------------", 40, 40, { align: "center" });
    
    // Products table list
    let yPos = 45;
    lastTransaction.items.forEach((item: CartItem) => {
      // Split name if too long for thermal paper
      const name = item.product.name.slice(0, 18);
      const qtyText = `${item.quantity} x ${formatCurrency(item.product.sell_price).replace("Rp", "").trim()}`;
      const subtotalText = formatCurrency(item.product.sell_price * item.quantity).replace("Rp", "").trim();

      doc.setFont("courier", "bold");
      doc.text(name, 5, yPos);
      doc.setFont("courier", "normal");
      doc.text(qtyText, 5, yPos + 4);
      doc.text(subtotalText, 75, yPos + 4, { align: "right" });
      yPos += 9;
    });

    doc.text("---------------------------------", 40, yPos, { align: "center" });
    doc.setFont("courier", "bold");
    doc.text("TOTAL :", 5, yPos + 5);
    doc.text(formatCurrency(cartSubtotal).replace("Rp", "").trim(), 75, yPos + 5, { align: "right" });

    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    doc.text("Terima kasih atas kunjungan Anda!", 40, yPos + 14, { align: "center" });
    doc.text("SiPetto POS System", 40, yPos + 18, { align: "center" });

    // Output PDF to print/open
    const pdfBlobUrl = doc.output("bloburl");
    window.open(pdfBlobUrl);
  };

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

  // Filters
  const filteredProducts = products.filter((p) => {
const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategoryId === "all" || p.category_id === selectedCategoryId;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col pb-10" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
      {isSubmitting && <FullPageLoader />}

      <div className="max-w-[1600px] mx-auto w-full px-3 lg:px-4 py-3 space-y-3">
        
        {/* Header POS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/50 pb-2">
           <div>
              <div className="flex items-center gap-1.5">
                 <div className={`w-3 h-1 rounded-full ${editId ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                 <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">
                    {editId ? 'Mode Edit' : 'Point of Sale'}
                 </span>
              </div>
              <h1 className="text-lg font-black text-[#030037] tracking-tight mt-0.5">
                 {editId ? 'Edit' : 'Kasir'} & <span className="text-[#3c39d6]">{editId ? 'Koreksi Transaksi' : 'Penjualan'}</span>
              </h1>
           </div>

           {/* Header Right: Branch Selector + Riwayat */}
           <div className="flex items-center gap-2 shrink-0">
              {/* Riwayat Penjualan */}
              {!editId && (
                <button
                  onClick={() => router.push('/backend/tenant/sales/history')}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-zinc-200 text-zinc-600 hover:text-[#3c39d6] hover:border-indigo-200 rounded-xl shadow-sm text-[9px] font-black uppercase tracking-widest transition-all"
                >
                  <Receipt className="w-3 h-3" />
                  Riwayat
                </button>
              )}

              {/* Branch Lock/Selector */}
              <div className="flex items-center gap-2.5 bg-white border border-zinc-200 p-2 rounded-xl shadow-sm max-w-[240px]">
                 <Store className="w-3.5 h-3.5 text-[#3c39d6]" />
                 <div className="flex-1 min-w-0">
                    <span className="block text-[7px] font-black text-zinc-400 uppercase tracking-wider leading-none mb-0.5">Cabang Aktif</span>
                    <select
                      disabled={!!userBranchId}
                      className="w-full bg-transparent border-0 p-0 text-[11px] font-bold text-zinc-800 focus:ring-0 outline-none cursor-pointer appearance-none disabled:bg-transparent"
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                    >
                      {branches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} {userBranchId === b.id ? "(Anda)" : ""}
                        </option>
                      ))}
                    </select>
                 </div>
                 {!userBranchId && <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />}
              </div>
           </div>
        </div>

         {/* Edit Mode Banner */}
         {editId && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 p-2.5 rounded-xl shadow-sm">
              <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                <Edit2 className="w-3 h-3 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[8px] font-black uppercase tracking-widest text-amber-600 leading-none">Mode Koreksi Aktif</p>
                <p className="text-xs font-bold text-amber-750 truncate mt-0.5">
                  Mengedit nota <span className="font-black">#{reference}</span>. Simpan perubahan untuk update.
                </p>
              </div>
              <button
                onClick={() => router.push('/backend/tenant/sales/history')}
                title="Batal Edit"
                className="p-1.5 bg-amber-100 border border-amber-200 text-amber-700 hover:bg-amber-200 rounded-lg transition-all shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
         )}

         {/* Layout Grid */}
         <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            
            {/* LEFT COLUMN: Products Catalogue (8 Columns) */}
            <div className="xl:col-span-8 space-y-3">
               
               {/* Product Filtering Bar */}
               <div className="bg-white border border-zinc-200 p-2 rounded-xl flex flex-col sm:flex-row gap-2 items-center shadow-sm">
                  <div className="relative w-full sm:flex-1">
                     <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                     <input 
                       type="text" 
                       placeholder="Cari nama produk..." 
                       className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-3 py-2 rounded-lg text-xs font-bold focus:outline-none focus:border-[#3c39d6] focus:bg-white transition-all text-zinc-800"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>
                  
                  <div className="flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-3 py-2 rounded-lg w-full sm:w-auto shrink-0">
                     <Layers className="w-3.5 h-3.5 text-zinc-400" />
                     <select 
                       value={selectedCategoryId}
                       onChange={(e) => setSelectedCategoryId(e.target.value)}
                       className="bg-transparent border-0 text-zinc-700 text-xs font-bold focus:ring-0 outline-none cursor-pointer w-full sm:w-32 py-0"
                     >
                       <option value="all">Semua Kategori</option>
                       {categories.map((c) => (
                         <option key={c.id} value={c.id}>{c.name}</option>
                       ))}
                     </select>
                  </div>
               </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
                 {filteredProducts.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white border border-zinc-200 rounded-2xl shadow-sm flex flex-col items-center gap-2">
                       <div className="p-3 bg-zinc-50 rounded-full text-zinc-300">
                          <Package className="w-10 h-10" />
                       </div>
                       <h3 className="text-xs font-bold text-[#030037]">Produk Tidak Ditemukan</h3>
                       <p className="text-[11px] text-zinc-500 max-w-xs px-4">Pastikan cabang aktif memiliki persediaan stok untuk dicari.</p>
                    </div>
                 ) : (
                    filteredProducts.map((p) => {
                       const stock = p.current_branch_stock ?? 0;
                       const isOutOfStock = stock <= 0;

                       return (
                          <div 
                             key={p.id} 
                             onClick={() => !isOutOfStock && addToCart(p)}
                             className={`bg-white border rounded-xl p-2.5 flex flex-col justify-between hover:shadow-md transition-all duration-200 group select-none shadow-sm ${
                               isOutOfStock 
                                 ? 'opacity-60 border-zinc-250 cursor-not-allowed' 
                                 : 'border-zinc-200 hover:border-emerald-400/60 cursor-pointer active:scale-[0.98]'
                             }`}
                          >
                             <div className="space-y-1.5">
                                {/* Product Image */}
                                {p.image_url ? (
                                   <img 
                                      src={p.image_url} 
                                      alt={p.name} 
                                      className="w-full h-20 object-cover rounded-lg border border-zinc-100"
                                   />
                                ) : (
                                   <div className="w-full h-20 bg-[#f8f9fa] rounded-lg border border-zinc-150/60 flex items-center justify-center text-zinc-350">
                                      <Package className="w-6 h-6" />
                                   </div>
                                )}

                                {/* Info */}
                                <div className="space-y-0.5">
                                   <span className="text-[8px] font-black text-zinc-400 uppercase tracking-tight block">
                                      {p.product_categories?.name || "Kategori Umum"}
                                   </span>
                                   <h4 className="text-[11px] font-black text-[#030037] leading-tight line-clamp-2 min-h-[28px] group-hover:text-[#3c39d6] transition-colors">
                                      {p.name}
                                   </h4>
                                </div>
                             </div>

                             <div className="pt-1.5 border-t border-zinc-100 mt-1.5 flex items-end justify-between">
                                <div className="flex flex-col">
                                   <span className={`text-[8px] font-bold py-0.5 px-1.5 rounded-full border leading-none self-start ${
                                     isOutOfStock 
                                       ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                       : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                   }`}>
                                      {isOutOfStock ? 'Habis' : `Stok: ${stock}`}
                                   </span>
                                   <span className="text-[11px] font-black text-emerald-600 font-mono mt-0.5">
                                      {formatCurrency(p.sell_price)}
                                   </span>
                                </div>

                                <button 
                                   disabled={isOutOfStock}
                                   className={`p-1 rounded-md border flex items-center justify-center transition-all ${
                                     isOutOfStock 
                                       ? 'bg-zinc-50 border-zinc-200 text-zinc-300' 
                                       : 'bg-emerald-50 border-emerald-250 hover:bg-[#10b981] hover:text-white hover:border-[#10b981] text-emerald-600 active:scale-90'
                                   }`}
                                >
                                   <Plus className="w-3 h-3" />
                                </button>
                             </div>
                          </div>
                       );
                    })
                 )}
              </div>
           </div>

           {/* RIGHT COLUMN: Shopping Cart & Checkout Form (4 Columns) */}
           <div className="xl:col-span-4 space-y-3">
              
              {/* Cart Container Card */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-3.5 shadow-md space-y-3">
                 
                 {/* Cart Header */}
                 <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <h3 className="text-xs font-black text-[#030037] uppercase tracking-widest flex items-center gap-1.5">
                       <ShoppingCart className="w-3.5 h-3.5 text-[#3c39d6]" /> Keranjang Belanja
                    </h3>
                    <span className="text-[9px] font-black bg-[#3c39d6]/10 text-[#3c39d6] px-2 py-0.5 rounded-full">
                       {cart.length} item
                    </span>
                 </div>

                 {/* Cart Items List */}
                 <div className="space-y-2 max-h-[calc(100vh-440px)] overflow-y-auto pr-1 min-h-[90px] scrollbar-thin">
                    {cart.length === 0 ? (
                       <div className="py-8 text-center flex flex-col items-center justify-center text-zinc-300">
                          <ShoppingCart className="w-8 h-8 mb-1.5 opacity-40" />
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Keranjang masih kosong</p>
                       </div>
                    ) : (
                       cart.map((item) => (
                          <div key={item.product.id} className="flex items-center justify-between gap-2 p-1.5 bg-zinc-50 rounded-lg border border-zinc-150 shadow-sm hover:bg-zinc-100/60 transition-all">
                             
                             {/* Item Mini Info */}
                             <div className="flex-1 min-w-0">
                                <h5 className="text-[11px] font-black text-[#030037] truncate leading-tight">
                                   {item.product.name}
                                </h5>
                                <span className="text-[9px] font-black text-emerald-600 font-mono">
                                   {formatCurrency(item.product.sell_price * item.quantity)}
                                </span>
                             </div>

                             {/* Qty Controls */}
                             <div className="flex items-center gap-1 bg-white border border-zinc-200 px-1.5 py-0.5 rounded-md">
                                <button 
                                   onClick={() => updateQuantity(item.product.id, -1)}
                                   className="p-0.5 text-zinc-400 hover:text-[#3c39d6] transition-colors"
                                >
                                   <Minus className="w-2.5 h-2.5" />
                                </button>
                                <input 
                                  type="text" 
                                  className="w-6 border-none bg-transparent text-center text-[11px] font-bold text-zinc-850 focus:ring-0 p-0"
                                  value={item.quantity}
                                  onChange={(e) => handleQtyInput(item.product.id, e.target.value)}
                                />
                                <button 
                                   onClick={() => updateQuantity(item.product.id, 1)}
                                   className="p-0.5 text-zinc-400 hover:text-[#3c39d6] transition-colors"
                                >
                                   <Plus className="w-2.5 h-2.5" />
                                </button>
                             </div>

                             {/* Delete */}
                             <button 
                                onClick={() => removeFromCart(item.product.id)}
                                className="p-1 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 rounded-md transition-all"
                             >
                                <Trash2 className="w-3 h-3" />
                             </button>
                          </div>
                       ))
                    )}
                 </div>

                 {/* Checkout & Customer Details Form */}
                 <div className="border-t border-zinc-100 pt-3 space-y-2.5">
                    
                    {/* Row 1: Nota & Tanggal */}
                    <div className="grid grid-cols-2 gap-2">
                       <div className="space-y-0.5">
                          <label className="text-[7.5px] font-black text-zinc-400 uppercase tracking-widest block pl-0.5">No. Nota</label>
                          <input 
                             type="text"
                             className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-black outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-emerald-500/10 transition-all"
                             value={reference}
                             onChange={(e) => setReference(e.target.value)}
                          />
                       </div>
                       <div className="space-y-0.5">
                          <label className="text-[7.5px] font-black text-zinc-400 uppercase tracking-widest block pl-0.5">Tanggal</label>
                          <input 
                             type="date"
                             className="w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-black outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-emerald-500/10 transition-all"
                             value={date}
                             onChange={(e) => setDate(e.target.value)}
                          />
                       </div>
                    </div>

                    {/* Row 2: Metode Pembayaran & Nama Pelanggan */}
                    <div className="grid grid-cols-2 gap-2">
                       <div className="space-y-0.5">
                          <label className="text-[7.5px] font-black text-zinc-400 uppercase tracking-widest block pl-0.5">Metode Bayar</label>
                          <div className="relative flex items-center">
                             <CreditCard className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                             <select
                               className="w-full pl-7 pr-6 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-800 outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-emerald-500/10 cursor-pointer appearance-none transition-all"
                               value={paymentMethodId}
                               onChange={(e) => setPaymentMethodId(e.target.value)}
                             >
                               {paymentMethods.map(pm => (
                                 <option key={pm.id} value={pm.id}>{pm.name}</option>
                               ))}
                             </select>
                             <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-2.5 text-zinc-400 pointer-events-none" />
                          </div>
                       </div>

                       <div className="space-y-0.5">
                          <label className="text-[7.5px] font-black text-zinc-400 uppercase tracking-widest block pl-0.5">Pelanggan</label>
                          <div className="relative flex items-center">
                             <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                             <input 
                               type="text" 
                               placeholder="Nama Pelanggan" 
                               className="w-full pl-7 pr-2 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold outline-none focus:bg-white focus:border-[#10b981] focus:ring-2 focus:ring-emerald-500/10 text-zinc-800 transition-all placeholder:text-[10px]"
                               value={customerName}
                               onChange={(e) => setCustomerName(e.target.value)}
                             />
                          </div>
                       </div>
                    </div>

                    {/* Total Summary */}
                    <div className="bg-gradient-to-br from-[#030037] to-[#120f4c] text-white p-3 rounded-xl flex justify-between items-center shadow-sm border border-white/5">
                       <div>
                          <span className="text-[7.5px] font-bold text-white/50 uppercase tracking-widest block">Total Belanja</span>
                          <span className="text-[9.5px] font-bold text-white/45">
                             {cart.length} produk
                          </span>
                       </div>
                       <span className="text-lg font-black font-mono text-emerald-400">
                          {formatCurrency(cartSubtotal)}
                       </span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                       <button 
                          onClick={() => {
                            if (editId) {
                              router.push('/backend/tenant/sales/history');
                            } else if (cart.length > 0 && confirm("Kosongkan keranjang?")) {
                              setCart([]);
                            }
                          }}
                          className="px-3.5 py-2.5 bg-zinc-100 hover:bg-zinc-250 text-zinc-500 hover:text-zinc-700 transition-colors font-bold text-xs rounded-lg border border-zinc-200"
                       >
                          {editId ? "Batal Edit" : "Reset"}
                       </button>
                       <button
                          onClick={handleSubmitTransaction}
                          disabled={cart.length === 0}
                          className={`flex-1 py-2.5 text-white transition-all font-black text-xs uppercase tracking-widest rounded-lg shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 ${
                            editId 
                              ? "bg-amber-500 hover:bg-amber-600" 
                              : "bg-[#10b981] hover:bg-[#059669] shadow-emerald-500/10"
                          }`}
                       >
                          {editId ? <Edit2 className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                          {editId ? "Simpan Perubahan" : "Bayar & Selesaikan"}
                       </button>
                    </div>
                 </div>

              </div>
           </div>

        </div>

      </div>

      {/* Success Modal Receipt */}
      {showReceiptModal && lastTransaction && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-zinc-150">
              <div className="p-6 text-center space-y-4">
                 <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
                    <Check className="w-6 h-6" />
                 </div>
                 <div>
                    <h4 className="text-base font-black text-[#030037]">Transaksi Berhasil!</h4>
                    <p className="text-[10px] text-zinc-400 mt-1">Nota pembayaran berhasil dicatat ke database keuangan.</p>
                 </div>

                 {/* Receipt Card Details preview */}
                 <div className="bg-[#f8f9fa] border border-zinc-200/80 p-4 rounded-2xl text-left text-xs font-bold text-zinc-700 space-y-2">
                    <div className="flex justify-between">
                       <span className="text-zinc-400">Nomor Nota:</span>
                       <span className="text-[#030037]">#{lastTransaction.reference_number}</span>
                    </div>
                    <div className="flex justify-between">
                       <span className="text-zinc-400">Nama Pembeli:</span>
                       <span>{lastTransaction.customer_name}</span>
                    </div>
                    <div className="flex justify-between border-t border-zinc-200/50 pt-2 mt-2 font-black text-sm">
                       <span className="text-zinc-900">Total:</span>
                       <span className="text-emerald-600">{formatCurrency(cartSubtotal)}</span>
                    </div>
                 </div>

                 <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                       <button 
                          onClick={() => { setShowReceiptModal(false); router.push('/backend/tenant/sales/history'); }}
                          className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                       >
                          Lihat Riwayat
                       </button>
                       <button 
                          onClick={handlePrintReceipt}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#3c39d6] hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors"
                       >
                          <Printer className="w-3.5 h-3.5" /> Cetak Nota
                       </button>
                    </div>
                    <button
                       onClick={() => setShowReceiptModal(false)}
                       className="w-full py-2 text-zinc-400 hover:text-zinc-600 text-[10px] font-bold tracking-widest transition-colors"
                    >
                       + Transaksi Baru
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

export default function POSKasirPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>}>
      <POSKasirContent />
    </Suspense>
  );
}
