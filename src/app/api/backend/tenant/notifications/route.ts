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

    // 1. Ambil pesanan PENDING
    const pendingOrders = await prisma.orders.findMany({
      where: {
        profile_id: tenantOwnerId,
        status: "PENDING"
      },
      select: {
        id: true,
        reference_number: true,
        customer_name: true,
        total_price: true,
        created_at: true
      },
      orderBy: { created_at: "desc" }
    });

    // 2. Ambil produk dengan stok menipis (stock <= min_stock atau stock <= 0)
    const allStocks = await prisma.product_stocks.findMany({
      where: {
        products: {
          profile_id: tenantOwnerId
        }
      },
      include: {
        products: {
          select: {
            name: true
          }
        },
        branches: {
          select: {
            name: true
          }
        }
      }
    });

    const lowStockProducts = allStocks
      .filter((s) => s.stock <= s.min_stock || s.stock <= 0)
      .map((s) => ({
        id: s.id,
        product_name: s.products.name,
        branch_name: s.branches.name,
        stock: s.stock,
        min_stock: s.min_stock
      }));

    const pendingOrdersCount = pendingOrders.length;
    const lowStockCount = lowStockProducts.length;
    const totalCount = pendingOrdersCount + lowStockCount;

    return NextResponse.json({
      pendingOrdersCount,
      lowStockCount,
      totalCount,
      pendingOrders,
      lowStockProducts
    });
  } catch (error) {
    console.error("GET NOTIFICATIONS ERROR:", error);
    return NextResponse.json({ error: "Gagal mengambil data notifikasi" }, { status: 500 });
  }
}
