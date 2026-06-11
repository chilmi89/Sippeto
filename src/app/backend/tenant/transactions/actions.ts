"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { revalidatePath } from "next/cache";

const DEFAULT_CATEGORIES = [
  { name: "Penjualan Produk", type: "INCOME" },
  { name: "Jasa / Layanan", type: "INCOME" },
  { name: "Lain-lain (Masuk)", type: "INCOME" },
  { name: "Operasional Toko", type: "EXPENSE" },
  { name: "Gaji Karyawan", type: "EXPENSE" },
  { name: "Biaya Bahan Baku", type: "EXPENSE" },
  { name: "Lain-lain (Keluar)", type: "EXPENSE" },
];

const DEFAULT_PAYMENTS = [
  { name: "Tunai / Cash" },
  { name: "Transfer Bank" },
  { name: "E-Wallet (OVO/Dana)" },
];

// Helper: decode JWT & get profile_id
async function getProfileId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const secret = process.env.JWT_SECRET || "your-secret-key";
    const decoded = jwt.verify(token, secret) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

// 1. Fetch all transactions page data on the Server
export async function getTransactionPageData(editId?: string | null) {
  try {
    const profile_id = await getProfileId();
    if (!profile_id) {
      return { status: "error", message: "Tidak terautentikasi" };
    }

    // Ambil profile
    const profile = await prisma.profiles.findUnique({
      where: { id: profile_id },
      select: {
        id: true,
        full_name: true,
        business_name: true,
        email: true,
        phone_number: true,
        address: true,
        avatar_url: true,
        bio: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        branch_id: true,
        username: true,
        roles: {
          select: { name: true }
        }
      },
    });

    if (!profile) {
      return { status: "error", message: "Profil tidak ditemukan" };
    }

    // Tentukan tenantOwnerId (ID Owner Utama)
    let tenantOwnerId = profile.id;
    if (profile.branch_id) {
      const branch = await prisma.branches.findUnique({
        where: { id: profile.branch_id },
        select: { tenant_id: true }
      });
      if (branch) {
        tenantOwnerId = branch.tenant_id;
      }
    }

    // Seed Categories & Payment Methods jika kosong
    const catCheck = await prisma.categories.count({ where: { profile_id: tenantOwnerId } });
    if (catCheck === 0) {
      await prisma.categories.createMany({
        data: DEFAULT_CATEGORIES.map(cat => ({
          name: cat.name,
          type: cat.type,
          profile_id: tenantOwnerId
        }))
      });
    }

    const payCheck = await prisma.payment_methods.count({ where: { profile_id: tenantOwnerId } });
    if (payCheck === 0) {
      await prisma.payment_methods.createMany({
        data: DEFAULT_PAYMENTS.map(pay => ({
          name: pay.name,
          profile_id: tenantOwnerId
        }))
      });
    }

    // Ambil Master Data
    const [categories, paymentMethods, branches] = await Promise.all([
      prisma.categories.findMany({
        where: { profile_id: tenantOwnerId },
        orderBy: { name: "asc" }
      }),
      prisma.payment_methods.findMany({
        where: { profile_id: tenantOwnerId },
        orderBy: { name: "asc" }
      }),
      prisma.branches.findMany({
        where: { tenant_id: tenantOwnerId },
        orderBy: { name: "asc" }
      })
    ]);

    // Jika Mode Edit, ambil data transaksi
    let editTransaction = null;
    if (editId) {
      const tx = await prisma.transaction_groups.findUnique({
        where: { id: editId },
        include: {
          transaction_items: {
            include: {
              categories: true,
              payment_methods: true
            }
          }
        }
      });
      if (tx) {
        editTransaction = {
          id: tx.id,
          reference_number: tx.reference_number,
          transaction_date: tx.transaction_date,
          description: tx.description,
          customer_name: tx.customer_name,
          customer_phone: tx.customer_phone,
          customer_address: tx.customer_address,
          order_status: tx.order_status,
          branch_id: tx.branch_id,
          items: tx.transaction_items.map(it => ({
            id: it.id,
            name: it.name,
            amount: Number(it.amount),
            category_id: it.category_id,
            payment_method_id: it.payment_method_id,
            type: it.type === "INCOME" ? "pemasukan" : "pengeluaran"
          }))
        };
      }
    }

    // Ambil 5 transaksi terbaru untuk cabang aktif
    const initialBranchId = profile.branch_id || (branches[0]?.id || "");
    const recentWhere: any = {
      profile_id: tenantOwnerId,
    };
    if (initialBranchId) {
      recentWhere.branch_id = initialBranchId;
    }

    const recentTx = await prisma.transaction_groups.findMany({
      where: recentWhere,
      orderBy: { transaction_date: "desc" },
      take: 5,
      select: {
        id: true,
        reference_number: true,
        transaction_date: true,
        total_income: true,
        total_expense: true,
        net_balance: true
      }
    });

    return {
      status: "success",
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        business_name: profile.business_name,
        email: profile.email,
        phone_number: profile.phone_number,
        address: profile.address,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        branch_id: profile.branch_id,
        userBranchId: profile.branch_id,
        userRole: profile.roles?.name || "",
        tenant_owner_id: tenantOwnerId
      },
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type === "INCOME" ? "pemasukan" : "pengeluaran"
      })),
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.id,
        name: pm.name
      })),
      branches: branches.map(b => ({
        id: b.id,
        name: b.name
      })),
      editTransaction,
      recentTransactions: recentTx.map(tx => ({
        id: tx.id,
        reference_number: tx.reference_number,
        transaction_date: tx.transaction_date,
        total_income: Number(tx.total_income || 0),
        total_expense: Number(tx.total_expense || 0),
        net_balance: Number(tx.net_balance || 0)
      })),
      initialBranchId
    };

  } catch (error) {
    console.error("getTransactionPageData error:", error);
    return { status: "error", message: "Gagal memuat data transaksi" };
  }
}

