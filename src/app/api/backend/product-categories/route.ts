import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// 1. GET - Ambil kategori produk dengan pagination & filter
// Query params: page (default 1), limit (default 10), search, profile_id
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(
      100,
      Math.max(1, Number(searchParams.get("limit") ?? 10)),
    );
    const search = searchParams.get("search") ?? undefined;
    const profile_id = searchParams.get("profile_id") ?? undefined;

    if (profile_id) {
      // Cek apakah tenant ini memiliki kategori produk
      const count = await prisma.product_categories.count({
        where: { profile_id },
      });

      // Jika belum ada kategori, seed kategori default
      if (count === 0) {
        const DEFAULT_PRODUCT_CATEGORIES = [
          "Makanan",
          "Minuman",
          "Aksesoris",
          "Obat & Vitamin",
          "Jasa / Grooming",
          "Lain-lain",
        ];

        await prisma.product_categories.createMany({
          data: DEFAULT_PRODUCT_CATEGORIES.map((name) => ({
            profile_id,
            name,
          })),
        });
      }
    }

    const scope = searchParams.get("scope") ?? "all";

    const where = {
      ...(profile_id
        ? { OR: [{ profile_id }, { profile_id: null }] }
        : scope === "global"
          ? { profile_id: null }
          : scope === "tenant"
            ? { NOT: { profile_id: null } }
            : {}),
      ...(search && {
        name: { contains: search, mode: "insensitive" as const },
      }),
    };

    // Jalankan count & data secara paralel untuk efisiensi
    const [total, data] = await Promise.all([
      prisma.product_categories.count({ where }),
      prisma.product_categories.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          profiles: {
            select: {
              business_name: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("GET PRODUCT CATEGORIES ERROR:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data kategori produk" },
      { status: 500 },
    );
  }
}

// 2. POST - Buat Kategori Produk Baru
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, profile_id } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi" },
        { status: 400 },
      );
    }

    const category = await prisma.product_categories.create({
      data: {
        name,
        profile_id: profile_id ?? null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("POST PRODUCT CATEGORY ERROR:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan kategori produk" },
      { status: 500 },
    );
  }
}

// 3. PATCH - Edit Kategori Produk
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID dan Nama kategori wajib disertakan" },
        { status: 400 },
      );
    }

    const updated = await prisma.product_categories.update({
      where: { id },
      data: {
        name,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH PRODUCT CATEGORY ERROR:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui kategori produk" },
      { status: 500 },
    );
  }
}

// 4. DELETE - Hapus Kategori Produk
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { error: "ID kategori produk tidak ditemukan" },
        { status: 400 },
      );

    await prisma.product_categories.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Kategori produk berhasil dihapus" });
  } catch (error) {
    console.error("DELETE PRODUCT CATEGORY ERROR:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kategori produk" },
      { status: 500 },
    );
  }
}
