"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

interface BranchReportFilterProps {
  branches: Array<{ id: string; name: string }>;
  selectedBranchId: string;
  userBranchId: string | null;
}

export default function BranchReportFilter({ branches, selectedBranchId, userBranchId }: BranchReportFilterProps) {
  const router = useRouter();

  return (
    <div className="relative group shrink-0 w-full sm:w-auto">
      <select
        disabled={!!userBranchId}
        className="w-full sm:w-auto min-w-[170px] pl-4 pr-10 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-black appearance-none cursor-pointer focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all duration-200 disabled:bg-zinc-100 disabled:text-zinc-500"
        value={selectedBranchId}
        onChange={(e) => {
          router.push(`?branch_id=${e.target.value}`);
        }}
      >
        {!userBranchId && <option value="all">Semua Cabang</option>}
        {branches.map((b) => (
          <option key={b.id} value={b.id} className="text-black">
            {b.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none group-focus-within:text-primary transition-colors" />
    </div>
  );
}
