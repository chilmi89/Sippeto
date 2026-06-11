"use client";

import React, { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Wallet, DollarSign, Receipt, Calendar, Info, ChevronDown
} from "lucide-react";
import FullPageLoader from "@/components/layout/FullPageLoader";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  full_name: string | null;
  business_name: string | null;
  email: string;
  is_active: boolean | null;
  username: string | null;
}

interface FinancialSummary {
  totalPendapatan: number;
  totalPengeluaran: number;
  totalSaldo: number;
  netProfit: number;
}

interface ChartData {
  saldo:       { name: string; saldo: number }[];
  pendapatan:  { name: string; pendapatan: number }[];
  pengeluaran: { name: string; pengeluaran: number }[];
  labaRugi:    { name: string; untung: number; rugi: number }[];
}



// ─── Empty chart fallback (12 bulan kosong) ───────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"];

const emptyCharts: ChartData = {
  saldo:       MONTHS.map((name) => ({ name, saldo: 0 })),
  pendapatan:  MONTHS.map((name) => ({ name, pendapatan: 0 })),
  pengeluaran: MONTHS.map((name) => ({ name, pengeluaran: 0 })),
  labaRugi:    MONTHS.map((name) => ({ name, untung: 0, rugi: 0 })),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const formatShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1)}jt`;
  if (Math.abs(v) >= 1_000)     return `Rp ${(v / 1_000).toFixed(0)}rb`;
  return `Rp ${v}`;
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#030037] text-white px-5 py-4 rounded-xl shadow-2xl text-xs font-bold border border-white/10">
      <p className="text-white/40 mb-2 text-[10px] uppercase tracking-widest">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.value < 0 ? "#f43f5e" : (p.color || "#fff") }} className="text-sm font-black">
          {p.name.toUpperCase()}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Chart Card ───────────────────────────────────────────────────────────────

const ChartCard = ({
  title, value, color, data, dataKey, icon, negative = false, isProfitLoss = false,
}: {
  title: string;
  value: string;
  color: string;
  data: any[];
  dataKey: string | string[];
  icon: React.ReactNode;
  negative?: boolean;
  isProfitLoss?: boolean;
}) => {
  const keys     = Array.isArray(dataKey) ? dataKey : [dataKey];
  const allValues = data.flatMap((d) => keys.map((k) => d[k] ?? 0));
  const maxVal    = Math.max(...allValues, 1);

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 shadow-sm flex flex-col h-[280px] sm:h-[340px] hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group relative overflow-hidden">
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-50 text-zinc-400 rounded-2xl group-hover:bg-primary group-hover:text-white transition-all duration-300 shadow-sm shrink-0">
            {icon}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 block mb-1">{title}</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#030037] tracking-tighter leading-none">{value}</h2>
          </div>
        </div>
        <div className={`shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
          negative ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
        } shadow-sm self-end xs:self-center`}>
          {negative ? "Pengeluaran" : "Pemasukan"}
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="gUntung" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gRugi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`g-${keys[0]}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 800 }} axisLine={{ stroke: "#f1f1f4" }} tickLine={false} dy={8} />
            <YAxis domain={[0, maxVal]} tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 800 }} axisLine={{ stroke: "#f1f1f4" }} tickLine={false} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}jt`} width={36} />
            <Tooltip content={<CustomTooltip />} />
            {isProfitLoss ? (
              <>
                <Area type="monotone" dataKey="untung" stroke="#10b981" strokeWidth={2.5} fill="url(#gUntung)" />
                <Area type="monotone" dataKey="rugi"   stroke="#f43f5e" strokeWidth={2.5} fill="url(#gRugi)" />
              </>
            ) : (
              <Area type="monotone" dataKey={keys[0]} stroke={color} strokeWidth={2.5} fill={`url(#g-${keys[0]})`} />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenantDashboard() {
  const router = useRouter();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [summary,  setSummary]  = useState<FinancialSummary | null>(null);
  const [charts,   setCharts]   = useState<ChartData>(emptyCharts);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltering, setIsFiltering] = useState(false);
  // Branch Filter States
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [userBranchId, setUserBranchId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        // Fetch Profile
        const res = await fetch("/api/backend/tenant-umkm");
        if (res.ok) {
          const json = await res.json();
          setProfile(json.profile);
          const currentProfileId = json.profile.id;
          const currentBranchId = json.profile.branch_id;
          setUserBranchId(currentBranchId);
          
          // Fetch Branches
          const branchesRes = await fetch(`/api/backend/branches?tenant_id=${currentProfileId}`);
          if (branchesRes.ok) {
              const branchesJson = await branchesRes.json();
              setBranches(branchesJson.data || []);
          }

          if (currentBranchId) {
              setSelectedBranchId(currentBranchId);
          } else {
              setSelectedBranchId("all");
          }
        }
      } catch (err) {
        console.error("Failed to fetch tenant data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  // Fetch financials and transactions when selected branch changes
  useEffect(() => {
    const fetchFilteredData = async () => {
      if (!profile) return;
      setIsFiltering(true);
      try {
        // Fetch Financials
        const res = await fetch(`/api/backend/tenant-umkm?branch_id=${selectedBranchId}`);
        if (res.ok) {
          const json = await res.json();
          setSummary(json.financials.summary);
          setCharts(json.financials.charts);
        }


      } catch (err) {
        console.error("Failed to fetch filtered data:", err);
      } finally {
        setTimeout(() => {
          setIsFiltering(false);
        }, 200);
      }
    };

    fetchFilteredData();
  }, [profile, selectedBranchId]);

  const displayName = profile?.business_name ?? profile?.full_name ?? "UMKM Anda";

  return (
    <div className="w-full flex flex-col gap-4 py-2 pb-20 px-4 sm:px-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-2">
        <div className="max-w-xl">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-2">
            <div className="w-6 h-1 bg-primary rounded-full" />
            Dashboard Tenant UMKM
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#030037] tracking-tighter leading-[1.1]">
            Selamat Datang, <span className="text-primary">{displayName}</span>
          </h1>
          <p className="text-zinc-500 font-medium text-sm mt-3">
            Laporan grafik performa finansial real-time Anda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start sm:self-center">
          {/* Dropdown Filter Cabang */}
          <div className="relative group">
            <select
              disabled={!!userBranchId}
              className="px-4 py-3.5 bg-white/80 border border-zinc-150 rounded-xl text-xs font-bold text-zinc-950 shadow-sm appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-primary/5 pr-8 disabled:bg-zinc-100 disabled:text-zinc-500"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              <option value="all">Semua Cabang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md px-6 py-4 rounded-xl border border-zinc-100 shadow-sm">
            <div className="flex flex-col items-start sm:items-end gap-1">
              <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-widest leading-none">Saldo Bersih</span>
              <span className={`font-bold text-sm ${(summary?.totalSaldo ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {formatShort(summary?.totalSaldo ?? 0)}
              </span>
            </div>
            <button onClick={() => router.push("/backend/tenant/transactions")} className="ml-2 p-3 bg-primary text-white rounded-xl shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all group">
               <Receipt className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </div>



      {/* Charts 3-col horizontal */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300 ease-in-out ${
        isFiltering ? "opacity-40 blur-[1px] scale-[0.995]" : "opacity-100 blur-0 scale-100"
      }`}>
        <ChartCard title="Pendapatan" value={formatShort(summary?.totalPendapatan ?? 0)} color="#10b981" data={charts.pendapatan} dataKey="pendapatan" icon={<TrendingUp className="w-6 h-6" />} />
        <ChartCard title="Pengeluaran" value={formatShort(summary?.totalPengeluaran ?? 0)} color="#f43f5e" data={charts.pengeluaran} dataKey="pengeluaran" icon={<TrendingDown className="w-6 h-6" />} negative />
        <ChartCard title="laba" value={formatShort(summary?.totalSaldo ?? 0)} color="#3c39d6" data={charts.saldo} dataKey="saldo" icon={<Wallet className="w-6 h-6" />} />
      </div>
    </div>
  );
}