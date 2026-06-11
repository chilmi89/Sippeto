import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      profile_id,
      branch_id,
      customer_name,
      customer_phone,
      customer_address,
      payment_method,
      total_price,
      items,
    } = body;

    // Validasi minimal
    if (!profile_id || !customer_name || !customer_phone || !payment_method || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Informasi pesanan tidak lengkap." },
        { status: 400 }
      );
    }

    // Generate reference number unik (contoh: ORD-2306112345)
    const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    const reference_number = `ORD-${dateStr}-${randomStr}`;

    // Jalankan transaksi database
    const order = await prisma.$transaction(async (tx) => {
      // 1. Buat record Order
      const newOrder = await tx.orders.create({
        data: {
          profile_id,
          branch_id: branch_id === "pusat" ? null : branch_id,
          reference_number,
          customer_name,
          customer_phone,
          customer_address: customer_address || null,
          payment_method,
          total_price: Number(total_price),
          status: "PENDING",
        },
      });

      // 2. Buat record Order Items
      const orderItemsData = items.map((item: any) => ({
        order_id: newOrder.id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        price: Number(item.price),
      }));

      await tx.order_items.createMany({
        data: orderItemsData,
      });

      return newOrder;
    });

    return NextResponse.json(
      { message: "Pesanan berhasil dibuat.", order },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST CHECKOUT ERROR:", error);
    return NextResponse.json(
      { error: "Gagal memproses pesanan." },
      { status: 500 }
    );
  }
}
