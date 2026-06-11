import React from "react";
import { getHistoryPageData } from "../actions";
import HistoryTable from "./HistoryTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    dateStart?: string;
    dateEnd?: string;
    page?: string;
  }>;
}

export default async function TransactionHistoryPage(props: PageProps) {
  const searchParams = await props.searchParams;

  const result = await getHistoryPageData({
    search: searchParams.search,
    dateStart: searchParams.dateStart,
    dateEnd: searchParams.dateEnd,
    page: searchParams.page ? Number(searchParams.page) : 1,
    limit: 10
  });

  if (result.status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500 font-bold">
        {result.message || "Terjadi kesalahan saat memuat data."}
      </div>
    );
  }

  // Siapkan data dengan default fallback jika undefined
  const data = (result.data || []) as any[];
  const total = result.total || 0;
  const totalPages = result.totalPages || 1;
  const stats = result.stats || { totalIncome: 0, totalExpense: 0, netBalance: 0 };
  const branches = result.branches || [];
  const profile = result.profile || null;

  return (
    <HistoryTable
      initialData={data}
      total={total}
      totalPages={totalPages}
      stats={stats}
      branches={branches}
      profile={profile}
      searchParams={searchParams}
    />
  );
}
