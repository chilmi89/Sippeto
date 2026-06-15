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

// 1. Fetch Products Page Data (Init)
export async function getProductsPageData() {
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
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return { status: "error", message: "Profil tidak ditemukan" };
    }

    // Ekstrak permissions
    const permissions =
      profile.roles?.role_permissions?.map(
        (rp) => rp.permissions?.name || "",
      ) || [];

    if (!permissions.includes("kelola_produk")) {
      return { status: "forbidden", message: "Akses Ditolak" };
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

    // Fetch Branches
    let branches = await prisma.branches.findMany({
      where: { tenant_id: tenantOwnerId },
      orderBy: { name: "asc" },
    });

    // Auto-create default branch "Pusat" if owner has 0 branches
    if (!profile.branch_id && branches.length === 0) {
      const defaultBranch = await prisma.branches.create({
        data: {
          tenant_id: tenantOwnerId,
          name: "Pusat",
        },
      });
      branches = [defaultBranch];
    }

    // Tentukan filter query produk berdasarkan branch_id user
    const productsWhere: any = {
      profile_id: tenantOwnerId,
    };

    if (profile.branch_id) {
      productsWhere.OR = [
        { branch_id: null },
        { branch_id: profile.branch_id },
      ];
    }

    // Parallel Fetch (Products and Categories)
    let [productsList, categories] = await Promise.all([
      prisma.products.findMany({
        where: productsWhere,
        orderBy: { name: "asc" },
        include: {
          product_categories: true,
          branches: {
            select: { name: true },
          },
          product_stocks: {
            include: {
              branches: {
                select: { name: true },
              },
            },
          },
        },
      }),
      prisma.product_categories.findMany({
        where: {
          OR: [{ profile_id: tenantOwnerId }, { profile_id: null }],
        },
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

    const userBranchId = profile.branch_id;

    // Map products to include branch stock info
    const mappedProducts = productsList.map((prod) => {
      let currentBranchStock = 0;
      let currentBranchMinStock = 0;

      if (userBranchId) {
        const branchStockInfo = prod.product_stocks.find(
          (s) => s.branch_id === userBranchId,
        );
        currentBranchStock = branchStockInfo?.stock ?? 0;
        currentBranchMinStock = branchStockInfo?.min_stock ?? 0;
      }

      return {
        id: prod.id,
        profile_id: prod.profile_id,
        branch_id: prod.branch_id,
        category_id: prod.category_id,
        name: prod.name,
        description: prod.description,
        base_price: Number(prod.base_price),
        sell_price: Number(prod.sell_price),
        image_url: prod.image_url,
        is_active: prod.is_active ?? true,
        created_at: prod.created_at ? prod.created_at.toISOString() : "",
        product_categories: prod.product_categories
          ? { name: prod.product_categories.name }
          : null,
        branches: prod.branches ? { name: prod.branches.name } : null,
        product_stocks: prod.product_stocks.map((ps) => ({
          id: ps.id,
          branch_id: ps.branch_id,
          stock: ps.stock,
          min_stock: ps.min_stock,
          branches: { name: ps.branches.name },
        })),
        current_branch_stock: currentBranchStock,
        current_branch_min_stock: currentBranchMinStock,
      };
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
        branch_id: profile.branch_id,
        username: profile.username,
        userRole: profile.roles?.name || "",
        tenant_owner_id: tenantOwnerId,
      },
      products: mappedProducts,
      branches: branches.map((b) => ({ id: b.id, name: b.name })),
      categories: categories.map((c) => ({ id: c.id, name: c.name })),
    };
  } catch (error) {
    console.error("getProductsPageData error:", error);
    return { status: "error", message: "Gagal memuat data produk" };
  }
}

// 2. Save / Update Product Action
export async function saveProductAction(payload: {
  id?: string;
  profile_id: string;
  branch_id: string | null;
  category_id: string | null;
  name: string;
  description?: string | null;
  base_price: number;
  sell_price: number;
  image_url?: string | null;
  is_active: boolean;
  branch_stocks?: Array<{
    branch_id: string;
    stock: number;
    min_stock: number;
  }>;
}) {
  try {
    const {
      id,
      profile_id,
      branch_id,
      category_id,
      name,
      description,
      base_price,
      sell_price,
      image_url,
      is_active,
      branch_stocks,
    } = payload;

    if (!profile_id || !name) {
      return {
        status: "error",
        message: "Profile ID dan nama produk wajib diisi",
      };
    }

    const result = await prisma.$transaction(
      async (tx) => {
        if (id) {
          // Mode UPDATE detail produk
          const updated = await tx.products.update({
            where: { id },
            data: {
              category_id,
              name,
              description: description ?? null,
              base_price: Number(base_price),
              sell_price: Number(sell_price),
              image_url: image_url ?? null,
              is_active,
            },
          });

          // Update stok cabang jika diberikan
          if (branch_stocks && branch_stocks.length > 0) {
            for (const stockInfo of branch_stocks) {
              const existingStock = await tx.product_stocks.findFirst({
                where: { product_id: id, branch_id: stockInfo.branch_id },
              });

              if (existingStock) {
                await tx.product_stocks.update({
                  where: { id: existingStock.id },
                  data: {
                    stock: stockInfo.stock,
                    min_stock: stockInfo.min_stock,
                  },
                });
              } else {
                await tx.product_stocks.create({
                  data: {
                    product_id: id,
                    branch_id: stockInfo.branch_id,
                    stock: stockInfo.stock,
                    min_stock: stockInfo.min_stock,
                  },
                });
              }
            }
          }

          return updated;
        } else {
          // Mode CREATE produk baru
          const newProduct = await tx.products.create({
            data: {
              profile_id,
              branch_id,
              category_id,
              name,
              description: description ?? null,
              base_price: Number(base_price),
              sell_price: Number(sell_price),
              image_url: image_url ?? null,
              is_active,
            },
          });

          if (branch_id) {
            // Produk lokal cabang
            await tx.product_stocks.create({
              data: {
                product_id: newProduct.id,
                branch_id: branch_id,
                stock: 0,
                min_stock: 0,
              },
            });
          } else {
            // Produk pusat: inisialisasi di semua cabang dengan input stok jika ada
            const branches = await tx.branches.findMany({
              where: { tenant_id: profile_id },
            });

            if (branches.length > 0) {
              const stockRecords = branches.map((branch) => {
                const stockInfo = branch_stocks?.find(
                  (s) => s.branch_id === branch.id,
                );
                return {
                  product_id: newProduct.id,
                  branch_id: branch.id,
                  stock: stockInfo ? stockInfo.stock : 0,
                  min_stock: stockInfo ? stockInfo.min_stock : 0,
                };
              });

              await tx.product_stocks.createMany({
                data: stockRecords,
              });
            }
          }

          return newProduct;
        }
      },
      {
        timeout: 20000,
      },
    );

    revalidatePath("/backend/tenant/products");
    revalidatePath("/backend/tenant/stocks");
    return { status: "success", data: { id: result.id, name: result.name } };
  } catch (error) {
    console.error("saveProductAction error:", error);
    return { status: "error", message: "Gagal menyimpan data produk" };
  }
}

// 3. Delete Product Action
export async function deleteProductAction(id: string) {
  try {
    await prisma.$transaction(async (tx) => {
      // Hapus stok terkait secara otomatis jika relasi tidak cascade
      await tx.product_stocks.deleteMany({
        where: { product_id: id },
      });
      // Hapus mutasi stok terkait
      await tx.stock_mutations.deleteMany({
        where: { product_id: id },
      });
      // Hapus produk
      await tx.products.delete({
        where: { id },
      });
    });

    revalidatePath("/backend/tenant/products");
    revalidatePath("/backend/tenant/stocks");
    return { status: "success" };
  } catch (error) {
    console.error("deleteProductAction error:", error);
    return { status: "error", message: "Gagal menghapus produk" };
  }
}
