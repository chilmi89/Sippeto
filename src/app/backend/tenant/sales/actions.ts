"use server";

import jwt from "jsonwebtoken";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

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

// Helper: map type income/expense
const mapType = (t: string) => {
  const low = t.toLowerCase();
  if (low === "pemasukan" || low === "income") return "INCOME";
  if (low === "pengeluaran" || low === "expense") return "EXPENSE";
  return t.toUpperCase();
};

// 1. Fetch POS Page Data (Init)
export async function getPOSPageData(editId?: string | null) {
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
          select: { name: true },
        },
      },
    });

    if (!profile) {
      return { status: "error", message: "Profil tidak ditemukan" };
    }

    let tenantOwnerId = profile.id;
    if (profile.branch_id) {
      const branch = await prisma.branches.findUnique({
        where: { id: profile.branch_id },
        select: { tenant_id: true },
      });
      if (branch) {
        tenantOwnerId = branch.tenant_id;
      }
    }

    // Fetch Branches, Categories, Payment Methods, and Tx Categories in parallel
    let [branches, categories, paymentMethods, txCategories] =
      await Promise.all([
        prisma.branches.findMany({
          where: { tenant_id: tenantOwnerId },
          orderBy: { name: "asc" },
        }),
        prisma.product_categories.findMany({
          where: {
            OR: [{ profile_id: tenantOwnerId }, { profile_id: null }],
          },
          orderBy: { name: "asc" },
        }),
        prisma.payment_methods.findMany({
          where: { profile_id: tenantOwnerId },
          orderBy: { name: "asc" },
        }),
        prisma.categories.findMany({
          where: { profile_id: tenantOwnerId },
          orderBy: { name: "asc" },
        }),
      ]);

    // Seed default product categories if missing for this tenant
    const DEFAULT_PRODUCT_CATEGORIES = [
      "Makanan",
      "Minuman",
      "Aksesoris",
      "Obat & Vitamin",
      "Jasa / Grooming",
      "Lain-lain",
    ];

    const existingCats = await prisma.product_categories.findMany({
      where: {
        profile_id: tenantOwnerId,
        name: { in: DEFAULT_PRODUCT_CATEGORIES },
      },
      select: { name: true },
    });
    const existingNames = new Set(existingCats.map((c) => c.name));
    const missingCategories = DEFAULT_PRODUCT_CATEGORIES.filter(
      (name) => !existingNames.has(name),
    );

    if (missingCategories.length > 0) {
      await prisma.product_categories.createMany({
        data: missingCategories.map((name) => ({
          profile_id: tenantOwnerId,
          name,
        })),
      });

      categories = await prisma.product_categories.findMany({
        where: {
          OR: [{ profile_id: tenantOwnerId }, { profile_id: null }],
        },
        orderBy: { name: "asc" },
      });
    }

    // Seed default payment methods if missing for this tenant
    const DEFAULT_PAYMENTS = [
      "Tunai / Cash",
      "Transfer Bank",
      "E-Wallet (OVO/Dana)",
    ];

    const existingPayments = await prisma.payment_methods.findMany({
      where: {
        profile_id: tenantOwnerId,
        name: { in: DEFAULT_PAYMENTS },
      },
      select: { name: true },
    });
    const existingPaymentNames = new Set(existingPayments.map((p) => p.name));
    const missingPayments = DEFAULT_PAYMENTS.filter(
      (name) => !existingPaymentNames.has(name),
    );

    if (missingPayments.length > 0) {
      await prisma.payment_methods.createMany({
        data: missingPayments.map((name) => ({
          profile_id: tenantOwnerId,
          name,
        })),
      });

      paymentMethods = await prisma.payment_methods.findMany({
        where: { profile_id: tenantOwnerId },
        orderBy: { name: "asc" },
      });
    }

    let selectedBranchId = "";
    if (profile.branch_id) {
      selectedBranchId = profile.branch_id;
    } else if (branches.length > 0) {
      selectedBranchId = branches[0].id;
    }

    // Parallel Fetch for Products List and Edit Transaction
    const [productsList, tx] = await Promise.all([
      selectedBranchId
        ? prisma.products.findMany({
            where: {
              profile_id: tenantOwnerId,
              OR: [{ branch_id: null }, { branch_id: selectedBranchId }],
            },
            orderBy: { name: "asc" },
            include: {
              product_categories: true,
              product_stocks: {
                where: { branch_id: selectedBranchId },
              },
            },
          })
        : Promise.resolve([]),
      editId
        ? prisma.transaction_groups.findUnique({
            where: { id: editId },
            include: { transaction_items: true },
          })
        : Promise.resolve(null),
    ]);

    // Format products list
    const initialProducts = productsList.map((prod) => {
      const branchStock = prod.product_stocks[0]?.stock ?? 0;
      const minStock = prod.product_stocks[0]?.min_stock ?? 0;
      return {
        id: prod.id,
        name: prod.name,
        sell_price: Number(prod.sell_price),
        base_price: Number(prod.base_price),
        image_url: prod.image_url,
        category_id: prod.category_id,
        product_categories: prod.product_categories
          ? { name: prod.product_categories.name }
          : null,
        current_branch_stock: branchStock,
        current_branch_min_stock: minStock,
      };
    });

    // Format edit transaction if exists
    let editTransaction = null;
    if (tx) {
      editTransaction = {
        id: tx.id,
        reference_number: tx.reference_number,
        transaction_date: tx.transaction_date
          ? tx.transaction_date.toISOString()
          : "",
        description: tx.description,
        customer_name: tx.customer_name,
        customer_phone: tx.customer_phone,
        customer_address: tx.customer_address,
        order_status: tx.order_status,
        branch_id: tx.branch_id,
        items: tx.transaction_items.map((it) => ({
          id: it.id,
          name: it.name,
          amount: Number(it.amount),
          category_id: it.category_id,
          payment_method_id: it.payment_method_id,
          product_id: it.product_id,
          quantity: it.quantity ? Number(it.quantity) : 1,
        })),
      };
    }

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
        tenant_owner_id: tenantOwnerId,
      },
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
      paymentMethods: paymentMethods.map((pm) => ({
        id: pm.id,
        name: pm.name,
      })),
      txCategories: txCategories.map((tc) => ({
        id: tc.id,
        name: tc.name,
        type: tc.type,
      })),
      initialProducts,
      initialBranchId: selectedBranchId,
      editTransaction,
    };
  } catch (error: any) {
    console.error("getPOSPageData error:", error);
    return {
      status: "error",
      message: `Gagal memuat konfigurasi kasir: ${error.message || error}`,
    };
  }
}

