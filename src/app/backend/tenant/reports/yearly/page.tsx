import {
  ArrowLeft,
  CalendarRange,
  FileSpreadsheet,
  FileText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { getYearlyReportData } from "./actions";
import BranchReportFilter from "@/components/dashboard/BranchReportFilter";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ branch_id?: string }>;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);

export default async function YearlyReportPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const selectedBranchId = params.branch_id || "all";

  const reportResult = await getYearlyReportData(selectedBranchId);

  if (reportResult.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full mb-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Gagal Memuat Laporan
        </h3>
        <p className="text-sm text-zinc-500 mt-2 max-w-sm">
          {reportResult.message ||
            "Terjadi kesalahan saat mengambil data laporan."}
        </p>
      </div>
    );
  }

  const { branches, userBranchId, data, summary } = reportResult as {
    branches: Array<{ id: string; name: string }>;
    userBranchId: string | null;
    data: Array<{
      period: string;
      total_income: number;
      total_expense: number;
      net_balance: number;
    }>;
    summary: {
      total_income: number;
      total_expense: number;
      net_balance: number;
    };
  };

  const title = "Laporan Penjualan Tahunan";

  // ─── SVG Chart Logic (Server-side rendering) ────────────────
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.total_income, d.total_expense)),
    100000,
  );

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / maxVal) * chartHeight;
  };

  // Build SVG paths for Income
  let incomeLine = "";
  let incomeArea = "";
  data.forEach((d, i) => {
    const x = getX(i);
    const y = getY(d.total_income);
    if (i === 0) {
      incomeLine = `M ${x} ${y}`;
      incomeArea = `M ${x} ${paddingTop + chartHeight} L ${x} ${y}`;
    } else {
      incomeLine += ` L ${x} ${y}`;
      incomeArea += ` L ${x} ${y}`;
    }
    if (i === data.length - 1) {
      incomeArea += ` L ${x} ${paddingTop + chartHeight} Z`;
    }
  });

  // Build SVG paths for Expense
  let expenseLine = "";
  let expenseArea = "";
  data.forEach((d, i) => {
    const x = getX(i);
    const y = getY(d.total_expense);
    if (i === 0) {
      expenseLine = `M ${x} ${y}`;
      expenseArea = `M ${x} ${paddingTop + chartHeight} L ${x} ${y}`;
    } else {
      expenseLine += ` L ${x} ${y}`;
      expenseArea += ` L ${x} ${y}`;
    }
    if (i === data.length - 1) {
      expenseArea += ` L ${x} ${paddingTop + chartHeight} Z`;
    }
  });

  const gridLinesY = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="w-full flex flex-col gap-4 py-2 pb-20 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 py-2">
        <div className="max-w-xl">
          <Link
            href="/backend/tenant"
            className="inline-flex items-center gap-2 text-zinc-400 hover:text-primary font-bold uppercase tracking-[0.2em] text-[10px] mb-3 transition-colors group cursor-pointer border-0 bg-transparent p-0 outline-none"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#030037] tracking-tighter leading-[1.1]">
            {title}
          </h1>
          <p className="text-zinc-500 font-medium text-sm mt-3">
            Analisis data penjualan tahunan dan aktivitas finansial Anda secara
            komprehensif (SSR Premium).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/80 backdrop-blur-md px-5 py-3.5 rounded-2xl border border-zinc-100 shadow-sm self-start sm:self-center">
          {/* Format Info */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-zinc-50 text-zinc-400 rounded-xl">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest leading-none block mb-0.5">
                Format
              </span>
              <h2 className="text-sm font-black text-[#030037] leading-none capitalize">
                Yearly
              </h2>
            </div>
          </div>

          <div className="hidden sm:block w-px h-8 bg-zinc-200/80 sm:mx-1" />

          {/* Filter Cabang Dropdown */}
          <BranchReportFilter
            branches={branches}
            selectedBranchId={selectedBranchId}
            userBranchId={userBranchId}
          />

          <div className="hidden sm:block w-px h-8 bg-zinc-200/80 sm:mx-1" />

          {/* Export Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[9px] font-bold uppercase text-zinc-400 tracking-widest leading-none shrink-0">
              Unduh:
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={`/api/backend/reports/export?type=yearly&format=excel&branch_id=${selectedBranchId}`}
                className="flex items-center gap-1.5 p-2.5 px-3.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all font-bold text-xs shadow-sm hover:shadow-md hover:shadow-emerald-500/10 active:scale-95 cursor-pointer"
                title="Unduh Laporan Excel (Server-side)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </Link>
              <Link
                href={`/api/backend/reports/export?type=yearly&format=pdf&branch_id=${selectedBranchId}`}
                className="flex items-center gap-1.5 p-2.5 px-3.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl transition-all font-bold text-xs shadow-sm hover:shadow-md hover:shadow-rose-500/10 active:scale-95 cursor-pointer"
                title="Unduh Laporan PDF (Server-side)"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Income */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-24 h-24 text-emerald-500" />
          </div>
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-emerald-50 text-emerald-500 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Total Pemasukan
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-[#030037]">
              {formatCurrency(summary.total_income)}
            </h3>
          </div>
        </div>

        {/* Total Expense */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <TrendingDown className="w-24 h-24 text-rose-500" />
          </div>
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-rose-50 text-rose-500 rounded-xl">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Total Pengeluaran
            </span>
          </div>
          <div className="relative z-10">
            <h3 className="text-3xl font-bold text-[#030037]">
              {formatCurrency(summary.total_expense)}
            </h3>
          </div>
        </div>

        {/* Net Balance */}
        <div className="bg-white rounded-2xl border border-zinc-100 p-6 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
            <Wallet className="w-24 h-24 text-primary" />
          </div>
          <div className="relative z-10 flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-primary/10 text-primary rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              Saldo Bersih
            </span>
          </div>
          <div className="relative z-10">
            <h3
              className={`text-3xl font-bold ${
                summary.net_balance < 0 ? "text-rose-500" : "text-primary"
              }`}
            >
              {formatCurrency(summary.net_balance)}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <div className="bg-white rounded-2xl border border-zinc-100 p-6 sm:p-8 shadow-sm flex flex-col mt-2">
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <h3 className="text-xl font-bold text-[#030037] tracking-tight">
              Kinerja Arus Kas
            </h3>
            <p className="text-xs text-zinc-400 font-medium">
              Perbandingan pemasukan dan pengeluaran tahunan (Server-rendered SVG)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                Pemasukan
              </span>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase">
                Pengeluaran
              </span>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[760px] h-[280px]">
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="overflow-visible"
              role="img"
              aria-label="Grafik Kinerja Arus Kas Tahunan"
            >
              <title>Grafik Kinerja Arus Kas Tahunan</title>
              <defs>
                <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* Gridlines Horizontal Y */}
              {gridLinesY.map((ratio) => {
                const y = paddingTop + chartHeight * (1 - ratio);
                const val = formatCurrency(Math.round(maxVal * ratio));
                return (
                  <g key={ratio} className="opacity-40">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={svgWidth - paddingRight}
                      y2={y}
                      stroke="#f1f1f4"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={paddingLeft - 10}
                      y={y + 4}
                      fill="#a1a1aa"
                      fontSize="9"
                      fontWeight="800"
                      textAnchor="end"
                    >
                      {val.replace(/Rp\s?/, "")}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Border */}
              <line
                x1={paddingLeft}
                y1={paddingTop + chartHeight}
                x2={svgWidth - paddingRight}
                y2={paddingTop + chartHeight}
                stroke="#f1f1f4"
                strokeWidth="1.5"
              />

              {/* Area & Line Pemasukan */}
              {incomeArea && (
                <path d={incomeArea} fill="url(#gIncome)" opacity="0.85" />
              )}
              {incomeLine && (
                <path
                  d={incomeLine}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Area & Line Pengeluaran */}
              {expenseArea && (
                <path d={expenseArea} fill="url(#gExpense)" opacity="0.85" />
              )}
              {expenseLine && (
                <path
                  d={expenseLine}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* X Axis Labels & Dots */}
              {data.map((d, i) => {
                const x = getX(i);
                const yIncome = getY(d.total_income);
                const yExpense = getY(d.total_expense);

                const label = d.period;

                return (
                  <g key={d.period}>
                    <line
                      x1={x}
                      y1={paddingTop}
                      x2={x}
                      y2={paddingTop + chartHeight}
                      stroke="#f1f1f4"
                      strokeWidth="0.5"
                      strokeDasharray="2 2"
                    />

                    <text
                      x={x}
                      y={paddingTop + chartHeight + 18}
                      fill="#a1a1aa"
                      fontSize="9"
                      fontWeight="800"
                      textAnchor="middle"
                    >
                      {label}
                    </text>

                    <circle
                      cx={x}
                      cy={yIncome}
                      r="4"
                      fill="#fff"
                      stroke="#10b981"
                      strokeWidth="2"
                    />

                    <circle
                      cx={x}
                      cy={yExpense}
                      r="4"
                      fill="#fff"
                      stroke="#f43f5e"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Rincian Data Table */}
      <div className="bg-white rounded-2xl border border-zinc-100 overflow-hidden shadow-sm mt-2">
        <div className="p-6 border-b border-zinc-100">
          <h3 className="text-lg font-bold text-[#030037] tracking-tight">
            Rincian Per Periode
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-50">
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-1/4">
                  Periode (Yearly)
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-1/4">
                  Pemasukan
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-1/4">
                  Pengeluaran
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-zinc-400 uppercase tracking-widest w-1/4">
                  Saldo Bersih
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {data.length > 0 ? (
                data.map((row) => (
                  <tr
                    key={row.period}
                    className="hover:bg-zinc-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-[#030037]">
                        {row.period}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-emerald-600">
                      {formatCurrency(row.total_income)}
                    </td>
                    <td className="px-6 py-4 text-xs font-black text-rose-600">
                      {formatCurrency(row.total_expense)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                      className={`text-[11px] font-bold px-2 py-1 rounded-md ${
                        row.net_balance >= 0
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-rose-50 text-rose-600"
                      }`}
                      >
                        {formatCurrency(row.net_balance)}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-zinc-400 text-xs font-medium italic"
                  >
                    Tidak ada data penjualan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
