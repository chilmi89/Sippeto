import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── 1. GET — Daftar Transaction Groups ───────────────────────────────────────
// Query params: profile_id, search (reference_number), date_start, date_end, page, limit
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const id         = searchParams.get("id") ?? undefined;
        const profile_id = searchParams.get("profile_id") ?? undefined;
        const branch_id  = searchParams.get("branch_id") ?? undefined;
        const search     = searchParams.get("search") ?? undefined;
        const date_start = searchParams.get("date_start") ?? undefined;
        const date_end   = searchParams.get("date_end") ?? undefined;
        const page       = Math.max(1, Number(searchParams.get("page") ?? 1));
        const limit      = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 10)));

        // Jika ID diberikan, lakukan pencatatan spesifik
        if (id) {
            const tx = await prisma.transaction_groups.findUnique({
                where: { id },
                include: {
                    transaction_items: {
                        include: {
                            categories: true,
                            payment_methods: true
                        }
                    },
                    transaction_attachments: true
                }
            });
            return NextResponse.json({ data: tx ? [tx] : [], total: tx ? 1 : 0 });
        }

        const where = {
            ...(profile_id && { profile_id }),
            ...(branch_id  && { branch_id }),
            ...(search     && { reference_number: { contains: search, mode: "insensitive" as const } }),
            ...((date_start || date_end) && {
                transaction_date: {
                    ...(date_start && { gte: new Date(date_start) }),
                    ...(date_end   && { lte: new Date(date_end) }),
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
                            payment_methods: true
                        }
                    },
                    transaction_attachments: true
                }
            }),
        ]);

        return NextResponse.json({
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error("GET TRANSACTION GROUPS ERROR:", error);
        return NextResponse.json({ error: "Gagal mengambil data transaksi" }, { status: 500 });
    }
}

// ─── 2. POST — Tambah Transaction Group ──────────────────────────────────────
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            profile_id, 
            branch_id, 
            reference_number, 
            transaction_date, 
            description, 
            items,
            customer_name,
            customer_phone,
            customer_address,
            order_status
        } = body;

        if (!profile_id) {
            return NextResponse.json({ error: "Profile ID wajib disertakan" }, { status: 400 });
        }

        // Helper untuk mapping type sesuai constraint database (INCOME / EXPENSE)
        const mapType = (t: string) => {
            const low = t.toLowerCase();
            if (low === "pemasukan" || low === "income") return "INCOME";
            if (low === "pengeluaran" || low === "expense") return "EXPENSE";
            return t.toUpperCase();
        };

        // Hitung total income & expense dari items jika disertakan saat create
        let total_income = 0;
        let total_expense = 0;

        if (items && Array.isArray(items)) {
            items.forEach((item: any) => {
                const amount = Number(item.amount || 0);
                const mappedType = mapType(item.type);
                if (mappedType === "INCOME") total_income += amount;
                if (mappedType === "EXPENSE") total_expense += amount;
            });
        }

        const net_balance = total_income - total_expense;

        const newGroup = await prisma.$transaction(async (tx) => {
            const group = await tx.transaction_groups.create({
                data: {
                    profile_id,
                    branch_id: branch_id ?? null,
                    reference_number,
                    transaction_date: transaction_date ? new Date(transaction_date) : undefined,
                    description,
                    total_income,
                    total_expense,
                    net_balance,
                    customer_name: customer_name ?? null,
                    customer_phone: customer_phone ?? null,
                    customer_address: customer_address ?? null,
                    order_status: order_status !== undefined ? Number(order_status) : 6, // Default to 6 (Selesai/Lunas)
                    ...(items && items.length > 0 && {
                        transaction_items: {
                            create: items.map((item: any) => ({
                                category_id: item.category_id,
                                payment_method_id: item.payment_method_id,
                                type: mapType(item.type),
                                name: item.name,
                                amount: item.amount,
                                product_id: item.product_id ?? null,
                                quantity: item.quantity !== undefined ? Number(item.quantity) : 1
                            }))
                        }
                    })
                },
                include: {
                    transaction_items: true
                }
            });

            // Auto-deduct stock and record mutations if branch_id is present and status is completed/lunas (6)
            const resolvedStatus = order_status !== undefined ? Number(order_status) : 6;
            if (branch_id && resolvedStatus === 6 && items && Array.isArray(items)) {
                for (const item of items) {
                    if (item.product_id) {
                        const qty = item.quantity !== undefined ? Number(item.quantity) : 1;
                        // Decrement branch stock
                        await tx.product_stocks.updateMany({
                            where: {
                                product_id: item.product_id,
                                branch_id: branch_id
                            },
                            data: {
                                stock: { decrement: qty }
                            }
                        });
                        // Log mutation log
                        await tx.stock_mutations.create({
                            data: {
                                product_id: item.product_id,
                                from_branch_id: branch_id,
                                to_branch_id: null,
                                quantity: qty,
                                type: "SALE",
                                notes: `Penjualan POS Kasir - Nota #${reference_number || group.reference_number || group.id.slice(0, 8)}`
                            }
                        });
                    }
                }
            }

            return group;
        });

        return NextResponse.json(newGroup, { status: 201 });
    } catch (error) {
        console.error("POST TRANSACTION GROUP ERROR:", error);
        return NextResponse.json({ error: "Gagal membuat transaksi" }, { status: 500 });
    }
}

