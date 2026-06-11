import React from "react";
import { getPOSPageData } from "./actions";
import POSForm from "./POSForm";

interface PageProps {
  searchParams: Promise<{
    id?: string;
  }>;
}

export default async function POSKasirPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const editId = searchParams.id || null;

  const result = await getPOSPageData(editId);

  if (result.status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] text-red-500 font-bold">
        {result.message || "Gagal memuat konfigurasi kasir."}
      </div>
    );
  }

  // Fallback defaults
  const profile = result.profile;
  const branches = result.branches || [];
  const categories = result.categories || [];
  const paymentMethods = result.paymentMethods || [];
  const txCategories = result.txCategories || [];
  const initialProducts = result.initialProducts || [];
  const initialBranchId = result.initialBranchId || "";
  const editTransaction = result.editTransaction || null;

  return (
    <POSForm
      profile={profile}
      branches={branches}
      categories={categories}
      paymentMethods={paymentMethods}
      txCategories={txCategories}
      initialProducts={initialProducts}
      initialBranchId={initialBranchId}
      editTransaction={editTransaction}
      editId={editId}
    />
  );
}
