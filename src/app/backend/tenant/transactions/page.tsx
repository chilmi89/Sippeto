"use client";

import React, { useState, useEffect, Suspense, useCallback } from "react";
import {
  Plus,
  Trash2,
  Save,
  Receipt,
  Wallet,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronLeft,
  ChevronDown,
  History,
  Info,
  Banknote,
  Edit2,
  ArrowRight,
  Store
} from "lucide-react";
import FullPageLoader from "@/components/layout/FullPageLoader";
import SectionLoader from "@/components/layout/SectionLoader";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";

// Data type for each financial record line
interface TransactionItem {
  id: string;
  name: string;
  amount: number;
  category_id: string;
  payment_method_id: string;
  type: "pemasukan" | "pengeluaran";
}

interface RecentTransaction {
    id: string;
    reference_number: string;
    transaction_date: string;
    total_income: number;
    total_expense: number;
    net_balance: number;
}

const DEFAULT_CATEGORIES = [
  { name: "Penjualan Produk", type: "pemasukan" },
  { name: "Jasa / Layanan", type: "pemasukan" },
  { name: "Lain-lain (Masuk)", type: "pemasukan" },
  { name: "Operasional Toko", type: "pengeluaran" },
  { name: "Gaji Karyawan", type: "pengeluaran" },
  { name: "Biaya Bahan Baku", type: "pengeluaran" },
  { name: "Lain-lain (Keluar)", type: "pengeluaran" },
];

const DEFAULT_PAYMENTS = [
  { name: "Tunai / Cash" },
  { name: "Transfer Bank" },
  { name: "E-Wallet (OVO/Dana)" },
];

const RecorderContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  // Profile & Meta
  const [profileId, setProfileId] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");
  const [description, setDescription] = useState("");
  
  // Customer & Status States
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [orderStatus, setOrderStatus] = useState<number>(6);
  
  // Branch States
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [userBranchId, setUserBranchId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("");
  
  // Master Data
  const [categories, setCategories] = useState<{id: string, name: string, type: string}[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{id: string, name: string}[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingMaster, setIsLoadingMaster] = useState(true);

  // Items state
  const [items, setItems] = useState<TransactionItem[]>([
    { id: Math.random().toString(), name: "", amount: 0, category_id: "", payment_method_id: "", type: "pemasukan" },
  ]);

  const fetchRecent = useCallback(async (profId: string, branchId?: string) => {
    try {
        const url = `/api/backend/transaction/group?profile_id=${profId}&limit=5` + (branchId ? `&branch_id=${branchId}` : "");
        const res = await fetch(url);
        if (res.ok) {
            const json = await res.json();
            setRecentTransactions(json.data);
        }
    } catch (e) {}
  }, []);

  const initDefaults = useCallback(async (profId: string) => {
    try {
        // Seed Categories
        const catCheck = await fetch(`/api/backend/kategori?profile_id=${profId}&limit=1`);
        const catJson = await catCheck.json();
        if (catJson.data.length === 0) {
            for (const cat of DEFAULT_CATEGORIES) {
                await fetch("/api/backend/kategori", {
                    method: "POST",
                    body: JSON.stringify({ ...cat, profile_id: profId })
                });
            }
        }

        // Seed Payment Methods
        const payCheck = await fetch(`/api/backend/payment_kategori?profile_id=${profId}&limit=1`);
        const payJson = await payCheck.json();
        if (payJson.data.length === 0) {
            for (const pay of DEFAULT_PAYMENTS) {
                await fetch("/api/backend/payment_kategori", {
                    method: "POST",
                    body: JSON.stringify({ ...pay, profile_id: profId })
                });
            }
        }

        // Refresh Master Data
        const [cRes, pRes] = await Promise.all([
            fetch(`/api/backend/kategori?profile_id=${profId}&limit=100`),
            fetch(`/api/backend/payment_kategori?profile_id=${profId}&limit=100`)
        ]);
        
        if (cRes.ok) setCategories((await cRes.json()).data);
        if (pRes.ok) setPaymentMethods((await pRes.json()).data);

    } catch (e) {
        console.error("Failed to seed defaults:", e);
    }
  }, []);

  useEffect(() => {
    const fetchMasterAndEditData = async () => {
      try {
        setIsLoadingMaster(true);
        // 1. Get Profile
        const profRes = await fetch("/api/backend/tenant-umkm");
        if (!profRes.ok) throw new Error("Gagal mengambil profil");
        const profData = await profRes.json();
        const currentProfileId = profData.profile.id;
        const tenantOwnerId = profData.profile.tenant_owner_id || currentProfileId;
        setProfileId(tenantOwnerId);
        
        const currentBranchId = profData.profile.branch_id;
        setUserBranchId(currentBranchId);
        setUserRole(profData.profile.roles?.name || "");

        // Fetch Branches
        const branchesRes = await fetch(`/api/backend/branches?tenant_id=${tenantOwnerId}`);
        let branchesList = [];
        if (branchesRes.ok) {
            const branchesJson = await branchesRes.json();
            branchesList = branchesJson.data || [];
            setBranches(branchesList);
        }

        let initialBranchId = "";
        if (currentBranchId) {
            initialBranchId = currentBranchId;
            setSelectedBranchId(currentBranchId);
        } else if (branchesList.length > 0) {
            initialBranchId = branchesList[0].id;
            setSelectedBranchId(branchesList[0].id);
        }
        
        // Fetch recent items (detached)
        fetchRecent(tenantOwnerId, initialBranchId);

        // 2. Load Master Data & Edit Mode in Parallel
        const [catData, payData, txData] = await Promise.all([
            fetch(`/api/backend/kategori?profile_id=${tenantOwnerId}&limit=100`).then(r => r.json()),
            fetch(`/api/backend/payment_kategori?profile_id=${tenantOwnerId}&limit=100`).then(r => r.json()),
            editId ? fetch(`/api/backend/transaction/group?id=${editId}`).then(r => r.json()) : Promise.resolve(null)
        ]);

        if (catData.data?.length === 0 || payData.data?.length === 0) {
            // Seed if either is empty
            initDefaults(tenantOwnerId);
        }
        
        if (catData.data?.length > 0) {
            setCategories(catData.data);
        }
        if (payData.data?.length > 0) {
            setPaymentMethods(payData.data);
        }

        // 3. If Edit Mode, Fetch Transaction Data
        if (txData && txData.data?.[0]) {
            const tx = txData.data[0];
            setDate(tx.transaction_date.split("T")[0]);
            setReference(tx.reference_number || "");
            setDescription(tx.description || "");
            setCustomerName(tx.customer_name || "");
            setCustomerPhone(tx.customer_phone || "");
            setCustomerAddress(tx.customer_address || "");
            setOrderStatus(tx.order_status !== null ? Number(tx.order_status) : 6);
            if (tx.branch_id) {
                setSelectedBranchId(tx.branch_id);
            }
            setItems(tx.transaction_items.map((it: any) => ({
                id: it.id,
                name: it.name,
                amount: Number(it.amount),
                category_id: it.category_id,
                payment_method_id: it.payment_method_id,
                type: it.type === "INCOME" ? "pemasukan" : "pengeluaran"
            })));
        } else if (!editId) {
            // Default setup for new transaction
            const now = new Date();
            setDate(now.toISOString().split("T")[0]);
            setReference(`TRX-${now.getTime().toString().slice(-6)}`);
            setItems([{ id: Math.random().toString(), name: "", amount: 0, category_id: "", payment_method_id: "", type: "pemasukan" }]);
            setDescription("");
            setCustomerName("");
            setCustomerPhone("");
            setCustomerAddress("");
            setOrderStatus(6);
        }

      } catch (err) {
        toast.error("Gagal sinkronisasi data API");
        console.error(err);
      } finally {
        setIsLoadingMaster(false);
      }
    };

    fetchMasterAndEditData();
  }, [editId, fetchRecent, initDefaults]);

  // Effect to load recent transactions when active branch changes
  useEffect(() => {
    if (profileId && selectedBranchId) {
      fetchRecent(profileId, selectedBranchId);
    }
  }, [profileId, selectedBranchId, fetchRecent]);

  // Totals calculation
  const totalIncome = items.filter(i => i.type === "pemasukan").reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = items.filter(i => i.type === "pengeluaran").reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalExpense;

  const addItem = (itemType: "pemasukan" | "pengeluaran") => {
    setItems([...items, { 
      id: Math.random().toString(), 
      name: "", 
      amount: 0, 
      category_id: "", 
      payment_method_id: paymentMethods[0]?.id || "", 
      type: itemType 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) setItems(items.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof TransactionItem, value: any) => {
    setItems(
      items.map((i) => (i.id === id ? { ...i, [field]: value } : i))
    );
  };

  const handleSave = async () => {
    if (!profileId) return toast.error("Sesi berakhir, silakan login kembali");
    if (items.some(i => !i.name || !i.category_id || i.amount <= 0)) {
       return toast.warning("Mohon lengkapi semua rincian item");
    }

    try {
      setIsSubmitting(true);
      const url = "/api/backend/transaction/group";
      const method = editId ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editId && { id: editId }),
          profile_id: profileId,
          branch_id: selectedBranchId || null,
          reference_number: reference,
          transaction_date: date,
          description,
          customer_name: customerName || null,
          customer_phone: customerPhone || null,
          customer_address: customerAddress || null,
          order_status: orderStatus,
          items: items.map(({ name, amount, category_id, payment_method_id, type }) => ({
            name,
            amount: Number(amount),
            category_id,
            payment_method_id,
            type
          }))
        })
      });

      if (res.ok) {
        toast.success(editId ? "Transaksi diperbarui!" : "Transaksi disimpan!");
        if (editId) {
            router.push("/backend/tenant/transactions/history");
        } else {
            // Reset
            fetchRecent(profileId, selectedBranchId);
            setReference(`TRX-${Date.now().toString().slice(-6)}`);
            setItems([{ id: Math.random().toString(), name: "", amount: 0, category_id: "", payment_method_id: paymentMethods[0]?.id || "", type: "pemasukan" }]);
            setDescription("");
            setCustomerName("");
            setCustomerPhone("");
            setCustomerAddress("");
            setOrderStatus(6);
        }
      } else {
        const err = await res.json();
        toast.error(err.error || "Gagal menyimpan");
      }
    } catch (err) {
      toast.error("Kesalahan jaringan");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
      if (!confirm("Hapus transaksi ini?")) return;
      try {
          const res = await fetch(`/api/backend/transaction/group?id=${id}`, { method: "DELETE" });
          if (res.ok) {
              toast.success("Hapus berhasil");
              if (profileId) fetchRecent(profileId, selectedBranchId);
              if (editId === id) router.push("/backend/tenant/transactions");
          }
      } catch (e) { toast.error("Gagal menghapus"); }
  };

  const formatIDR = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (isLoadingMaster) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center py-2 px-3 lg:py-4 lg:px-6" style={{ fontFamily: "var(--font-jakarta), sans-serif" }}>
      {(isLoadingMaster || isSubmitting) && <FullPageLoader />}
      
      <div className="w-full max-w-7xl space-y-4">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-1">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
               <div className="w-4 h-[2px] bg-primary rounded-full"></div>
               <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">
                  {editId ? 'Mode Perbaikan' : 'Catat Baru'}
               </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => router.back()}
                className="p-1 -ml-1.5 rounded-md hover:bg-zinc-50 text-zinc-400 hover:text-black transition-all outline-none"
              >
                <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
              </button>
              <h1 className="text-2xl lg:text-3xl font-black text-[#030037] tracking-tighter leading-tight">
                {editId ? 'Edit' : 'Catat'} Transaksi <span className="text-primary">Finansial</span>
              </h1>
            </div>
            <p className="text-[11px] lg:text-sm font-medium text-zinc-400 max-w-2xl leading-tight">
               Kelola rincian kas masuk dan keluar secara akurat dan tersinkronisasi.
            </p>
          </div>

          <div className="flex flex-row items-center gap-2">
             <div className="bg-[#f8f9fa] border border-zinc-200 px-3 py-2 rounded-xl flex items-center gap-2 shadow-sm">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Database Sync</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                   <span className="text-[8px] font-black uppercase tracking-tight whitespace-nowrap">
                      Online
                   </span>
                </div>
             </div>
             <button onClick={() => router.push("/backend/tenant/transactions/history")} className="flex items-center gap-2 px-4 py-2 bg-[#f8f9fa] border border-zinc-200 rounded-xl text-[10px] lg:text-[11px] font-bold text-zinc-900 shadow-sm hover:bg-zinc-100 transition-all group h-[34px]">
                <History className="w-3.5 h-3.5 text-primary group-hover:rotate-12 transition-transform" /> 
                <span className="text-xs">Pusat Riwayat</span>
             </button>
          </div>
        </div>

        {/* The Card Section */}
        <div className="bg-[#f8f9fa] border border-zinc-300/50 rounded-2xl p-3 lg:p-7 shadow-lg shadow-zinc-200/50 space-y-4 lg:space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4 border-b border-zinc-200/50 pb-4 lg:pb-6">
             <div className="space-y-1">
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Tanggal Entry</label>
                <div className="relative group">
                   <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                   <input 
                    type="date"
                    className="w-full pl-9 lg:pl-10 pr-4 py-2 lg:py-2.5 bg-white border border-zinc-200 rounded-xl text-[11px] lg:text-xs font-bold text-black focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
             </div>
             <div className="space-y-1">
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">No. Referensi / Nota</label>
                <div className="relative group">
                   <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-primary transition-colors" />
                   <input 
                    type="text"
                    placeholder="TRX-XXXXXX"
                    className="w-full pl-9 lg:pl-10 pr-4 py-2 lg:py-2.5 bg-white border border-zinc-200 rounded-xl text-[11px] lg:text-xs font-bold text-black focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
             </div>
             <div className="space-y-1">
                <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest pl-1">Cabang Operasional</label>
                <div className="relative group flex items-center">
                   <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 group-focus-within:text-primary transition-colors shrink-0" />
                   <select
                     disabled={!!userBranchId}
                     className="w-full pl-9 lg:pl-10 pr-8 py-2 lg:py-2.5 bg-white border border-zinc-200 rounded-xl text-[11px] lg:text-xs font-bold text-black focus:ring-4 focus:ring-primary/5 outline-none transition-all shadow-sm appearance-none cursor-pointer disabled:bg-zinc-100 disabled:text-zinc-500"
                     value={selectedBranchId}
                     onChange={(e) => setSelectedBranchId(e.target.value)}
                   >
                     {branches.length === 0 && <option value="">Tidak ada cabang</option>}
                     {branches.map((b) => (
                       <option key={b.id} value={b.id}>
                         {b.name} {userBranchId === b.id ? "(Cabang Anda)" : ""}
                       </option>
                     ))}
                   </select>
                   <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400 pointer-events-none" />
                </div>
             </div>
          </div>



          <div className="space-y-3 lg:space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex flex-col gap-0.5">
                 <h3 className="text-[10px] lg:text-[11px] font-black text-[#030037] uppercase tracking-widest flex items-center gap-2">
                   <Info className="w-3.5 h-3.5 text-primary" /> Rincian Transaksi
                 </h3>
               </div>
               <div className="flex gap-1.5 lg:gap-2">
                 <button onClick={() => addItem("pemasukan")} className="px-3 lg:px-4 py-1.5 lg:py-2 bg-emerald-600 text-white text-[8px] lg:text-[9px] font-bold uppercase rounded-lg hover:bg-emerald-700 transition-all flex items-center gap-1.5 lg:gap-2 shadow-sm active:scale-95">
                    <Plus className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> Pemasukan
                 </button>
                 <button onClick={() => addItem("pengeluaran")} className="px-3 lg:px-4 py-1.5 lg:py-2 bg-rose-600 text-white text-[8px] lg:text-[9px] font-bold uppercase rounded-lg hover:bg-rose-700 transition-all flex items-center gap-1.5 lg:gap-2 shadow-sm active:scale-95">
                    <Plus className="w-3 h-3 lg:w-3.5 lg:h-3.5" /> Pengeluaran
                 </button>
               </div>
            </div>

            <div className="hidden lg:grid grid-cols-12 gap-3 px-5 text-[8px] font-bold text-zinc-400 uppercase tracking-widest mb-1 border-b border-zinc-100 pb-2">
               <div className="col-span-1 text-center font-black">Tipe</div>
               <div className="col-span-3">Item / Keterangan</div>
               <div className="col-span-2">Kategori</div>
               <div className="col-span-2">Metode</div>
               <div className="col-span-3 text-right pr-6">Nominal (Rp)</div>
               <div className="col-span-1"></div>
            </div>

            <div className="space-y-2.5">
              {items.map((item) => (
                <div key={item.id} className="relative bg-white border border-zinc-200 p-3 lg:p-3.5 rounded-xl transition-all hover:bg-zinc-50 hover:border-zinc-300 group shadow-sm">
                  
                  <div className="grid grid-cols-1 lg:grid-cols-12 items-center gap-3">
                    
                    <div className="flex items-center justify-between lg:col-span-1 lg:justify-center">
                      <div className={`flex items-center justify-center w-7 h-7 lg:w-8 lg:h-8 rounded-lg shrink-0 ${item.type === 'pemasukan' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {item.type === 'pemasukan' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div className="lg:hidden flex items-center gap-2 pr-1">
                        <span className={`text-[8px] font-black uppercase ${item.type === 'pemasukan' ? 'text-emerald-500' : 'text-rose-500'}`}>
                           {item.type === 'pemasukan' ? 'Masuk' : 'Keluar'}
                        </span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-rose-600 bg-rose-50 border border-rose-100 rounded-md hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                          disabled={items.length === 1}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-3 space-y-1">
                       <input
                         type="text"
                         placeholder="Tulis urusan transaksi..."
                         className="w-full bg-zinc-50/50 lg:bg-transparent border border-zinc-100 lg:border-none p-2 lg:p-0 rounded-lg lg:rounded-none text-xs font-bold text-zinc-900 focus:ring-0 outline-none placeholder:text-zinc-300"
                         value={item.name}
                         onChange={(e) => updateItem(item.id, "name", e.target.value)}
                       />
                    </div>

                    <div className="grid grid-cols-2 lg:contents gap-2">
                       <div className="lg:col-span-2 bg-zinc-50/50 lg:bg-transparent border border-zinc-100 lg:border-none p-2 lg:p-0 rounded-lg">
                          <label className="lg:hidden block text-[8px] text-zinc-400 font-bold uppercase mb-1">Kategori</label>
                          <select
                            className="w-full bg-transparent border-none p-0 text-[10px] lg:text-[11px] font-black text-zinc-700 appearance-none outline-none cursor-pointer focus:ring-0"
                            value={item.category_id || ""}
                            onChange={(e) => updateItem(item.id, "category_id", e.target.value)}
                          >
                            <option value="">Pilih Kategori</option>
                            {categories.filter(c => c.type === item.type).map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                       </div>

                       <div className="lg:col-span-2 bg-zinc-50/50 lg:bg-transparent border border-zinc-100 lg:border-none p-2 lg:p-0 rounded-lg">
                          <label className="lg:hidden block text-[8px] text-zinc-400 font-bold uppercase mb-1">Metode</label>
                          <div className="relative flex items-center gap-1.5 group/select">
                             <Banknote className="w-3.5 h-3.5 text-zinc-300 transition-colors group-focus-within/select:text-primary shrink-0" />
                             <select
                               className="w-full bg-transparent border-none p-0 text-[10px] lg:text-[11px] font-black text-zinc-700 appearance-none outline-none cursor-pointer focus:ring-0 pr-4 lg:pr-6"
                               value={item.payment_method_id || ""}
                               onChange={(e) => updateItem(item.id, "payment_method_id", e.target.value)}
                             >
                               <option value="">Metode</option>
                               {paymentMethods.map(pm => (
                                 <option key={pm.id} value={pm.id}>{pm.name}</option>
                               ))}
                             </select>
                             <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 lg:w-3.5 lg:h-3.5 text-zinc-300 pointer-events-none" />
                          </div>
                       </div>
                    </div>

                    <div className="lg:col-span-3 flex items-center justify-end bg-zinc-50/50 lg:bg-white border border-zinc-100 lg:border-zinc-200 rounded-xl px-3 py-2 lg:py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                       <span className={`text-[9px] font-black mr-2 ${item.type === 'pemasukan' ? 'text-emerald-500' : 'text-rose-500'}`}>Rp</span>
                       <input
                         type="number"
                         className={`w-full bg-transparent border-none p-0 text-base lg:text-lg font-black text-right outline-none focus:ring-0 ${item.type === 'pemasukan' ? 'text-emerald-700' : 'text-rose-700'}`}
                         value={item.amount === 0 && !isNaN(item.amount) ? "" : item.amount}
                         onFocus={(e) => e.target.select()}
                         onWheel={(e) => (e.target as HTMLInputElement).blur()}
                         onChange={(e) => {
                           const val = e.target.value === "" ? 0 : parseInt(e.target.value);
                           updateItem(item.id, "amount", val);
                         }}
                       />
                    </div>

                    <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
                       <button
                         onClick={() => removeItem(item.id)}
                         className="p-1.5 text-rose-600 bg-rose-50 border border-rose-100 rounded-lg hover:bg-rose-600 hover:text-white transition-all shadow-sm opacity-60 hover:opacity-100"
                         disabled={items.length === 1}
                       >
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-zinc-200/50">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                <div className="p-3 lg:p-4 bg-white border border-zinc-200 rounded-xl lg:rounded-2xl flex flex-col items-center shadow-sm">
                   <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Pemasukan</span>
                   <h4 className="text-lg lg:text-xl font-black text-emerald-600 tracking-tight">{formatIDR(totalIncome)}</h4>
                </div>
                
                <div className="p-3 lg:p-4 bg-white border border-zinc-200 rounded-xl lg:rounded-2xl flex flex-col items-center shadow-sm">
                   <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Pengeluaran</span>
                   <h4 className="text-lg lg:text-xl font-black text-rose-600 tracking-tight">{formatIDR(totalExpense)}</h4>
                </div>

                <div className="sm:col-span-2 lg:col-span-1 p-3 lg:p-4 bg-[#030037] rounded-xl lg:rounded-2xl flex flex-col items-center shadow-lg group">
                   <span className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-1">Saldo Bersih</span>
                   <h4 className={`text-xl lg:text-2xl font-black tracking-tighter transition-all group-hover:scale-105 ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatIDR(balance)}
                   </h4>
                </div>
             </div>

             <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-zinc-200 rounded-2xl p-3 lg:p-4 px-6 lg:px-8 gap-3 lg:gap-4 shadow-sm">
                <div className="flex items-center gap-3 text-zinc-400">
                   <Info className="w-4 h-4" />
                   <div className="flex flex-col">
                      <p className="text-[10px] font-semibold italic">Semua data terenkripsi dan disimpan otomatis.</p>
                      <input 
                        type="text" 
                        placeholder="Tambahkan catatan laporan..." 
                        className="bg-transparent border-none p-0 text-[11px] text-zinc-900 focus:ring-0 outline-none w-full"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                   </div>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {editId && (
                        <button onClick={() => router.push("/backend/tenant/transactions")} className="flex-1 md:flex-none px-6 py-2.5 bg-zinc-100 text-zinc-500 rounded-xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all">
                            Batal
                        </button>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={isSubmitting}
                      className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-2.5 lg:py-3 bg-[#030037] text-white hover:bg-black rounded-xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all group border border-white/5 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      {editId ? 'Perbarui Laporan' : 'Simpan Laporan'}
                    </button>
                </div>
             </div>
          </div>
        </div>


      </div>
    </div>
  );
};

// Main Page with Suspense
const UnifiedRecordingPage = () => {
  return (
    <Suspense fallback={<FullPageLoader />}>
       <RecorderContent />
    </Suspense>
  );
};

export default UnifiedRecordingPage;