// 2. Fetch recent transactions for a branch
export async function getRecentTransactionsAction(tenantOwnerId: string, branchId?: string) {
  try {
    const recentWhere: any = {
      profile_id: tenantOwnerId,
    };
    if (branchId) {
      recentWhere.branch_id = branchId;
    }

    const recentTx = await prisma.transaction_groups.findMany({
      where: recentWhere,
      orderBy: { transaction_date: "desc" },
      take: 5,
      select: {
        id: true,
        reference_number: true,
        transaction_date: true,
        total_income: true,
        total_expense: true,
        net_balance: true
      }
    });

    return {
      status: "success",
      data: recentTx.map(tx => ({
        id: tx.id,
        reference_number: tx.reference_number,
        transaction_date: tx.transaction_date,
        total_income: Number(tx.total_income || 0),
        total_expense: Number(tx.total_expense || 0),
        net_balance: Number(tx.net_balance || 0)
      }))
    };
  } catch (error) {
    console.error("getRecentTransactionsAction error:", error);
    return { status: "error", message: "Gagal memuat data transaksi terbaru" };
  }
}

// 3. Save or Update transaction
export async function saveTransactionAction(payload: {
  editId?: string | null;
  profile_id: string;
  branch_id: string | null;
  reference_number: string;
  transaction_date: string;
  description: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  order_status?: number;
  items: Array<{
    name: string;
    amount: number;
    category_id: string;
    payment_method_id: string;
    type: "pemasukan" | "pengeluaran";
  }>;
}) {
  try {
    const {
      editId,
      profile_id,
      branch_id,
      reference_number,
      transaction_date,
      description,
      customer_name,
      customer_phone,
      customer_address,
      order_status,
      items
    } = payload;

    if (!profile_id) {
      return { status: "error", message: "Profile ID wajib disertakan" };
    }

    const mapType = (t: string) => {
      const low = t.toLowerCase();
      if (low === "pemasukan" || low === "income") return "INCOME";
      if (low === "pengeluaran" || low === "expense") return "EXPENSE";
      return t.toUpperCase();
    };

    let total_income = 0;
    let total_expense = 0;

    items.forEach((item) => {
      const amount = Number(item.amount || 0);
      const mappedType = mapType(item.type);
      if (mappedType === "INCOME") total_income += amount;
      if (mappedType === "EXPENSE") total_expense += amount;
    });

    const net_balance = total_income - total_expense;
    const resolvedStatus = order_status !== undefined ? Number(order_status) : 6;

    if (editId) {
      // UPDATE TRANSACTION
      await prisma.$transaction(async (tx) => {
        const existingGroup = await tx.transaction_groups.findUnique({
          where: { id: editId },
          include: { transaction_items: true }
        });

        if (!existingGroup) {
          throw new Error("Transaksi tidak ditemukan");
        }

        // Revert old stock if old status was 6 and has branch
        if (existingGroup.order_status === 6 && existingGroup.branch_id) {
          for (const item of existingGroup.transaction_items) {
            if (item.product_id) {
              const qty = item.quantity ? Number(item.quantity) : 1;
              await tx.product_stocks.updateMany({
                where: {
                  product_id: item.product_id,
                  branch_id: existingGroup.branch_id
                },
                data: { stock: { increment: qty } }
              });
              await tx.stock_mutations.create({
                data: {
                  product_id: item.product_id,
                  from_branch_id: null,
                  to_branch_id: existingGroup.branch_id,
                  quantity: qty,
                  type: "ADJUSTMENT",
                  notes: `Koreksi Reversal Edit POS - Nota #${existingGroup.reference_number || existingGroup.id.slice(0, 8)}`
                }
              });
            }
          }
        }

        // Delete old items
        await tx.transaction_items.deleteMany({ where: { group_id: editId } });

        // Update Group and Create new items
        await tx.transaction_groups.update({
          where: { id: editId },
          data: {
            branch_id: branch_id || null,
            reference_number,
            transaction_date: transaction_date ? new Date(transaction_date) : undefined,
            description,
            total_income,
            total_expense,
            net_balance,
            customer_name: customer_name ?? null,
            customer_phone: customer_phone ?? null,
            customer_address: customer_address ?? null,
            order_status: resolvedStatus,
            transaction_items: {
              create: items.map((item) => ({
                category_id: item.category_id,
                payment_method_id: item.payment_method_id,
                type: mapType(item.type),
                name: item.name,
                amount: item.amount,
                quantity: 1
              }))
            }
          }
        });
      });
    } else {
      // CREATE TRANSACTION
      await prisma.$transaction(async (tx) => {
        await tx.transaction_groups.create({
          data: {
            profile_id,
            branch_id: branch_id || null,
            reference_number,
            transaction_date: transaction_date ? new Date(transaction_date) : undefined,
            description,
            total_income,
            total_expense,
            net_balance,
            customer_name: customer_name ?? null,
            customer_phone: customer_phone ?? null,
            customer_address: customer_address ?? null,
            order_status: resolvedStatus,
            transaction_items: {
              create: items.map((item) => ({
                category_id: item.category_id,
                payment_method_id: item.payment_method_id,
                type: mapType(item.type),
                name: item.name,
                amount: item.amount,
                quantity: 1
              }))
            }
          }
        });
      });
    }

    revalidatePath("/backend/tenant/transactions");
    revalidatePath("/backend/tenant/transactions/history");
    return { status: "success" };

  } catch (error) {
    console.error("saveTransactionAction error:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Gagal menyimpan transaksi" };
  }
}

