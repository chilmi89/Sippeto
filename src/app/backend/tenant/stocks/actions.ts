"use server";

import prisma from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { revalidatePath } from "next/cache";

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

// 1. Fetch Stocks Page Data (Init)
export async function getStocksPageData() {
  try {
    const profile_id = await getProfileId();
    if (!profile_id) {
      return { status: "error", message: "Tidak terautentikasi" };
    }

    // Ambil profile & permissions
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
          select: {
            name: true,
            role_permissions: {
              select: {
                permissions: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
    });

    if (!profile) {
      return { status: "error", message: "Profil tidak ditemukan" };
    }

    // Ekstrak permissions
    const permissions = profile.roles?.role_permissions?.map(
      (rp) => rp.permissions?.name || ""
    ) || [];

    if (!permissions.includes("kelola_stok")) {
      return { status: "forbidden", message: "Akses Ditolak" };
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

    // Fetch Branches
    let branches = await prisma.branches.findMany({
      where: { tenant_id: tenantOwnerId },
      orderBy: { name: "asc" }
    });

    // Auto-create default branch "Pusat" if owner has 0 branches
    if (!profile.branch_id && branches.length === 0) {
      const defaultBranch = await prisma.branches.create({
        data: {
          tenant_id: tenantOwnerId,
          name: "Pusat"
        }
      });
      branches = [defaultBranch];
    }

    // Fetch Products (untuk dropdown transfer stok dan data produk dasar)
    const productsList = await prisma.products.findMany({
      where: { profile_id: tenantOwnerId },
      orderBy: { name: "asc" },
      include: {
        product_stocks: {
          include: {
            branches: {
              select: { name: true }
            }
          }
        }
      }
    });

    const userBranchId = profile.branch_id;
    const flattenedStocks: any[] = [];

    if (!userBranchId) {
      // Owner View: Lihat semua stok produk di semua cabang
      productsList.forEach((prod) => {
        branches.forEach((branch) => {
          const ps = prod.product_stocks?.find((s) => s.branch_id === branch.id);
          flattenedStocks.push({
            id: ps ? ps.id : `virtual-${prod.id}-${branch.id}`,
            product_id: prod.id,
            branch_id: branch.id,
            stock: ps ? ps.stock : 0,
            min_stock: ps ? ps.min_stock : 0,
            products: {
              name: prod.name,
              sell_price: Number(prod.sell_price)
            },
            branches: {
              name: branch.name
            }
          });
        });
      });
    } else {
      // Staff View: Lihat stok produk di cabangnya saja
      productsList.forEach((prod) => {
        const ps = prod.product_stocks?.find((s) => s.branch_id === userBranchId);
        const currentBranchName = branches.find((b) => b.id === userBranchId)?.name || "Cabang Anda";
        flattenedStocks.push({
          id: ps ? ps.id : `virtual-${prod.id}-${userBranchId}`,
          product_id: prod.id,
          branch_id: userBranchId,
          stock: ps ? ps.stock : 0,
          min_stock: ps ? ps.min_stock : 0,
          products: {
            name: prod.name,
            sell_price: Number(prod.sell_price)
          },
          branches: {
            name: currentBranchName
          }
        });
      });
    }

    // Fetch Mutations (max 30 log)
    let mutationsWhere: any = {};
    if (!userBranchId) {
      // Global Mutations untuk owner
      mutationsWhere = {
        products: { profile_id: tenantOwnerId }
      };
    } else {
      // Mutations khusus cabang staff
      mutationsWhere = {
        OR: [
          { from_branch_id: userBranchId },
          { to_branch_id: userBranchId }
        ]
      };
    }

    const mutations = await prisma.stock_mutations.findMany({
      where: mutationsWhere,
      orderBy: { created_at: "desc" },
      take: 30,
      include: {
        products: { select: { name: true } },
        from_branch: { select: { name: true } },
        to_branch: { select: { name: true } }
      }
    });

    const mappedMutations = mutations.map((m) => ({
      id: m.id,
      product_id: m.product_id,
      from_branch_id: m.from_branch_id,
      to_branch_id: m.to_branch_id,
      quantity: m.quantity,
      type: m.type,
      notes: m.notes,
      created_at: m.created_at ? m.created_at.toISOString() : "",
      products: { name: m.products.name },
      from_branch: m.from_branch ? { name: m.from_branch.name } : null,
      to_branch: m.to_branch ? { name: m.to_branch.name } : null
    }));

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
        branch_id: profile.branch_id,
        username: profile.username,
        userRole: profile.roles?.name || "",
        tenant_owner_id: tenantOwnerId
      },
      stocks: flattenedStocks,
      mutations: mappedMutations,
      branches: branches.map(b => ({ id: b.id, name: b.name })),
      products: productsList.map(p => ({ id: p.id, name: p.name }))
    };

  } catch (error) {
    console.error("getStocksPageData error:", error);
    return { status: "error", message: "Gagal memuat data stok" };
  }
}

