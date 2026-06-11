import React from "react";
import { getTransactionPageData } from "./actions";
import { TransactionForm } from "./TransactionForm";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function Page({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const editId = typeof resolvedSearchParams.id === "string" ? resolvedSearchParams.id : null;

  // Memuat data secara sinkron di Server menggunakan Server Actions / Helper DB
  const data = await getTransactionPageData(editId);

  if (data.status === "error" || !data.profile) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-xl font-bold text-rose-600">Terjadi Kesalahan</h1>
        <p className="text-sm text-zinc-500 mt-2">{data.message || "Gagal memuat data transaksi dari server."}</p>
      </div>
    );
  }

  return (
    <TransactionForm
      initialProfile={data.profile}
      categories={data.categories || []}
      paymentMethods={data.paymentMethods || []}
      branches={data.branches || []}
      editTransaction={data.editTransaction}
      initialRecentTransactions={data.recentTransactions || []}
      initialBranchId={data.initialBranchId || ""}
      editId={editId}
    />
  );
}