// 2. Fetch Products for a branch
export async function getPOSProductsAction(
  tenantOwnerId: string,
  branchId: string,
) {
  try {
    const productsList = await prisma.products.findMany({
      where: {
        profile_id: tenantOwnerId,
        OR: [{ branch_id: null }, { branch_id: branchId }],
      },
      orderBy: { name: "asc" },
      include: {
        product_categories: true,
        product_stocks: {
          where: { branch_id: branchId },
        },
      },
    });

    return {
      status: "success",
      data: productsList.map((prod) => {
        const branchStock = prod.product_stocks[0]?.stock ?? 0;
        const minStock = prod.product_stocks[0]?.min_stock ?? 0;
        return {
          id: prod.id,
          name: prod.name,
          sell_price: Number(prod.sell_price),
          base_price: Number(prod.base_price),
          image_url: prod.image_url,
          category_id: prod.category_id,
          product_categories: prod.product_categories
            ? { name: prod.product_categories.name }
            : null,
          current_branch_stock: branchStock,
          current_branch_min_stock: minStock,
        };
      }),
    };
  } catch (error) {
    console.error("getPOSProductsAction error:", error);
    return { status: "error", message: "Gagal memuat produk cabang" };
  }
}

// 3. Save / Update POS Transaction Action
export async function savePOSTransactionAction(payload: {
  id?: string;
  profile_id: string;
  branch_id: string;
  reference_number: string;
  transaction_date: string;
  description: string;
  customer_name: string;
  customer_phone?: string | null;
  customer_address?: string | null;
  order_status: number;
  items: Array<{
    name: string;
    amount: number;
    category_id: string | null;
    payment_method_id: string;
    type: string;
    product_id: string;
    quantity: number;
  }>;
}) {
  try {
    const {
      id,
      profile_id,
      branch_id,
      reference_number,
      transaction_date,
      description,
      customer_name,
      customer_phone,
      customer_address,
      order_status,
      items,
    } = payload;

    if (!profile_id) {
      return { status: "error", message: "Profile ID wajib disertakan" };
    }

    let total_income = 0;
    let total_expense = 0;
    items.forEach((item) => {
      const amount = Number(item.amount || 0);
      const mappedType = mapType(item.type);
      if (mappedType === "INCOME") total_income += amount;
      if (mappedType === "EXPENSE") total_expense += amount;
    });

    const net_balance = total_income - total_expense;

    const result = await prisma.$transaction(
      async (tx) => {
        if (id) {
          // Mode UPDATE: Ambil transaksi lama
          const existingGroup = await tx.transaction_groups.findUnique({
            where: { id },
            include: { transaction_items: true },
          });

          if (!existingGroup) {
            throw new Error("Transaksi tidak ditemukan");
          }

          // 1. Revert stok lama (jika status lunas = 6 dan ada branch_id)
          if (existingGroup.order_status === 6 && existingGroup.branch_id) {
            for (const item of existingGroup.transaction_items) {
              if (item.product_id) {
                const qty = item.quantity ? Number(item.quantity) : 1;
                await tx.product_stocks.updateMany({
                  where: {
                    product_id: item.product_id,
                    branch_id: existingGroup.branch_id,
                  },
                  data: { stock: { increment: qty } },
                });
                await tx.stock_mutations.create({
                  data: {
                    product_id: item.product_id,
                    from_branch_id: null,
                    to_branch_id: existingGroup.branch_id,
                    quantity: qty,
                    type: "ADJUSTMENT",
                    notes: `Reversal Edit POS (Koreksi) - Nota #${existingGroup.reference_number || existingGroup.id.slice(0, 8)}`,
                  },
                });
              }
            }
          }

          // Hapus items lama
          await tx.transaction_items.deleteMany({ where: { group_id: id } });

          // Update group dan re-create items baru
          const group = await tx.transaction_groups.update({
            where: { id },
            data: {
              branch_id,
              reference_number,
              transaction_date: transaction_date
                ? new Date(transaction_date)
                : undefined,
              description,
              total_income,
              total_expense,
              net_balance,
              customer_name,
              customer_phone: customer_phone ?? null,
              customer_address: customer_address ?? null,
              order_status,
              transaction_items: {
                create: items.map((it) => ({
                  name: it.name,
                  amount: it.amount,
                  category_id: it.category_id,
                  payment_method_id: it.payment_method_id,
                  type: mapType(it.type),
                  product_id: it.product_id,
                  quantity: it.quantity,
                })),
              },
            },
            include: { transaction_items: true },
          });

          // 2. Potong stok baru jika status lunas = 6 dan ada branch_id
          if (order_status === 6 && branch_id) {
            for (const item of items) {
              if (item.product_id) {
                const qty = item.quantity;
                await tx.product_stocks.updateMany({
                  where: {
                    product_id: item.product_id,
                    branch_id: branch_id,
                  },
                  data: { stock: { decrement: qty } },
                });
                await tx.stock_mutations.create({
                  data: {
                    product_id: item.product_id,
                    from_branch_id: branch_id,
                    to_branch_id: null,
                    quantity: qty,
                    type: "SALE",
                    notes: `Penjualan POS Kasir (Koreksi) - Nota #${reference_number || group.reference_number || group.id.slice(0, 8)}`,
                  },
                });
              }
            }
          }

          return group;
        } else {
          // Mode CREATE baru
          const group = await tx.transaction_groups.create({
            data: {
              profile_id,
              branch_id,
              reference_number,
              transaction_date: transaction_date
                ? new Date(transaction_date)
                : undefined,
              description,
              total_income,
              total_expense,
              net_balance,
              customer_name,
              customer_phone: customer_phone ?? null,
              customer_address: customer_address ?? null,
              order_status,
              transaction_items: {
                create: items.map((it) => ({
                  name: it.name,
                  amount: it.amount,
                  category_id: it.category_id,
                  payment_method_id: it.payment_method_id,
                  type: mapType(it.type),
                  product_id: it.product_id,
                  quantity: it.quantity,
                })),
              },
            },
            include: { transaction_items: true },
          });

          // Potong stok jika status lunas = 6
          if (order_status === 6 && branch_id) {
            for (const item of items) {
              if (item.product_id) {
                const qty = item.quantity;
                await tx.product_stocks.updateMany({
                  where: {
                    product_id: item.product_id,
                    branch_id: branch_id,
                  },
                  data: { stock: { decrement: qty } },
                });
                await tx.stock_mutations.create({
                  data: {
                    product_id: item.product_id,
                    from_branch_id: branch_id,
                    to_branch_id: null,
                    quantity: qty,
                    type: "SALE",
                    notes: `Penjualan POS Kasir - Nota #${reference_number || group.reference_number || group.id.slice(0, 8)}`,
                  },
                });
              }
            }
          }

          return group;
        }
      },
      {
        timeout: 20000,
      },
    );

    revalidatePath("/backend/tenant/sales");
    revalidatePath("/backend/tenant/sales/history");
    return {
      status: "success",
      data: {
        id: result.id,
        reference_number: result.reference_number,
        transaction_date: result.transaction_date?.toISOString(),
        customer_name: result.customer_name,
      },
    };
  } catch (error) {
    console.error("savePOSTransactionAction error:", error);
    return {
      status: "error",
      message:
        error instanceof Error ? error.message : "Gagal memproses transaksi",
    };
  }
}

