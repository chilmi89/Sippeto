import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1. GET - Ambil daftar produk (Pusat atau Cabang lokal)
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id") ?? undefined;
        const tenant_id = searchParams.get("tenant_id") ?? undefined;
        const branch_id = searchParams.get("branch_id") ?? undefined;

        // A. Detail satu produk
        if (id) {
            const product = await prisma.products.findUnique({
                where: { id },
                include: {
                    product_categories: true,
                    branches: {
                        select: { name: true }
                    },
                    product_stocks: {
                        include: {
                            branches: {
                                select: { name: true }
                            }
                        }
                    }
                }
            });
            return NextResponse.json({ data: product ? [product] : [] });
        }

        // B. Jika diakses oleh cabang (branch_id)
        if (branch_id) {
            const branch = await prisma.branches.findUnique({
                where: { id: branch_id },
                select: { tenant_id: true }
            });

            if (!branch) {
                return NextResponse.json({ error: "Cabang tidak ditemukan" }, { status: 404 });
            }

            const products = await prisma.products.findMany({
                where: {
                    profile_id: branch.tenant_id,
                    OR: [
                        { branch_id: null },
                        { branch_id: branch_id }
                    ]
                },
                orderBy: { name: "asc" },
                include: {
                    product_categories: true,
                    branches: {
                        select: { name: true }
                    },
                    product_stocks: {
                        where: { branch_id: branch_id }
                    }
                }
            });

            const mappedProducts = products.map(prod => {
                const branchStock = prod.product_stocks[0]?.stock ?? 0;
                const minStock = prod.product_stocks[0]?.min_stock ?? 0;
                return {
                    ...prod,
                    current_branch_stock: branchStock,
                    current_branch_min_stock: minStock
                };
            });

            return NextResponse.json({ data: mappedProducts });
        }

        // C. Jika diakses oleh Owner (tenant_id)
        if (tenant_id) {
            const products = await prisma.products.findMany({
                where: { profile_id: tenant_id },
                orderBy: { name: "asc" },
                include: {
                    product_categories: true,
                    branches: {
                        select: { name: true }
                    },
                    product_stocks: {
                        include: {
                            branches: {
                                select: { name: true }
                            }
                        }
                    }
                }
            });
            return NextResponse.json({ data: products });
        }

        // D. Jika Superadmin mengakses global
        const allProducts = await prisma.products.findMany({
            orderBy: { name: "asc" },
            include: {
                product_categories: true,
                branches: {
                    select: { name: true }
                },
                profiles: {
                    select: {
                        business_name: true,
                        full_name: true,
                        email: true
                    }
                },
                product_stocks: true
            }
        });

        return NextResponse.json({ data: allProducts });
    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);
        return NextResponse.json({ error: "Gagal mengambil data produk" }, { status: 500 });
    }
}

// 2. POST - Buat produk baru dan inisialisasi stok 0
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            profile_id,
            branch_id,
            category_id,
            name,
            description,
            base_price,
            sell_price,
            image_url,
            is_active
        } = body;

        if (!profile_id || !name) {
            return NextResponse.json({ error: "Profile ID dan nama produk wajib diisi" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            // A. Buat Master Produk
            const product = await tx.products.create({
                data: {
                    profile_id,
                    branch_id: branch_id ?? null,
                    category_id: category_id ?? null,
                    name,
                    description: description ?? null,
                    base_price: base_price ? Number(base_price) : 0,
                    sell_price: sell_price ? Number(sell_price) : 0,
                    image_url: image_url ?? null,
                    is_active: is_active !== undefined ? is_active : true
                }
            });

            // B. Inisialisasi Stok Cabang (Set 0 secara default)
            if (branch_id) {
                // Produk Lokal Cabang
                await tx.product_stocks.create({
                    data: {
                        product_id: product.id,
                        branch_id: branch_id,
                        stock: 0,
                        min_stock: 0
                    }
                });
            } else {
                // Produk Pusat: Inisialisasi stok 0 di semua cabang miliknya
                const tenantBranches = await tx.branches.findMany({
                    where: { tenant_id: profile_id }
                });

                if (tenantBranches.length > 0) {
                    const stockRecords = tenantBranches.map(branch => ({
                        product_id: product.id,
                        branch_id: branch.id,
                        stock: 0,
                        min_stock: 0
                    }));

                    await tx.product_stocks.createMany({
                        data: stockRecords
                    });
                }
            }

            return product;
        });

        return NextResponse.json({ data: result, message: "Produk berhasil dibuat" }, { status: 201 });
    } catch (error) {
        console.error("POST PRODUCT ERROR:", error);
        return NextResponse.json({ error: "Gagal membuat produk baru" }, { status: 500 });
    }
}

// 3. PATCH - Perbarui data detail master produk saja (stok di-update lewat API terpisah)
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const {
            id,
            category_id,
            name,
            description,
            base_price,
            sell_price,
            image_url,
            is_active
        } = body;

        if (!id) {
            return NextResponse.json({ error: "ID produk wajib disertakan" }, { status: 400 });
        }

        const updatedProduct = await prisma.products.update({
            where: { id },
            data: {
                ...(category_id !== undefined && { category_id: category_id ?? null }),
                ...(name && { name }),
                ...(description !== undefined && { description: description ?? null }),
                ...(base_price !== undefined && { base_price: Number(base_price) }),
                ...(sell_price !== undefined && { sell_price: Number(sell_price) }),
                ...(image_url !== undefined && { image_url: image_url ?? null }),
                ...(is_active !== undefined && { is_active })
            }
        });

        return NextResponse.json({ data: updatedProduct, message: "Produk berhasil diperbarui" });
    } catch (error) {
        console.error("PATCH PRODUCT ERROR:", error);
        return NextResponse.json({ error: "Gagal memperbarui data produk" }, { status: 500 });
    }
}

// 4. DELETE - Hapus produk
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID produk tidak ditemukan" }, { status: 400 });
        }

        await prisma.products.delete({
            where: { id }
        });

        return NextResponse.json({ message: "Produk berhasil dihapus" });
    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        return NextResponse.json({ error: "Gagal menghapus produk" }, { status: 500 });
    }
}
