"use client";

import React, { useState, useTransition } from "react";
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Package,
    Layers,
    Building2,
    Store,
    Activity,
    AlertTriangle,
    X,
    Lock,
    Globe
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { saveProductAction, deleteProductAction } from "./actions";

interface ProductStock {
    id: string;
    branch_id: string;
    stock: number;
    min_stock: number;
    branches: {
        name: string;
    };
}

interface Product {
    id: string;
    profile_id: string;
    branch_id: string | null;
    category_id: string | null;
    name: string;
    description: string | null;
    base_price: number;
    sell_price: number;
    image_url: string | null;
    is_active: boolean;
    created_at: string;
    product_categories: {
        name: string;
    } | null;
    branches: {
        name: string;
    } | null;
    product_stocks: ProductStock[];
    current_branch_stock?: number;
    current_branch_min_stock?: number;
}

interface Branch {
    id: string;
    name: string;
}

interface Category {
    id: string;
    name: string;
}

interface ProductsTableProps {
  products: Product[];
  branches: Branch[];
  categories: Category[];
  profile: any;
}

export default function ProductsTable({
  products,
  branches,
  categories,
  profile
}: ProductsTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [actionLoading, setActionLoading] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedOwnerFilter, setSelectedOwnerFilter] = useState("all");

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<"create" | "edit" | "adjust_stock">("create");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Form states
    const [formName, setFormName] = useState("");
    const [formCategoryId, setFormCategoryId] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formBasePrice, setFormBasePrice] = useState<number | "">(0);
    const [formSellPrice, setFormSellPrice] = useState<number | "">(0);
    const [formIsActive, setFormIsActive] = useState(true);
    const [formImageUrl, setFormImageUrl] = useState("");
    
    // Dynamic branch stock state
    const [branchStocksInput, setBranchStocksInput] = useState<{ [branchId: string]: { stock: number | ""; min_stock: number | "" } }>({});

    const formatCurrency = (v: number) =>
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

    const isOwner = profile && !profile.branch_id;

    // Filter products
    const filteredProducts = products.filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || p.category_id === selectedCategory;

        let matchesOwner = true;
        if (selectedOwnerFilter === "pusat") {
            matchesOwner = p.branch_id === null;
        } else if (selectedOwnerFilter === "cabang") {
            matchesOwner = p.branch_id !== null;
        }

        return matchesSearch && matchesCategory && matchesOwner;
    });

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;
        const file = fileList[0];

        try {
            setUploadingImage(true);
            const formData = new FormData();
            formData.append("file", file);
            if (formImageUrl) {
                formData.append("old_url", formImageUrl);
            }

            const res = await fetch("/api/upload/product", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setFormImageUrl(data.url);
                toast.success("Gambar berhasil diunggah");
            } else {
                const errData = await res.json();
                toast.error(errData.error || "Gagal mengunggah gambar.");
            }
        } catch (error) {
            console.error("Upload error:", error);
            toast.error("Kesalahan koneksi saat mengunggah gambar.");
        } finally {
            setUploadingImage(false);
        }
    };

    const openCreateModal = () => {
        setModalMode("create");
        setFormName("");
        setFormCategoryId("");
        setFormDescription("");
        setFormBasePrice("");
        setFormSellPrice("");
        setFormIsActive(true);
        setFormImageUrl("");
        
        const initialStocks: any = {};
        branches.forEach(b => {
            initialStocks[b.id] = { stock: "", min_stock: "" };
        });
        setBranchStocksInput(initialStocks);

        setIsModalOpen(true);
    };

    const handleEditClick = (product: Product) => {
        setSelectedProduct(product);
        const isOwnProduct = isOwner ? (product.branch_id === null) : (product.branch_id === profile.branch_id);

        if (isOwnProduct) {
            setModalMode("edit");
            setFormName(product.name);
            setFormCategoryId(product.category_id || "");
            setFormDescription(product.description || "");
            setFormBasePrice(Number(product.base_price));
            setFormSellPrice(Number(product.sell_price));
            setFormIsActive(product.is_active);
            setFormImageUrl(product.image_url || "");

            const existingStocks: any = {};
            branches.forEach(b => {
                const currentStockInfo = product.product_stocks?.find(s => s.branch_id === b.id);
                existingStocks[b.id] = {
                    stock: currentStockInfo ? currentStockInfo.stock : 0,
                    min_stock: currentStockInfo ? currentStockInfo.min_stock : 0
                };
            });
            setBranchStocksInput(existingStocks);
            setIsModalOpen(true);
        } else {
            openAdjustStockModal(product);
        }
    };

    const openAdjustStockModal = (product: Product) => {
        setSelectedProduct(product);
        const branchId = profile?.branch_id;
        const currentStockInfo = product.product_stocks?.find(s => s.branch_id === branchId);
        
        const initialInput: any = {};
        initialInput[branchId] = {
            stock: currentStockInfo ? currentStockInfo.stock : product.current_branch_stock || 0,
            min_stock: currentStockInfo ? currentStockInfo.min_stock : product.current_branch_min_stock || 0
        };
        setBranchStocksInput(initialInput);

        setModalMode("adjust_stock");
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setActionLoading(true);

            if (modalMode === "create") {
                const branchStocksArray = Object.keys(branchStocksInput).map(bId => ({
                    branch_id: bId,
                    stock: branchStocksInput[bId].stock === "" ? 0 : Number(branchStocksInput[bId].stock),
                    min_stock: branchStocksInput[bId].min_stock === "" ? 0 : Number(branchStocksInput[bId].min_stock)
                })).filter(s => s.stock > 0 || s.min_stock > 0);

                const res = await saveProductAction({
                    profile_id: profile.tenant_owner_id,
                    branch_id: isOwner ? null : profile.branch_id,
                    category_id: formCategoryId || null,
                    name: formName,
                    description: formDescription || null,
                    base_price: formBasePrice === "" ? 0 : formBasePrice,
                    sell_price: formSellPrice === "" ? 0 : formSellPrice,
                    image_url: formImageUrl || null,
                    is_active: formIsActive,
                    branch_stocks: branchStocksArray
                });

                if (res.status === "success") {
                    toast.success("Produk berhasil dibuat");
                    setIsModalOpen(false);
                    router.refresh();
                } else {
                    toast.error(res.message || "Gagal membuat produk.");
                }
            } 
            
            else if (modalMode === "edit") {
                const branchStocksArray = Object.keys(branchStocksInput).map(bId => ({
                    branch_id: bId,
                    stock: branchStocksInput[bId].stock === "" ? 0 : Number(branchStocksInput[bId].stock),
                    min_stock: branchStocksInput[bId].min_stock === "" ? 0 : Number(branchStocksInput[bId].min_stock)
                }));

                const res = await saveProductAction({
                    id: selectedProduct?.id,
                    profile_id: profile.tenant_owner_id,
                    branch_id: selectedProduct?.branch_id || null,
                    category_id: formCategoryId || null,
                    name: formName,
                    description: formDescription || null,
                    base_price: formBasePrice === "" ? 0 : formBasePrice,
                    sell_price: formSellPrice === "" ? 0 : formSellPrice,
                    image_url: formImageUrl || null,
                    is_active: formIsActive,
                    branch_stocks: branchStocksArray
                });

                if (res.status === "success") {
                    toast.success("Produk berhasil diperbarui");
                    setIsModalOpen(false);
                    router.refresh();
                } else {
                    toast.error(res.message || "Gagal memperbarui produk.");
                }
            } 
            
            else if (modalMode === "adjust_stock") {
                const branchId = profile?.branch_id;
                // Kami panggil saveProductAction dengan hanya passing stok untuk satu cabang ini
                const res = await saveProductAction({
                    id: selectedProduct?.id,
                    profile_id: profile.tenant_owner_id,
                    branch_id: selectedProduct?.branch_id || null,
                    category_id: selectedProduct?.category_id || null,
                    name: selectedProduct?.name || "",
                    base_price: Number(selectedProduct?.base_price || 0),
                    sell_price: Number(selectedProduct?.sell_price || 0),
                    is_active: selectedProduct?.is_active ?? true,
                    branch_stocks: [{
                        branch_id: branchId,
                        stock: branchStocksInput[branchId].stock === "" ? 0 : Number(branchStocksInput[branchId].stock),
                        min_stock: branchStocksInput[branchId].min_stock === "" ? 0 : Number(branchStocksInput[branchId].min_stock)
                    }]
                });

                if (res.status === "success") {
                    toast.success("Stok cabang berhasil diperbarui");
                    setIsModalOpen(false);
                    router.refresh();
                } else {
                    toast.error(res.message || "Gagal memperbarui stok cabang");
                }
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("Kesalahan koneksi ke server.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus produk ini secara permanen? Stok dan mutasinya akan ikut terhapus.")) return;
        try {
            setActionLoading(true);
            const res = await deleteProductAction(id);
            if (res.status === "success") {
                toast.success("Produk berhasil dihapus");
                router.refresh();
            } else {
                toast.error(res.message || "Gagal menghapus produk");
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Gagal menghapus produk");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#030037] font-heading">
                        Manajemen Produk & Stok
                    </h1>
                    <p className="text-sm text-zinc-550">
                        Kelola katalog produk, pantau persediaan stok cabang, dan lakukan penyesuaian stok secara real-time.
                    </p>
                </div>
                <button 
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#3c39d6] text-white hover:bg-[#3c39d6]/90 transition-all font-bold text-sm rounded-2xl shadow-lg shadow-[#3c39d6]/20 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    {isOwner ? "Tambah Produk Pusat" : "Tambah Produk Lokal"}
                </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white border border-zinc-150 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center shadow-sm">
                <div className="relative w-full md:flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input 
                        type="text" 
                        placeholder="Cari produk berdasarkan nama..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-zinc-50 border border-zinc-200 pl-11 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#3c39d6] transition-all text-black placeholder-zinc-400 font-bold"
                    />
                </div>
                
                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-2.5 rounded-xl w-full md:w-auto shrink-0">
                    <Layers className="w-4 h-4 text-zinc-400" />
                    <select 
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-transparent border-0 text-black text-xs font-semibold focus:outline-none cursor-pointer w-full md:w-36 text-black bg-white"
                    >
                        <option value="all" className="text-black bg-white">Semua Kategori</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id} className="text-black bg-white">{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 px-3 py-2.5 rounded-xl w-full md:w-auto shrink-0">
                    <Store className="w-4 h-4 text-zinc-400" />
                    <select 
                        value={selectedOwnerFilter}
                        onChange={(e) => setSelectedOwnerFilter(e.target.value)}
                        className="bg-transparent border-0 text-black text-xs font-semibold focus:outline-none cursor-pointer w-full md:w-36 text-black bg-white"
                    >
                        <option value="all" className="text-black bg-white">Semua Asal Produk</option>
                        <option value="pusat" className="text-black bg-white">Produk Pusat (Pusat)</option>
                        <option value="cabang" className="text-black bg-white">Produk Lokal Cabang</option>
                    </select>
                </div>
            </div>

            {/* Content Table */}
            <div className="bg-white border border-zinc-150 rounded-2xl overflow-hidden shadow-sm">
                {filteredProducts.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-3">
                        <div className="p-4 bg-zinc-50 rounded-full text-zinc-300">
                            <Package className="w-12 h-12" />
                        </div>
                        <h3 className="text-lg font-bold text-[#030037]">Katalog Produk Kosong</h3>
                        <p className="text-sm text-zinc-500 max-w-md">Belum ada produk yang memenuhi kriteria filter Anda.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-100 bg-zinc-50/50 text-[10px] uppercase tracking-wider font-bold text-zinc-400">
                                    <th className="py-4 px-6">Info Produk</th>
                                    <th className="py-4 px-6">Kategori</th>
                                    <th className="py-4 px-6 text-center">Tipe Produk</th>
                                    {isOwner && <th className="py-4 px-6 text-right">Harga Modal</th>}
                                    <th className="py-4 px-6 text-right">Harga Jual</th>
                                    <th className="py-4 px-6 text-center">{isOwner ? "Distribusi Stok Cabang" : "Stok Cabang Anda"}</th>
                                    {isOwner && <th className="py-4 px-6 text-center">Status</th>}
                                    <th className="py-4 px-6 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 text-sm text-zinc-707 font-medium">
                                {filteredProducts.map((product) => {
                                    const totalGlobalStock = product.product_stocks?.reduce((sum, s) => sum + s.stock, 0) ?? 0;
                                    const isOwnProduct = isOwner ? (product.branch_id === null) : (product.branch_id === profile.branch_id);
                                    
                                    return (
                                        <tr key={product.id} className="hover:bg-zinc-50/50 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    {product.image_url ? (
                                                        <img 
                                                            src={product.image_url} 
                                                            alt={product.name} 
                                                            className="w-10 h-10 object-cover rounded-lg border border-zinc-100 shrink-0" 
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-zinc-50 rounded-lg flex items-center justify-center text-zinc-400 shrink-0 border border-zinc-100">
                                                            <Package className="w-5 h-5" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <span className="font-bold text-[#030037] block leading-tight">{product.name}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-4 px-6">
                                                {product.product_categories ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#866e98]/10 text-[#866e98] border border-[#866e98]/10">
                                                        {product.product_categories.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-300 text-xs italic">Tanpa Kategori</span>
                                                )}
                                            </td>

                                            <td className="py-4 px-6 text-center font-bold">
                                                {product.branch_id === null ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                                        <Globe className="w-3 h-3" />
                                                        Pusat
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100" title={product.branches?.name || ""}>
                                                        <Store className="w-3 h-3" />
                                                        {isOwner ? (product.branches?.name.split(" ")[0] || "Cabang") : "Lokal"}
                                                    </span>
                                                )}
                                            </td>

                                            {isOwner && (
                                                <td className="py-4 px-6 text-right font-semibold font-mono text-zinc-400">
                                                    {formatCurrency(product.base_price)}
                                                </td>
                                            )}

                                            <td className="py-4 px-6 text-right font-bold font-mono text-emerald-600">
                                                {formatCurrency(product.sell_price)}
                                            </td>

                                            <td className="py-4 px-6">
                                                {isOwner ? (
                                                    <div className="flex flex-col gap-1 items-center max-w-[220px] mx-auto">
                                                        <span className="font-bold text-[#030037] text-xs">Total: {totalGlobalStock} pcs</span>
                                                        <div className="flex flex-wrap justify-center gap-1 mt-1">
                                                            {product.product_stocks?.map((ps) => (
                                                                <span key={ps.id} className="text-[9px] px-1.5 py-0.5 bg-zinc-50 text-zinc-500 rounded border border-zinc-200" title={ps.branches?.name}>
                                                                    {ps.branches?.name.split(" ")[0]}: <strong className={ps.stock <= ps.min_stock ? "text-rose-500" : "text-emerald-600"}>{ps.stock}</strong>
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                                                            (product.current_branch_stock ?? 0) <= (product.current_branch_min_stock ?? 0)
                                                                ? "bg-rose-50 text-rose-600 border border-rose-100" 
                                                                : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                                        }`}>
                                                            {product.current_branch_stock} pcs
                                                            {(product.current_branch_stock ?? 0) <= (product.current_branch_min_stock ?? 0) && (
                                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </td>

                                            {isOwner && (
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                                                        product.is_active 
                                                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                                            : "bg-zinc-50 text-zinc-400 border border-zinc-200"
                                                    }`}>
                                                        {product.is_active ? "Aktif" : "Nonaktif"}
                                                    </span>
                                                </td>
                                            )}

                                            <td className="py-4 px-6 text-center font-bold">
                                                <div className="flex items-center justify-center gap-2">
                                                    {isOwnProduct ? (
                                                        <>
                                                            <button 
                                                                onClick={() => handleEditClick(product)}
                                                                className="p-2 hover:bg-zinc-100 text-zinc-650 text-zinc-800 rounded-xl transition-all"
                                                                title="Edit Detail Produk"
                                                            >
                                                                <Edit2 className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(product.id)}
                                                                className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-all"
                                                                title="Hapus Produk"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button 
                                                            onClick={() => openAdjustStockModal(product)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 hover:bg-[#3c39d6]/10 text-[#3c39d6] bg-zinc-50 font-bold text-xs rounded-xl border border-zinc-200 hover:border-[#3c39d6]/20 transition-all"
                                                            title="Sesuaikan stok cabang"
                                                        >
                                                            <Activity className="w-3.5 h-3.5" />
                                                            Opname Stok
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Dialog Form */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-[#030037]/40 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl border border-zinc-150 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="px-6 py-4 bg-zinc-50 border-b border-zinc-150 flex items-center justify-between">
                            <h3 className="font-bold text-lg text-[#030037] font-heading">
                                {modalMode === "create" && (isOwner ? "Tambah Master Produk Pusat" : "Tambah Produk Lokal Cabang")}
                                {modalMode === "edit" && `Edit Produk: ${selectedProduct?.name}`}
                                {modalMode === "adjust_stock" && `Penyesuaian Stok Cabang: ${selectedProduct?.name}`}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 text-zinc-400 hover:text-zinc-650 hover:bg-zinc-100 rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-black">
                            {modalMode !== "adjust_stock" ? (
                                <>
                                    {/* Baris 1: Nama Produk */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-zinc-900 uppercase tracking-widest pl-0.5 block text-black">Nama Produk <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="text" 
                                            required 
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            placeholder="Contoh: Royal Canin Kitten 2kg"
                                            className="w-full bg-zinc-50/40 hover:bg-zinc-50/70 border border-zinc-200/80 rounded-xl px-4 py-3 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-[#3c39d6] focus:ring-4 focus:ring-[#3c39d6]/5 focus:bg-white transition-all duration-200 font-bold"
                                        />
                                    </div>

                                    {/* Baris 2: Kategori & Gambar */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-extrabold text-zinc-900 uppercase tracking-widest pl-0.5 block text-black">Kategori Produk</label>
                                            <select 
                                                value={formCategoryId}
                                                onChange={(e) => setFormCategoryId(e.target.value)}
                                                className="w-full bg-zinc-50/40 hover:bg-zinc-50/70 border border-zinc-200/80 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-[#3c39d6] focus:ring-4 focus:ring-[#3c39d6]/5 focus:bg-white transition-all duration-200 cursor-pointer font-bold text-black bg-white"
                                            >
                                                <option value="" className="text-black bg-white">Pilih Kategori</option>
                                                {categories.map((c) => (
                                                    <option key={c.id} value={c.id} className="text-black bg-white">{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-extrabold text-zinc-900 uppercase tracking-widest pl-0.5 block text-black">Gambar Produk</label>
                                            <div className="flex items-center gap-4 bg-zinc-50/40 p-3 rounded-xl border border-zinc-200/60">
                                                {formImageUrl ? (
                                                    <img 
                                                        src={formImageUrl} 
                                                        alt="Pratinjau" 
                                                        className="w-14 h-14 object-cover rounded-lg border border-zinc-155 shrink-0" 
                                                    />
                                                ) : (
                                                    <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center text-zinc-450 shrink-0 border border-zinc-200/80 border-dashed">
                                                        <Package className="w-5 h-5 text-zinc-455" />
                                                    </div>
                                                )}
                                                <div className="flex flex-col gap-1">
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        id="product-image-upload"
                                                        onChange={handleImageUpload}
                                                        className="hidden"
                                                    />
                                                    <label 
                                                        htmlFor="product-image-upload"
                                                        className="px-3.5 py-2 bg-white border border-zinc-200 text-black hover:bg-zinc-50 hover:text-black transition-all font-bold text-xs rounded-lg cursor-pointer inline-flex items-center justify-center shadow-sm"
                                                    >
                                                        {uploadingImage ? "Mengunggah..." : "Pilih Gambar"}
                                                    </label>
                                                    {formImageUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormImageUrl("")}
                                                            className="text-left text-[9px] text-rose-500 font-extrabold hover:underline"
                                                        >
                                                            Hapus Gambar
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Baris 3: Deskripsi */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-extrabold text-zinc-900 uppercase tracking-widest pl-0.5 block text-black">Deskripsi Produk</label>
                                        <textarea 
                                            value={formDescription}
                                            onChange={(e) => setFormDescription(e.target.value)}
                                            rows={2}
                                            placeholder="Penjelasan singkat mengenai spesifikasi produk..."
                                            className="w-full bg-zinc-50/40 hover:bg-zinc-50/70 border border-zinc-200/80 rounded-xl px-4 py-3 text-sm text-black placeholder-zinc-400 focus:outline-none focus:border-[#3c39d6] focus:ring-4 focus:ring-[#3c39d6]/5 focus:bg-white transition-all duration-200 font-bold"
                                        />
                                    </div>

                                    {/* Baris 4: Harga Modal & Jual */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-extrabold text-zinc-900 uppercase tracking-widest pl-0.5 block text-black">Harga Modal / Beli (Rp)</label>
                                            <input 
                                                type="number" 
                                                value={formBasePrice}
                                                onChange={(e) => setFormBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                                                className="w-full bg-zinc-50/40 hover:bg-zinc-50/70 border border-zinc-200/80 rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:border-[#3c39d6] focus:ring-4 focus:ring-[#3c39d6]/5 focus:bg-white transition-all duration-200 font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-extrabold text-zinc-900 uppercase tracking-widest pl-0.5 block text-black">Harga Jual Dasar (Rp)</label>
                                            <input 
                                                type="number" 
                                                value={formSellPrice}
                                                onChange={(e) => setFormSellPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                                className="w-full bg-zinc-50/40 hover:bg-zinc-50/70 border border-zinc-200/80 rounded-xl px-4 py-3 text-sm text-black font-bold focus:outline-none focus:border-[#3c39d6] focus:ring-4 focus:ring-[#3c39d6]/5 focus:bg-white transition-all duration-200"
                                            />
                                        </div>
                                    </div>

                                    {/* Baris 5: Alokasi Distribusi Stok ke Cabang */}
                                    <div className="space-y-4 pt-4 border-t border-zinc-100">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-[#030037] flex items-center gap-2 font-heading">
                                                <Store className="w-4 h-4 text-[#3c39d6]" />
                                                {isOwner ? "Alokasi Ketersediaan Stok Cabang" : "Inisialisasi Stok Produk Lokal"}
                                            </h4>
                                            <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-[#3c39d6]/10 text-[#3c39d6] border border-[#3c39d6]/10 shadow-sm">
                                                {branches.length} Cabang Terhubung
                                            </span>
                                        </div>
                                        
                                        <div className="flex flex-col gap-3 bg-zinc-50/50 p-4 rounded-2xl border border-zinc-200/80 max-h-64 overflow-y-auto text-black">
                                            {branches.map(b => (
                                                <div key={b.id} className="p-4 bg-white rounded-xl border border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-[#3c39d6]/30 transition-all duration-200">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-[#3c39d6]/5 border border-[#3c39d6]/10 flex items-center justify-center text-[#3c39d6] shrink-0">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <span className="text-xs font-bold text-zinc-950 block text-black">{b.name}</span>
                                                            <span className="text-[9px] font-bold text-[#3c39d6] block uppercase tracking-wider">Cabang Aktif</span>
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 shrink-0 text-black">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest block text-black">Stok</span>
                                                            <input 
                                                                type="number" 
                                                                value={branchStocksInput[b.id]?.stock ?? ""}
                                                                placeholder="0"
                                                                onChange={(e) => setBranchStocksInput(prev => ({
                                                                    ...prev,
                                                                    [b.id]: {
                                                                        ...prev[b.id],
                                                                        stock: e.target.value === "" ? "" : Number(e.target.value)
                                                                    }
                                                                }))}
                                                                className="w-20 bg-zinc-50/50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 font-bold text-center focus:outline-none focus:border-[#3c39d6] focus:bg-white focus:ring-4 focus:ring-[#3c39d6]/5 transition-all duration-200 text-black"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-widest font-sans block text-black">Min</span>
                                                            <input 
                                                                type="number" 
                                                                value={branchStocksInput[b.id]?.min_stock ?? ""}
                                                                placeholder="0"
                                                                onChange={(e) => setBranchStocksInput(prev => ({
                                                                    ...prev,
                                                                    [b.id]: {
                                                                        ...prev[b.id],
                                                                        min_stock: e.target.value === "" ? "" : Number(e.target.value)
                                                                    }
                                                                }))}
                                                                className="w-20 bg-zinc-50/50 border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-950 font-bold text-center focus:outline-none focus:border-[#3c39d6] focus:bg-white focus:ring-4 focus:ring-[#3c39d6]/5 transition-all duration-200 text-black"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Toggle Is Active */}
                                    <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
                                        <input 
                                            type="checkbox" 
                                            id="formIsActive"
                                            checked={formIsActive}
                                            onChange={(e) => setFormIsActive(e.target.checked)}
                                            className="w-4 h-4 rounded border-zinc-300 text-[#3c39d6] focus:ring-[#3c39d6] transition-all cursor-pointer text-black"
                                        />
                                        <label htmlFor="formIsActive" className="text-xs font-bold text-zinc-707 text-zinc-900 cursor-pointer uppercase tracking-wider block">Tampilkan di Etalase Toko Publik (Aktif)</label>
                                    </div>
                                </>
                            ) : (
                                /* Hanya Tampilan Input Stok Cabang untuk Staff */
                                <div className="space-y-4 text-black">
                                    <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-150 space-y-2">
                                        <div className="flex items-center gap-1 text-zinc-400 uppercase tracking-widest font-black text-[10px]">
                                            <Lock className="w-3.5 h-3.5 text-zinc-400" />
                                            <span>Spesifikasi Produk Pusat (Terkunci)</span>
                                        </div>
                                        <h4 className="text-base font-bold text-[#030037]">{selectedProduct?.name}</h4>
                                        <p className="text-xs text-zinc-500">{selectedProduct?.description || "Tidak ada deskripsi."}</p>
                                        <div className="flex gap-4 pt-2 text-xs">
                                            <span>Harga Jual: <strong className="text-emerald-600 font-bold">{formatCurrency(selectedProduct?.sell_price || 0)}</strong></span>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-[#030037] uppercase tracking-wider block">Opname / Penyesuaian Stok Fisik</h4>
                                        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-150 grid grid-cols-2 gap-4 text-black">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block text-black">Stok Fisik Saat Ini (pcs)</label>
                                                <input 
                                                    type="number" 
                                                    value={branchStocksInput[profile?.branch_id]?.stock ?? ""}
                                                    onChange={(e) => setBranchStocksInput(prev => ({
                                                        ...prev,
                                                        [profile?.branch_id]: {
                                                            ...prev[profile?.branch_id],
                                                            stock: e.target.value === "" ? "" : Number(e.target.value)
                                                        }
                                                    }))}
                                                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-black font-black focus:outline-none focus:border-[#3c39d6]"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-zinc-550 uppercase tracking-wider block text-black">Batas Minimum Stok (Alert)</label>
                                                <input 
                                                    type="number" 
                                                    value={branchStocksInput[profile?.branch_id]?.min_stock ?? ""}
                                                    onChange={(e) => setBranchStocksInput(prev => ({
                                                        ...prev,
                                                        [profile?.branch_id]: {
                                                            ...prev[profile?.branch_id],
                                                            min_stock: e.target.value === "" ? "" : Number(e.target.value)
                                                        }
                                                    }))}
                                                    className="w-full bg-white border border-zinc-200 rounded-xl px-4 py-2.5 text-sm text-black focus:outline-none focus:border-[#3c39d6] font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 shrink-0" />
                                            <p className="text-xs font-semibold leading-normal">
                                                Produk ini adalah produk global dari Pusat. Anda hanya berwenang mengubah kuantitas stok di cabang Anda, tanpa merubah data master lainnya.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal Actions */}
                            <div className="pt-4 border-t border-zinc-150 flex items-center justify-end gap-3 shrink-0">
                                <button 
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-5 py-3 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 font-bold text-sm rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit"
                                    disabled={actionLoading || uploadingImage}
                                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#3c39d6] hover:bg-[#3c39d6]/90 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-[#3c39d6]/10"
                                >
                                    {actionLoading ? "Menyimpan..." : "Simpan Perubahan"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
