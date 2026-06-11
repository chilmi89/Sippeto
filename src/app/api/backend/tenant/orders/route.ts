import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import prisma from "@/lib/prisma";

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

export async function GET(req: Request) {
  try {
    const profile_id = await getProfileId();
    if (!profile_id) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: profile_id }
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    }

    let tenantOwnerId = profile.id;
    if (profile.branch_id) {
      const branch = await prisma.branches.findUnique({
        where: { id: profile.branch_id },
        select: { tenant_id: true }
      });
      if (branch) tenantOwnerId = branch.tenant_id;
    }

    const orders = await prisma.orders.findMany({
      where: { profile_id: tenantOwnerId },
      include: {
        order_items: {
          include: {
            products: {
              select: { name: true }
            }
          }
        },
        branches: {
          select: { name: true }
        }
      },
      orderBy: { created_at: "desc" }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error("GET ORDERS ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil data pesanan" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const profile_id = await getProfileId();
    if (!profile_id) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const profile = await prisma.profiles.findUnique({
      where: { id: profile_id }
    });

    if (!profile) {
      return NextResponse.json({ error: "Profil tidak ditemukan" }, { status: 404 });
    }

    let tenantOwnerId = profile.id;
    if (profile.branch_id) {
      const branch = await prisma.branches.findUnique({
        where: { id: profile.branch_id },
        select: { tenant_id: true }
      });
      if (branch) tenantOwnerId = branch.tenant_id;
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    }

    // Eksekusi transaksi database
    const result = await prisma.$transaction(async (tx) => {
      // 1. Ambil data order beserta items
      const order = await tx.orders.findUnique({
        where: { id },
        include: {
          order_items: {
            include: {
              products: true
            }
          }
        }
      });

      if (!order) {
        throw new Error("Pesanan tidak ditemukan");
      }

      if (order.status !== "PENDING") {
        throw new Error("Pesanan sudah diproses sebelumnya");
      }

      const allBranches = await tx.branches.findMany({
        where: { tenant_id: tenantOwnerId }
      });
      const defaultBranch = allBranches.find(b => b.name.toLowerCase().includes("utama") || b.name.toLowerCase().includes("pusat")) || allBranches[0];
      const targetBranchId = order.branch_id || (defaultBranch ? defaultBranch.id : null);

      if (status === "SUCCESS") {
        // A. Pemotongan Stok & Mutasi
        if (targetBranchId) {
          for (const item of order.order_items) {
            if (item.product_id) {
              // Cari atau buat product_stocks
              const existingStock = await tx.product_stocks.findUnique({
                where: {
                  product_id_branch_id: {
                    product_id: item.product_id,
                    branch_id: targetBranchId
                  }
                }
              });

              if (existingStock) {
                await tx.product_stocks.update({
                  where: { id: existingStock.id },
                  data: { stock: { decrement: item.quantity } }
                });
              } else {
                await tx.product_stocks.create({
                  data: {
                    product_id: item.product_id,
                    branch_id: targetBranchId,
                    stock: -item.quantity
                  }
                });
              }

              // Buat log mutasi stok
              await tx.stock_mutations.create({
                data: {
                  product_id: item.product_id,
                  from_branch_id: targetBranchId,
                  to_branch_id: null,
                  quantity: item.quantity,
                  type: "SALE",
                  notes: `Penyelesaian Pesanan E-Catalog - Ref: ${order.reference_number}`
                }
              });
            }
          }
        }

        // B. Catat Transaksi Keuangan
        // Cari Kategori Income ("Penjualan Produk")
        let category = await tx.categories.findFirst({
          where: { profile_id: tenantOwnerId, type: "INCOME", name: "Penjualan Produk" }
        });

        if (!category) {
          category = await tx.categories.findFirst({
            where: { profile_id: tenantOwnerId, type: "INCOME" }
          });
        }

        if (!category) {
          category = await tx.categories.create({
            data: {
              profile_id: tenantOwnerId,
              name: "Penjualan E-Catalog",
              type: "INCOME"
            }
          });
        }

        // Cari Metode Pembayaran
        const isTransfer = order.payment_method.toLowerCase().includes("transfer");
        const matchName = isTransfer ? "transfer" : "tunai";
        let paymentMethod = await tx.payment_methods.findFirst({
          where: {
            profile_id: tenantOwnerId,
            name: { contains: matchName, mode: "insensitive" }
          }
        });

        if (!paymentMethod) {
          paymentMethod = await tx.payment_methods.findFirst({
            where: { profile_id: tenantOwnerId }
          });
        }

        if (!paymentMethod) {
          paymentMethod = await tx.payment_methods.create({
            data: {
              profile_id: tenantOwnerId,
              name: isTransfer ? "Transfer Bank" : "Tunai / Cash"
            }
          });
        }

        // Buat record keuangan
        await tx.transaction_groups.create({
          data: {
            profile_id: tenantOwnerId,
            branch_id: targetBranchId,
            reference_number: order.reference_number,
            transaction_date: new Date(),
            description: `Penjualan dari E-Catalog via Order Ref: ${order.reference_number}`,
            total_income: order.total_price,
            total_expense: 0,
            net_balance: order.total_price,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_address: order.customer_address,
            order_status: 6, // Lunas / Selesai
            transaction_items: {
              create: order.order_items.map((it) => ({
                category_id: category.id,
                payment_method_id: paymentMethod.id,
                type: "INCOME",
                name: it.products?.name || "Produk E-Catalog",
                amount: it.price,
                quantity: it.quantity,
                product_id: it.product_id
              }))
            }
          }
        });
      }

      // C. Update status pesanan
      const updatedOrder = await tx.orders.update({
        where: { id },
        data: { status }
      });

      return updatedOrder;
    }, {
      maxWait: 15000,
      timeout: 30000
    });

    return NextResponse.json({ message: `Pesanan berhasil diupdate ke ${status}`, order: result });
  } catch (error: any) {
    console.error("PATCH ORDERS ERROR:", error);
    return NextResponse.json({ error: error.message || "Gagal memperbarui status pesanan" }, { status: 500 });
  }
}