// 4. Delete Transaction Action
export async function deleteTransactionAction(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const existingGroup = await tx.transaction_groups.findUnique({
        where: { id },
        include: { transaction_items: true }
      });

      if (existingGroup) {
        // Revert stock if status was Selesai/Lunas (6)
        if (existingGroup.order_status === 6 && existingGroup.branch_id) {
          for (const item of existingGroup.transaction_items) {
            if (item.product_id) {
              const qty = item.quantity ? Number(item.quantity) : 1;
              await tx.product_stocks.updateMany({
                where: {
                  product_id: item.product_id,
                  branch_id: existingGroup.branch_id
                },
                data: { stock: { increment: qty } }
              });
              await tx.stock_mutations.create({
                data: {
                  product_id: item.product_id,
                  from_branch_id: null,
                  to_branch_id: existingGroup.branch_id,
                  quantity: qty,
                  type: "ADJUSTMENT",
                  notes: `Reversal Hapus Transaksi - Nota #${existingGroup.reference_number || existingGroup.id.slice(0, 8)}`
                }
              });
            }
          }
        }

        await tx.transaction_groups.delete({
          where: { id }
        });
      }
    });

    revalidatePath("/backend/tenant/transactions");
    revalidatePath("/backend/tenant/transactions/history");
    return { status: "success" };
  } catch (error) {
    console.error("deleteTransactionAction error:", error);
    return { status: "error", message: "Gagal menghapus transaksi" };
  }
}