// 4. Fetch Sales History Page Data
export async function getSalesHistoryPageData(payload: {
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
        roles: { select: { name: true } },
      },
    });

    if (!profile) {
      return { status: "error", message: "Profil tidak ditemukan" };
    }

    let tenantOwnerId = profile.id;
    if (profile.branch_id) {
      const branch = await prisma.branches.findUnique({
        where: { id: profile.branch_id },
        select: { tenant_id: true },
      });
      if (branch) {
        tenantOwnerId = branch.tenant_id;
      }
    }

    const search = payload.search || undefined;
    const date_start = payload.dateStart || undefined;
    const date_end = payload.dateEnd || undefined;
    const page = Math.max(1, Number(payload.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(payload.limit ?? 15)));

    // Filter khusus transaksi POS yang memiliki product_id di itemnya (penjualan produk)
    const where: any = {
      profile_id: tenantOwnerId,
      transaction_items: {
        some: {
          product_id: { not: null },
        },
      },
      ...(search && {
        OR: [
          { reference_number: { contains: search, mode: "insensitive" } },
          { customer_name: { contains: search, mode: "insensitive" } },
        ],
      }),
      ...((date_start || date_end) && {
        transaction_date: {
          ...(date_start && { gte: new Date(date_start) }),
          ...(date_end && { lte: new Date(date_end) }),
        },
      }),
    };

    const [total, data] = await Promise.all([
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
              payment_methods: true,
            },
          },
        },
      }),
    ]);

    // Aggregate stats (totalRevenue, totalItems)
    const allMatchingGroups = await prisma.transaction_groups.findMany({
      where,
      select: {
        total_income: true,
        transaction_items: {
          select: {
            quantity: true,
          },
        },
      },
    });

    const totalRevenue = allMatchingGroups.reduce(
      (sum, g) => sum + Number(g.total_income || 0),
      0,
    );
    const totalItems = allMatchingGroups.reduce(
      (sum, g) =>
        sum +
        g.transaction_items.reduce(
          (s, i) => s + (i.quantity ? Number(i.quantity) : 1),
          0,
        ),
      0,
    );

    return {
      status: "success",
      businessName: profile.business_name || "SiPetto UMKM",
      data: data.map((tx) => ({
        id: tx.id,
        reference_number: tx.reference_number,
        transaction_date: tx.transaction_date
          ? tx.transaction_date.toISOString()
          : new Date().toISOString(),
        total_income: Number(tx.total_income || 0),
        description: tx.description,
        customer_name: tx.customer_name,
        created_at: tx.created_at
          ? tx.created_at.toISOString()
          : new Date().toISOString(),
        branch_id: tx.branch_id,
        order_status: tx.order_status,
        transaction_items: tx.transaction_items.map((it) => ({
          id: it.id,
          name: it.name,
          amount: Number(it.amount),
          quantity: it.quantity ? Number(it.quantity) : 1,
          product_id: it.product_id,
          payment_method_id: it.payment_method_id,
          categories: it.categories ? { name: it.categories.name } : null,
          payment_methods: it.payment_methods
            ? { name: it.payment_methods.name }
            : null,
        })),
      })),
      total,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalRevenue,
        totalItems,
      },
    };
  } catch (error) {
    console.error("getSalesHistoryPageData error:", error);
    return { status: "error", message: "Gagal mengambil data penjualan" };
  }
}

