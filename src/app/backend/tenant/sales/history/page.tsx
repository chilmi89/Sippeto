import React from "react";
import { getSalesHistoryPageData } from "../actions";
import SalesHistoryTable from "./SalesHistoryTable";

interface PageProps {
  searchParams: Promise<{
    search?: string;
    dateStart?: string;
    dateEnd?: string;
    page?: string;
  }>;
}

export default async function SalesHistoryPage(props: PageProps) {
  const searchParams = await props.searchParams;

  const result = await getSalesHistoryPageData({
    search: searchParams.search,
    dateStart: searchParams.dateStart,
    dateEnd: searchParams.dateEnd,
    page: searchParams.page ? Number(searchParams.page) : 1,
    limit: 15
  });

  if (result.status === "error") {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-red-500 font-bold">
        {result.message || "Terjadi kesalahan saat memuat riwayat penjualan."}
      </div>
    );
  }

  // Fallback defaults
  const data = (result.data || []) as any[];
  const total = result.total || 0;
  const totalPages = result.totalPages || 1;
  const stats = result.stats || { totalRevenue: 0, totalItems: 0 };
  const businessName = result.businessName || "SiPetto UMKM";

  return (
    <SalesHistoryTable
      initialData={data}
      total={total}
      totalPages={totalPages}
      stats={stats}
      businessName={businessName}
      searchParams={searchParams}
    />
  );
}
