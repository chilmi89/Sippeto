import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Custom autoTable types helper
type AutoTableType = typeof autoTable;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "daily";
    const format = searchParams.get("format") || "excel";
    const selectedBranchId = searchParams.get("branch_id") || "all";

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET || "your-secret-key";
    let decoded: { id: string };
    try {
      decoded = jwt.verify(token, secret) as { id: string };
    } catch {
      return NextResponse.json({ error: "Token tidak valid" }, { status: 401 });
    }

    const profileId = decoded.id;

    // 1. Ambil profile
    const profile = await prisma.profiles.findUnique({
      where: { id: profileId },
      select: {
        id: true,
        full_name: true,
        business_name: true,
        email: true,
        branch_id: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    }

    // Tentukan tenantOwnerId
    let tenantOwnerId = profile.id;
    let forcedBranchId = selectedBranchId;

    if (profile.branch_id) {
      const branch = await prisma.branches.findUnique({
        where: { id: profile.branch_id },
        select: { tenant_id: true },
      });
      if (branch) {
        tenantOwnerId = branch.tenant_id;
      }
      forcedBranchId = profile.branch_id;
    }

    // Get Branch Name
    let branchName = "Semua Cabang";
    if (forcedBranchId && forcedBranchId !== "all") {
      const branchObj = await prisma.branches.findUnique({
        where: { id: forcedBranchId },
        select: { name: true },
      });
      if (branchObj) {
        branchName = branchObj.name;
      }
    }

    const activeBranchId = profile.branch_id ? forcedBranchId : selectedBranchId;

    const txWhere = {
      profile_id: tenantOwnerId,
    } as {
      profile_id: string;
      branch_id?: string;
    };

    if (activeBranchId && activeBranchId !== "all") {
      txWhere.branch_id = activeBranchId;
    }

    // Fetch transactions
    const transactions = await prisma.transaction_groups.findMany({
      where: txWhere,
      orderBy: { transaction_date: "asc" },
      select: {
        transaction_date: true,
        total_income: true,
        total_expense: true,
        net_balance: true,
      },
    });

    // Grouping
    const groupedData: Record<
      string,
      {
        period: string;
        total_income: number;
        total_expense: number;
        net_balance: number;
      }
    > = {};

    const getPeriodKey = (date: Date, type: string) => {
      const d = new Date(date);
      const year = d.getFullYear();
      if (type === "daily") {
        return d.toISOString().split("T")[0];
      } else if (type === "weekly") {
        const firstDayOfYear = new Date(year, 0, 1);
        const pastDaysOfYear = (d.getTime() - firstDayOfYear.getTime()) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${year}-W${weekNum.toString().padStart(2, "0")}`;
      } else if (type === "monthly") {
        return `${year}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      } else if (type === "yearly") {
        return `${year}`;
      }
      return d.toISOString().split("T")[0];
    };

    const today = new Date();
    if (type === "daily") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const period = getPeriodKey(d, type);
        groupedData[period] = { period, total_income: 0, total_expense: 0, net_balance: 0 };
      }
    } else if (type === "weekly") {
      for (let i = 4; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i * 7);
        const period = getPeriodKey(d, type);
        groupedData[period] = { period, total_income: 0, total_expense: 0, net_balance: 0 };
      }
    } else if (type === "monthly") {
      for (let i = 0; i < 12; i++) {
        const d = new Date(today.getFullYear(), i, 1);
        const period = getPeriodKey(d, type);
        groupedData[period] = { period, total_income: 0, total_expense: 0, net_balance: 0 };
      }
    } else if (type === "yearly") {
      for (let i = 4; i >= 0; i--) {
        const d = new Date(today.getFullYear() - i, 0, 1);
        const period = getPeriodKey(d, type);
        groupedData[period] = { period, total_income: 0, total_expense: 0, net_balance: 0 };
      }
    }

    const summary = {
      total_income: 0,
      total_expense: 0,
      net_balance: 0,
    };

    for (const tx of transactions) {
      if (!tx.transaction_date) continue;
      const period = getPeriodKey(tx.transaction_date, type);
      if (!groupedData[period]) {
        groupedData[period] = { period, total_income: 0, total_expense: 0, net_balance: 0 };
      }

      const income = Number(tx.total_income || 0);
      const expense = Number(tx.total_expense || 0);
      const net = Number(tx.net_balance || 0);

      groupedData[period].total_income += income;
      groupedData[period].total_expense += expense;
      groupedData[period].net_balance += net;

      summary.total_income += income;
      summary.total_expense += expense;
      summary.net_balance += net;
    }

    const reportData = Object.values(groupedData).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    const titleMap: Record<string, string> = {
      daily: "Laporan Penjualan Harian",
      weekly: "Laporan Penjualan Mingguan",
      monthly: "Laporan Penjualan Bulanan",
      yearly: "Laporan Penjualan Tahunan",
    };
    const title = titleMap[type] || "Laporan Penjualan";

    if (format === "excel") {
      const sheetData = reportData.map((row) => ({
        Periode: row.period,
        "Total Pemasukan": row.total_income,
        "Total Pengeluaran": row.total_expense,
        "Saldo Bersih": row.net_balance,
      }));

      sheetData.push({
        Periode: "TOTAL",
        "Total Pemasukan": summary.total_income,
        "Total Pengeluaran": summary.total_expense,
        "Saldo Bersih": summary.net_balance,
      });

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Penjualan");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const fileName = `Laporan_${type}_${branchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;

      return new Response(buffer, {
        headers: {
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    } else if (format === "pdf") {
      // PDF generation server-side
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(title, 14, 22);
      doc.setFontSize(11);
      doc.text(`Tipe Laporan: ${type.toUpperCase()}`, 14, 30);
      doc.text(`Cabang: ${branchName}`, 14, 36);
      doc.text(`Dicetak pada: ${new Date().toLocaleDateString("id-ID")}`, 14, 42);

      const tableColumn = ["Periode", "Total Pemasukan", "Total Pengeluaran", "Saldo Bersih"];
      const tableRows = reportData.map((row) => [
        row.period,
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.total_income),
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.total_expense),
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.net_balance),
      ]);

      tableRows.push([
        "TOTAL",
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(summary.total_income),
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(summary.total_expense),
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(summary.net_balance),
      ]);

      (autoTable as unknown as AutoTableType)(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 48,
        theme: "grid",
        styles: { fontSize: 10 },
        headStyles: { fillColor: [3, 0, 55] },
      });

      const pdfOutput = doc.output("arraybuffer");
      const fileName = `Laporan_${type}_${branchName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;

      return new Response(pdfOutput, {
        headers: {
          "Content-Disposition": `attachment; filename="${fileName}"`,
          "Content-Type": "application/pdf",
        },
      });
    }

    return NextResponse.json({ error: "Format tidak didukung" }, { status: 400 });
  } catch (error) {
    console.error("Server Export Error:", error);
    return NextResponse.json({ error: "Gagal mengekspor laporan" }, { status: 500 });
  }
}