// 5. Fetch history transactions page data
export async function getHistoryPageData(payload: {
  search?: string;
  dateStart?: string;
  dateEnd?: string;
  page?: number;
  limit?: number;
}) {
  try {
    const profile_id = await getProfileId();
    if (!profile_id) {
      return { status: "error", message: "Tidak terautentikasi" };
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: profile_id },
      select: {
        id: true,
        full_name: true,
        business_name: true,
        email: true,
        phone_number: true,
        address: true,
        avatar_url: true,
        bio: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        branch_id: true,
        username: true,
        roles: { select: { name: true } }
      }
    });

    if (!profile) {
      return { status: "error", message: "Profil tidak ditemukan" };
    }

    let tenantOwnerId = profile.id;
    if (profile.branch_id) {
      const branch = await prisma.branches.findUnique({
        where: { id: profile.branch_id },
        select: { tenant_id: true }
      });
      if (branch) {
        tenantOwnerId = branch.tenant_id;
      }
    }

    const search = payload.search || undefined;
    const date_start = payload.dateStart || undefined;
    const date_end = payload.dateEnd || undefined;
    const page = Math.max(1, Number(payload.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(payload.limit ?? 10)));

    const where: any = {
      profile_id: tenantOwnerId,
      ...(search && { reference_number: { contains: search, mode: "insensitive" } }),
      ...((date_start || date_end) && {
        transaction_date: {
          ...(date_start && { gte: new Date(date_start) }),
          ...(date_end && { lte: new Date(date_end) }),
        }
      })
    };

    const [total, data, branches] = await Promise.all([
      prisma.transaction_groups.count({ where }),
      prisma.transaction_groups.findMany({
        where,
        orderBy: { transaction_date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          transaction_items: {
            include: {
              categories: true,
              payment_methods: true
            }
          }
        }
      }),
      prisma.branches.findMany({
        where: { tenant_id: tenantOwnerId },
        orderBy: { name: "asc" }
      })
    ]);

    // Aggregate stats (total_income and total_expense) for the filtered search criteria (over all records, not just active page)
    const statsResult = await prisma.transaction_groups.aggregate({
      where,
      _sum: {
        total_income: true,
        total_expense: true,
        net_balance: true
      }
    });

    const totalIncome = Number(statsResult._sum.total_income || 0);
    const totalExpense = Number(statsResult._sum.total_expense || 0);
    const netBalance = Number(statsResult._sum.net_balance || 0);

    return {
      status: "success",
      profile: {
        id: profile.id,
        full_name: profile.full_name,
        business_name: profile.business_name,
        email: profile.email,
        phone_number: profile.phone_number,
        address: profile.address,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
        branch_id: profile.branch_id,
        userRole: profile.roles?.name || "",
        tenant_owner_id: tenantOwnerId
      },
      data: data.map(tx => ({
        id: tx.id,
        reference_number: tx.reference_number,
        transaction_date: tx.transaction_date ? tx.transaction_date.toISOString() : new Date().toISOString(),
        total_income: Number(tx.total_income || 0),
        total_expense: Number(tx.total_expense || 0),
        net_balance: Number(tx.net_balance || 0),
        description: tx.description,
        created_at: tx.created_at ? tx.created_at.toISOString() : new Date().toISOString(),
        customer_name: tx.customer_name,
        customer_phone: tx.customer_phone,
        customer_address: tx.customer_address,
        order_status: tx.order_status,
        transaction_items: tx.transaction_items.map(it => ({
          id: it.id,
          name: it.name,
          amount: Number(it.amount),
          type: it.type,
          quantity: it.quantity ? Number(it.quantity) : 1,
          product_id: it.product_id,
          categories: it.categories ? { name: it.categories.name } : null
        }))
      })),
      total,
      totalPages: Math.ceil(total / limit),
      branches: branches.map(b => ({ id: b.id, name: b.name })),
      stats: {
        totalIncome,
        totalExpense,
        netBalance
      }
    };
  } catch (error) {
    console.error("getHistoryPageData error:", error);
    return { status: "error", message: "Gagal memuat riwayat transaksi" };
  }
}