// 5. Delete Sales Transaction Action
export async function deleteSalesTransactionAction(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      const existingGroup = await tx.transaction_groups.findUnique({
        where: { id },
        include: { transaction_items: true },
      });

      if (existingGroup) {
        // Revert stock jika status Selesai/Lunas (6) dan ada branch_id
        if (existingGroup.order_status === 6 && existingGroup.branch_id) {
          for (const item of existingGroup.transaction_items) {
            if (item.product_id) {
              const qty = item.quantity ? Number(item.quantity) : 1;
              await tx.product_stocks.updateMany({
                where: {
                  product_id: item.product_id,
                  branch_id: existingGroup.branch_id,
                },
                data: { stock: { increment: qty } },
              });
              await tx.stock_mutations.create({
                data: {
                  product_id: item.product_id,
                  from_branch_id: null,
                  to_branch_id: existingGroup.branch_id,
                  quantity: qty,
                  type: "ADJUSTMENT",
                  notes: `Reversal Hapus POS - Nota #${existingGroup.reference_number || existingGroup.id.slice(0, 8)}`,
                },
              });
            }
          }
        }

        await tx.transaction_groups.delete({
          where: { id },
        });
      }
    });

    revalidatePath("/backend/tenant/sales");
    revalidatePath("/backend/tenant/sales/history");
    return { status: "success" };
  } catch (error) {
    console.error("deleteSalesTransactionAction error:", error);
    return { status: "error", message: "Gagal menghapus data penjualan" };
  }
}
