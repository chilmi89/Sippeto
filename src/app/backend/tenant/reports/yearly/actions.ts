"use server";

import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function getYearlyReportData(selectedBranchId = "all") {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return { status: "error", message: "Tidak terautentikasi" };
    }

    const secret = process.env.JWT_SECRET || "your-secret-key";
    let decoded: { id: string };
    try {
      decoded = jwt.verify(token, secret) as { id: string };
    } catch {
      return { status: "error", message: "Token tidak valid" };
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
      return { status: "error", message: "Profil tidak ditemukan" };
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

    // 2. Fetch Branches
    let branches = await prisma.branches.findMany({
      where: { tenant_id: tenantOwnerId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    });

    if (branches.length === 0) {
      const newBranch = await prisma.branches.create({
        data: {
          tenant_id: tenantOwnerId,
          name: "Pusat",
          is_active: true,
        },
      });
      branches = [{ id: newBranch.id, name: newBranch.name }];
    }

    // 3. Tentukan branch ID yang akan difilter
    const activeBranchId = profile.branch_id
      ? forcedBranchId
      : selectedBranchId;

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

    // Grouping untuk "yearly"
    const groupedData: Record<
      string,
      {
        period: string;
        total_income: number;
        total_expense: number;
        net_balance: number;
      }
    > = {};

    const getPeriodKey = (date: Date) => {
      const d = new Date(date);
      return `${d.getFullYear()}`;
    };

    const today = new Date();
    // Pre-fill 5 tahun terakhir
    for (let i = 4; i >= 0; i--) {
      const d = new Date(today.getFullYear() - i, 0, 1);
      const period = getPeriodKey(d);
      groupedData[period] = {
        period,
        total_income: 0,
        total_expense: 0,
        net_balance: 0,
      };
    }

    const summary = {
      total_income: 0,
      total_expense: 0,
      net_balance: 0,
    };

    for (const tx of transactions) {
      if (!tx.transaction_date) continue;

      const period = getPeriodKey(tx.transaction_date);

      if (!groupedData[period]) {
        groupedData[period] = {
          period,
          total_income: 0,
          total_expense: 0,
          net_balance: 0,
        };
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

    const data = Object.values(groupedData).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    return {
      status: "success",
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        business_name: profile.business_name,
        email: profile.email,
        branch_id: profile.branch_id,
        tenant_owner_id: tenantOwnerId,
      },
      branches,
      selectedBranchId: activeBranchId,
      userBranchId: profile.branch_id,
      data,
      summary,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load report data";
    console.error("Server Action getYearlyReportData Error:", error);
    return {
      status: "error",
      message: errorMessage,
    };
  }
}
