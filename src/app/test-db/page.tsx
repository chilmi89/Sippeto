import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Database,
  RefreshCw,
  Server,
  Terminal,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { testDatabaseConnection } from "./actions";

// Memaksa render dinamis pada setiap request untuk memastikan hasil tes real-time
export const dynamic = "force-dynamic";

interface ConnectionResult {
  status: string;
  message: string;
  data?: unknown;
  error?: string;
  timestamp?: string;
}

export default async function TestDbPage() {
  const startTime = performance.now();
  let result: ConnectionResult;
  try {
    result = await testDatabaseConnection();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    result = {
      status: "error",
      message: "Terjadi kesalahan tidak terduga di Server Component.",
      error: errorMessage,
    };
  }
  const endTime = performance.now();
  const duration = Math.round(endTime - startTime);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300">
      {/* Tombol Kembali */}
      <div className="w-full max-w-2xl mb-6 flex justify-start">
        <Link
          href="/backend/tenant"
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-primary dark:hover:text-emerald-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Dashboard
        </Link>
      </div>

      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden transition-all duration-300">
        {/* Latar Belakang Aksen Emerald */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 dark:bg-emerald-500/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col items-center text-center relative z-10 mb-8">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl mb-4 shadow-inner">
            <Database className="w-8 h-8" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 mb-1">
            Database Utility
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight leading-none">
            Tes Koneksi Database
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 max-w-md">
            Uji responsivitas dan status koneksi Supabase PostgreSQL menggunakan
            Next.js Server Component (Zero Client JS).
          </p>
        </div>

        {/* Tombol Aksi - Navigasi Server-side ke halaman yang sama untuk memicu uji ulang */}
        <div className="flex justify-center mb-8 relative z-10">
          <Link
            href="/test-db"
            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-600/20 dark:shadow-emerald-950/40 hover:scale-105 active:scale-95 transition-all duration-300 font-bold text-sm tracking-wide"
          >
            <RefreshCw className="w-4 h-4" />
            Uji Ulang Koneksi
          </Link>
        </div>

        {/* Status & Hasil */}
        <div className="space-y-6 relative z-10">
          {/* Kartu Status */}
          <div
            className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
              result.status === "success"
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300"
                : "bg-rose-500/5 border-rose-500/20 text-rose-800 dark:text-rose-300"
            }`}
          >
            <div className="shrink-0">
              {result.status === "success" ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <XCircle className="w-8 h-8 text-rose-600 dark:text-rose-400" />
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-extrabold text-sm uppercase tracking-wider mb-1">
                Status: {result.status.toUpperCase()}
              </h4>
              <p className="text-sm font-medium leading-relaxed">
                {result.message}
              </p>
            </div>
          </div>

          {/* Statistik Detail */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Durasi
                </span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  {duration} ms
                </span>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-500">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                  Koneksi
                </span>
                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                  Server Component
                </span>
              </div>
            </div>
          </div>

          {/* Response Payload */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Terminal className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Payload Respons
              </span>
            </div>
            <div className="bg-zinc-950 text-emerald-400 font-mono text-xs p-5 rounded-2xl overflow-x-auto max-h-60 border border-zinc-800/80 shadow-inner">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