// 2. Adjust Stock (Opname) Action
export async function adjustStockAction(payload: {
  product_id: string;
  branch_id: string;
  stock: number;
  min_stock: number;
  notes?: string;
}) {
  try {
    const { product_id, branch_id, stock, min_stock, notes } = payload;
    if (!product_id || !branch_id) {
      return { status: "error", message: "Parameter tidak lengkap" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingStock = await tx.product_stocks.findUnique({
        where: {
          product_id_branch_id: {
            product_id,
            branch_id
          }
        }
      });

      const oldStock = existingStock?.stock ?? 0;
      const stockVal = Number(stock);
      const minStockVal = Number(min_stock);

      const updated = await tx.product_stocks.upsert({
        where: {
          product_id_branch_id: {
            product_id,
            branch_id
          }
        },
        update: {
          stock: stockVal,
          min_stock: minStockVal
        },
        create: {
          product_id,
          branch_id,
          stock: stockVal,
          min_stock: minStockVal
        }
      });

      if (stockVal !== oldStock) {
        const diff = stockVal - oldStock;
        await tx.stock_mutations.create({
          data: {
            product_id,
            from_branch_id: diff < 0 ? branch_id : null,
            to_branch_id: diff > 0 ? branch_id : null,
            quantity: Math.abs(diff),
            type: "ADJUSTMENT",
            notes: notes ?? `Opname stok mandiri oleh cabang (Stok lama: ${oldStock}, Stok baru: ${stockVal})`
          }
        });
      }

      return updated;
    });

    revalidatePath("/backend/tenant/stocks");
    revalidatePath("/backend/tenant/products");
    return { status: "success", data: { id: result.id } };

  } catch (error) {
    console.error("adjustStockAction error:", error);
    return { status: "error", message: "Gagal melakukan penyesuaian stok" };
  }
}

// 3. Transfer Stock Action
export async function transferStockAction(payload: {
  product_id: string;
  from_branch_id: string;
  to_branch_id: string;
  quantity: number;
  notes?: string;
}) {
  try {
    const { product_id, from_branch_id, to_branch_id, quantity, notes } = payload;
    if (!product_id || !from_branch_id || !to_branch_id || !quantity || quantity <= 0) {
      return { status: "error", message: "Data transfer tidak lengkap atau jumlah transfer tidak valid" };
    }

    if (from_branch_id === to_branch_id) {
      return { status: "error", message: "Cabang pengirim dan penerima tidak boleh sama" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const qtyVal = Number(quantity);

      // Cek stok cabang pengirim
      const senderStock = await tx.product_stocks.findUnique({
        where: {
          product_id_branch_id: {
            product_id,
            branch_id: from_branch_id
          }
        }
      });

      if (!senderStock || senderStock.stock < qtyVal) {
        throw new Error("Stok di cabang pengirim tidak mencukupi untuk melakukan transfer.");
      }

      // Kurangi cabang pengirim
      await tx.product_stocks.update({
        where: {
          product_id_branch_id: {
            product_id,
            branch_id: from_branch_id
          }
        },
        data: {
          stock: senderStock.stock - qtyVal
        }
      });

      // Tambah/Upsert cabang penerima
      const receiverStock = await tx.product_stocks.findUnique({
        where: {
          product_id_branch_id: {
            product_id,
            branch_id: to_branch_id
          }
        }
      });

      await tx.product_stocks.upsert({
        where: {
          product_id_branch_id: {
            product_id,
            branch_id: to_branch_id
          }
        },
        update: {
          stock: (receiverStock?.stock ?? 0) + qtyVal
        },
        create: {
          product_id,
          branch_id: to_branch_id,
          stock: qtyVal,
          min_stock: 0
        }
      });

      // Catat mutasi transfer
      const mutation = await tx.stock_mutations.create({
        data: {
          product_id,
          from_branch_id,
          to_branch_id,
          quantity: qtyVal,
          type: "TRANSFER",
          notes: notes ?? "Transfer stok antar cabang"
        }
      });

      return mutation;
    });

    revalidatePath("/backend/tenant/stocks");
    revalidatePath("/backend/tenant/products");
    return { status: "success", data: { id: result.id } };

  } catch (error: any) {
    console.error("transferStockAction error:", error);
    return { status: "error", message: error.message || "Gagal melakukan transfer stok" };
  }
}