// 6. Change Transaction Status Action
export async function changeTransactionStatusAction(id: string, newStatus: number) {
  try {
    const profile_id = await getProfileId();
    if (!profile_id) {
      return { status: "error", message: "Tidak terautentikasi" };
    }

    const resolvedStatus = Number(newStatus);
    let isTransitioningFromSuccess = false;
    let isTransitioningToSuccess = false;
    let targetBranchId: string | null = null;

    await prisma.$transaction(async (tx) => {
      const existingGroup = await tx.transaction_groups.findUnique({
        where: { id },
        include: { transaction_items: true }
      });

      if (!existingGroup) {
        throw new Error("Transaksi tidak ditemukan");
      }

      targetBranchId = existingGroup.branch_id;
      if (existingGroup.order_status === 6 && resolvedStatus !== 6) {
        isTransitioningFromSuccess = true;
      } else if (existingGroup.order_status !== 6 && resolvedStatus === 6) {
        isTransitioningToSuccess = true;
      }

      const group = await tx.transaction_groups.update({
        where: { id },
        data: { order_status: resolvedStatus },
        include: { transaction_items: true }
      });

      // Revert stock if transitioning FROM success
      if (isTransitioningFromSuccess && targetBranchId) {
        for (const item of existingGroup.transaction_items) {
          if (item.product_id) {
            const qty = item.quantity ? Number(item.quantity) : 1;
            await tx.product_stocks.updateMany({
              where: { product_id: item.product_id, branch_id: targetBranchId },
              data: { stock: { increment: qty } }
            });
            await tx.stock_mutations.create({
              data: {
                product_id: item.product_id,
                from_branch_id: null,
                to_branch_id: targetBranchId,
                quantity: qty,
                type: "ADJUSTMENT",
                notes: `Pembatalan/Perubahan Pesanan - Nota #${existingGroup.reference_number || existingGroup.id.slice(0, 8)}`
              }
            });
          }
        }
      }

      // Deduct stock if transitioning TO success
      if (isTransitioningToSuccess && targetBranchId && group.transaction_items) {
        for (const item of group.transaction_items) {
          if (item.product_id) {
            const qty = item.quantity ? Number(item.quantity) : 1;
            await tx.product_stocks.updateMany({
              where: { product_id: item.product_id, branch_id: targetBranchId },
              data: { stock: { decrement: qty } }
            });
            await tx.stock_mutations.create({
              data: {
                product_id: item.product_id,
                from_branch_id: targetBranchId,
                to_branch_id: null,
                quantity: qty,
                type: "SALE",
                notes: `Penyelesaian Pesanan - Nota #${group.reference_number || group.id.slice(0, 8)}`
              }
            });
          }
        }
      }
    });

    revalidatePath("/backend/tenant/transactions");
    revalidatePath("/backend/tenant/transactions/history");
    return { status: "success" };
  } catch (error) {
    console.error("changeTransactionStatusAction error:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Gagal memperbarui status transaksi" };
  }
}