// ─── 3. PATCH — Ubah Transaksi ──────────────────────────────────────────────
export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, items, ...data } = body;

        if (!id) {
            return NextResponse.json({ error: "ID transaksi wajib disertakan" }, { status: 400 });
        }

        // Helper mapping
        const mapType = (t: string) => {
            const low = t.toLowerCase();
            if (low === "pemasukan" || low === "income") return "INCOME";
            if (low === "pengeluaran" || low === "expense") return "EXPENSE";
            return t.toUpperCase();
        };

        // Jika mengubah tanggal, pastikan menggunakan objek Date
        if (data.transaction_date) {
            data.transaction_date = new Date(data.transaction_date);
        }

        // Parse order_status to number if it is provided
        if (data.order_status !== undefined) {
            data.order_status = Number(data.order_status);
        }

        // Jika items disertakan, hitung ulang total dan update secara atomik
        if (items && Array.isArray(items)) {
            let total_income = 0;
            let total_expense = 0;

            items.forEach((item: any) => {
                const amount = Number(item.amount || 0);
                const mappedType = mapType(item.type);
                if (mappedType === "INCOME") total_income += amount;
                if (mappedType === "EXPENSE") total_expense += amount;
            });

            const net_balance = total_income - total_expense;

            // Update Group, Hapus Item lama, Tambah Item baru (Transaction)
            const updated = await prisma.$transaction(async (tx) => {
                // Fetch the existing transaction group along with its items
                const existingGroup = await tx.transaction_groups.findUnique({
                    where: { id },
                    include: { transaction_items: true }
                });

                if (!existingGroup) {
                    throw new Error("Transaksi tidak ditemukan");
                }

                // 1. Revert old stock if old transaction was Lunas (6) and has branch
                if (existingGroup.order_status === 6 && existingGroup.branch_id) {
                    for (const item of existingGroup.transaction_items) {
                        if (item.product_id) {
                            const qty = item.quantity ? Number(item.quantity) : 1;
                            // Revert (increment) stock
                            await tx.product_stocks.updateMany({
                                where: {
                                    product_id: item.product_id,
                                    branch_id: existingGroup.branch_id
                                },
                                data: {
                                    stock: { increment: qty }
                                }
                            });
                            // Log reversal mutation
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
                await tx.transaction_items.deleteMany({ where: { group_id: id } });

                // Determine target status and target branch
                const finalStatus = data.order_status !== undefined ? Number(data.order_status) : (existingGroup.order_status ?? 6);
                const finalBranchId = data.branch_id !== undefined ? data.branch_id : existingGroup.branch_id;

                // Update Group
                const group = await tx.transaction_groups.update({
                    where: { id },
                    data: {
                        ...data,
                        total_income,
                        total_expense,
                        net_balance,
                        transaction_items: {
                            create: items.map((item: any) => ({
                                category_id: item.category_id,
                                payment_method_id: item.payment_method_id,
                                type: mapType(item.type),
                                name: item.name,
                                amount: item.amount,
                                product_id: item.product_id ?? null,
                                quantity: item.quantity !== undefined ? Number(item.quantity) : 1
                            }))
                        }
                    },
                    include: { transaction_items: true }
                });

                // 2. Apply new stock deduction if final status is Lunas (6) and has branch
                if (finalStatus === 6 && finalBranchId) {
                    for (const item of items) {
                        if (item.product_id) {
                            const qty = item.quantity !== undefined ? Number(item.quantity) : 1;
                            // Deduct stock
                            await tx.product_stocks.updateMany({
                                where: {
                                    product_id: item.product_id,
                                    branch_id: finalBranchId
                                },
                                data: {
                                    stock: { decrement: qty }
                                }
                            });
                            // Log sale mutation
                            await tx.stock_mutations.create({
                                data: {
                                    product_id: item.product_id,
                                    from_branch_id: finalBranchId,
                                    to_branch_id: null,
                                    quantity: qty,
                                    type: "SALE",
                                    notes: `Penjualan POS Kasir (Update) - Nota #${group.reference_number || group.id.slice(0, 8)}`
                                }
                            });
                        }
                    }
                }

                return group;
            });

            return NextResponse.json(updated);
        }

        const updated = await prisma.$transaction(async (tx) => {
            const resolvedStatus = data.order_status !== undefined ? Number(data.order_status) : undefined;
            let isTransitioningFromSuccess = false;
            let isTransitioningToSuccess = false;
            let targetBranchId: string | null = null;

            const existingGroup = await tx.transaction_groups.findUnique({
                where: { id },
                include: { transaction_items: true }
            });

            if (existingGroup) {
                targetBranchId = existingGroup.branch_id;
                if (resolvedStatus !== undefined) {
                    if (existingGroup.order_status === 6 && resolvedStatus !== 6) {
                        isTransitioningFromSuccess = true;
                    } else if (existingGroup.order_status !== 6 && resolvedStatus === 6) {
                        isTransitioningToSuccess = true;
                    }
                }
            }

            const group = await tx.transaction_groups.update({
                where: { id },
                data,
                include: { transaction_items: true }
            });

            // Revert stock if transitioning FROM success
            if (isTransitioningFromSuccess && targetBranchId && existingGroup) {
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

            return group;
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("PATCH TRANSACTION GROUP ERROR:", error);
        return NextResponse.json({ error: "Gagal memperbarui transaksi" }, { status: 500 });
    }
}

// ─── 4. DELETE — Hapus Transaksi ─────────────────────────────────────────────
export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID transaksi wajib disertakan" }, { status: 400 });
        }

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
                                data: {
                                    stock: { increment: qty }
                                }
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

        return NextResponse.json({ message: "Transaksi berhasil dihapus" });
    } catch (error) {
        console.error("DELETE TRANSACTION GROUP ERROR:", error);
        return NextResponse.json({ error: "Gagal menghapus transaksi" }, { status: 500 });
    }
}
