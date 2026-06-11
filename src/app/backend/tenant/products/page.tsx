import React from "react";
import { getProductsPageData } from "./actions";
import ProductsTable from "./ProductsTable";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TenantProductsPage() {
    const data = await getProductsPageData();

    if (data.status === "error") {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white border border-zinc-150 rounded-2xl shadow-sm min-h-[400px] text-center text-black">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-[#030037] mb-2">Error</h3>
                <p className="text-sm text-zinc-550 max-w-md">
                    {data.message}
                </p>
            </div>
        );
    }

    if (data.status === "forbidden") {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white border border-zinc-150 rounded-2xl shadow-sm min-h-[400px] text-center text-black">
                <AlertTriangle className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
                <h3 className="text-xl font-bold text-[#030037] mb-2">Akses Ditolak</h3>
                <p className="text-sm text-zinc-550 max-w-md">
                    Anda tidak memiliki hak akses (`kelola_produk`) untuk membuka halaman kelola produk ini. Silakan hubungi Administrator Anda.
                </p>
            </div>
        );
    }

    return (
        <ProductsTable
            products={data.products || []}
            branches={data.branches || []}
            categories={data.categories || []}
            profile={data.profile}
        />
    );
}
