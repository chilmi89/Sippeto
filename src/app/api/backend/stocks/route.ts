import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1. GET - Ambil detail stok dan riwayat mutasi stok produk
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const product_id = searchParams.get("product_id") ?? undefined;
        const branch_id = searchParams.get("branch_id") ?? undefined;
        const tenant_id = searchParams.get("tenant_id") ?? undefined;

        // A. Ambil riwayat mutasi global untuk tenant owner (untuk monitoring)
        if (tenant_id && !product_id && !branch_id) {
            const mutations = await prisma.stock_mutations.findMany({
                where: {
                    products: { profile_id: tenant_id }
                },
                orderBy: { created_at: "desc" },
                take: 30,
                include: {
                    products: { select: { name: true } },
                    from_branch: { select: { name: true } },
                    to_branch: { select: { name: true } }
                }
            });
            return NextResponse.json({ mutations });
        }

        // B. Ambil riwayat mutasi khusus cabang
        if (branch_id && !product_id) {
            const mutations = await prisma.stock_mutations.findMany({
                where: {
                    OR: [
                        { from_branch_id: branch_id },
                        { to_branch_id: branch_id }
                    ]
                },
                orderBy: { created_at: "desc" },
                take: 30,
                include: {
                    products: { select: { name: true } },
                    from_branch: { select: { name: true } },
                    to_branch: { select: { name: true } }
                }
            });

            const stocks = await prisma.product_stocks.findMany({
                where: { branch_id },
                include: {
                    products: { select: { name: true, sell_price: true } },
                    branches: { select: { name: true } }
                }
            });

            return NextResponse.json({ stocks, mutations });
        }

        // C. Filter berdasarkan produk spesifik
        if (product_id) {
            const where = {
                product_id,
                ...(branch_id && { branch_id })
            };

            const stocks = await prisma.product_stocks.findMany({
                where,
                include: {
                    products: { select: { name: true, sell_price: true } },
                    branches: { select: { name: true } }
                },
                orderBy: { branches: { name: "asc" } }
            });

            const mutations = await prisma.stock_mutations.findMany({
                where: { product_id },
                orderBy: { created_at: "desc" },
                take: 15,
                include: {
                    from_branch: { select: { name: true } },
                    to_branch: { select: { name: true } }
                }
            });

            return NextResponse.json({ stocks, mutations });
        }

        return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
    } catch (error) {
        console.error("GET STOCKS ERROR:", error);
        return NextResponse.json({ error: "Gagal mengambil data stok" }, { status: 500 });
    }
}

// 2. PATCH - Perbarui stok (Opname, Alokasi, atau Transfer Stok Antar Cabang)
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const {
            product_id,
            branch_id,       // Terisi untuk single opname (oleh cabang)
            stock,           // Terisi untuk opname/adjustment
            min_stock,       // Terisi untuk min_stock
            notes,           // Catatan mutasi (opsional)
            branch_stocks,   // Terisi untuk alokasi multi-cabang oleh Owner
            
            // Parameter khusus untuk Transfer Stok
            is_transfer,     // Flag boolean penanda transfer stok
            from_branch_id,  // Cabang pengirim
            to_branch_id,    // Cabang penerima
            quantity         // Jumlah transfer
        } = body;

        if (!product_id) {
            return NextResponse.json({ error: "Product ID wajib disertakan" }, { status: 400 });
        }

        const result = await prisma.$transaction(async (tx) => {
            
            // =================================================================
            // SKENARIO A: TRANSFER STOK ANTAR-CABANG secara Atomik
            // =================================================================
            if (is_transfer) {
                if (!from_branch_id || !to_branch_id || !quantity || Number(quantity) <= 0) {
                    throw new Error("Data transfer (Pengirim, Penerima, Jumlah) tidak lengkap atau tidak valid.");
                }

                const qtyVal = Number(quantity);

                // 1. Cek stok di cabang pengirim
                const senderStock = await tx.product_stocks.findUnique({
                    where: {
                        product_id_branch_id: {
                            product_id: product_id,
                            branch_id: from_branch_id
                        }
                    }
                });

                if (!senderStock || senderStock.stock < qtyVal) {
                    throw new Error("Stok di cabang pengirim tidak mencukupi untuk melakukan transfer.");
                }

                // 2. Kurangi stok di cabang pengirim
                await tx.product_stocks.update({
                    where: {
                        product_id_branch_id: {
                            product_id: product_id,
                            branch_id: from_branch_id
                        }
                    },
                    data: {
                        stock: senderStock.stock - qtyVal
                    }
                });

                // 3. Tambah/Upsert stok di cabang penerima
                const receiverStock = await tx.product_stocks.findUnique({
                    where: {
                        product_id_branch_id: {
                            product_id: product_id,
                            branch_id: to_branch_id
                        }
                    }
                });

                await tx.product_stocks.upsert({
                    where: {
                        product_id_branch_id: {
                            product_id: product_id,
                            branch_id: to_branch_id
                        }
                    },
                    update: {
                        stock: (receiverStock?.stock ?? 0) + qtyVal
                    },
                    create: {
                        product_id: product_id,
                        branch_id: to_branch_id,
                        stock: qtyVal,
                        min_stock: 0
                    }
                });

                // 4. Catat log mutasi transfer
                const mutation = await tx.stock_mutations.create({
                    data: {
                        product_id: product_id,
                        from_branch_id: from_branch_id,
                        to_branch_id: to_branch_id,
                        quantity: qtyVal,
                        type: "TRANSFER",
                        notes: notes ?? "Transfer stok antar cabang"
                    }
                });

                return { success: true, transferMutation: mutation };
            }

            // =================================================================
            // SKENARIO B: MULTI-ALOKASI STOK (Oleh Owner)
            // =================================================================
            if (branch_stocks && Array.isArray(branch_stocks)) {
                for (const bStock of branch_stocks) {
                    const bId = bStock.branch_id;
                    const stockVal = Number(bStock.stock);
                    const minStockVal = bStock.min_stock !== undefined ? Number(bStock.min_stock) : undefined;

                    const existingStock = await tx.product_stocks.findUnique({
                        where: {
                            product_id_branch_id: {
                                product_id: product_id,
                                branch_id: bId
                            }
                        }
                    });

                    const oldStock = existingStock?.stock ?? 0;

                    await tx.product_stocks.upsert({
                        where: {
                            product_id_branch_id: {
                                product_id: product_id,
                                branch_id: bId
                            }
                        },
                        update: {
                            stock: stockVal,
                            ...(minStockVal !== undefined && { min_stock: minStockVal })
                        },
                        create: {
                            product_id: product_id,
                            branch_id: bId,
                            stock: stockVal,
                            min_stock: minStockVal ?? 0
                        }
                    });

                    if (stockVal !== oldStock) {
                        const diff = stockVal - oldStock;
                        await tx.stock_mutations.create({
                            data: {
                                product_id: product_id,
                                from_branch_id: diff < 0 ? bId : null,
                                to_branch_id: diff > 0 ? bId : null,
                                quantity: Math.abs(diff),
                                type: "ADJUSTMENT",
                                notes: notes ?? `Penyesuaian alokasi stok oleh owner (Stok lama: ${oldStock}, Stok baru: ${stockVal})`
                            }
                        });
                    }
                }
                return { success: true, action: "multi_allocation" };
            } 
            
            // =================================================================
            // SKENARIO C: SINGLE OPNAME STOK (Oleh Cabang)
            // =================================================================
            if (branch_id && stock !== undefined) {
                const stockVal = Number(stock);
                const minStockVal = min_stock !== undefined ? Number(min_stock) : undefined;

                const existingStock = await tx.product_stocks.findUnique({
                    where: {
                        product_id_branch_id: {
                            product_id: product_id,
                            branch_id: branch_id
                        }
                    }
                });

                const oldStock = existingStock?.stock ?? 0;

                await tx.product_stocks.upsert({
                    where: {
                        product_id_branch_id: {
                            product_id: product_id,
                            branch_id: branch_id
                        }
                    },
                    update: {
                        stock: stockVal,
                        ...(minStockVal !== undefined && { min_stock: minStockVal })
                    },
                    create: {
                        product_id: product_id,
                        branch_id: branch_id,
                        stock: stockVal,
                        min_stock: minStockVal ?? 0
                    }
                });

                if (stockVal !== oldStock) {
                    const diff = stockVal - oldStock;
                    await tx.stock_mutations.create({
                        data: {
                            product_id: product_id,
                            from_branch_id: diff < 0 ? branch_id : null,
                            to_branch_id: diff > 0 ? branch_id : null,
                            quantity: Math.abs(diff),
                            type: "ADJUSTMENT",
                            notes: notes ?? `Opname stok mandiri oleh cabang (Stok lama: ${oldStock}, Stok baru: ${stockVal})`
                        }
                    });
                }
                return { success: true, action: "single_opname" };
            }

            throw new Error("Payload update stok tidak valid");
        });

        return NextResponse.json({ data: result, message: "Stok berhasil diperbarui" });
    } catch (error: any) {
        console.error("PATCH STOCKS ERROR:", error);
        return NextResponse.json({ error: error.message || "Gagal memperbarui data stok" }, { status: 500 });
    }
}
