import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ─── 1. GET — Daftar Tenant (UMKM) dengan pagination, search, filter status ──
// Query params: page, limit, search, status (aktif | nonaktif | semua)

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);

        const page   = Math.max(1, Number(searchParams.get("page")  ?? 1));
        const limit  = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 10)));
        const search = searchParams.get("search") ?? undefined;
        const status = searchParams.get("status") ?? "semua"; // aktif | nonaktif | semua

        const where = {
            // Exclude admin roles — hanya tampilkan profile yang bukan admin
            // jika ingin filter role, tambahkan: roles: { name: "umkm" }
            ...(search && {
                OR: [
                    { full_name:     { contains: search, mode: "insensitive" as const } },
                    { business_name: { contains: search, mode: "insensitive" as const } },
                    { email:         { contains: search, mode: "insensitive" as const } },
                ],
            }),
            ...(status === "aktif"    && { is_active: true }),
            ...(status === "nonaktif" && { is_active: false }),
        };

        // Ambil total stat + data paginasi secara paralel
        const [total, aktif, nonaktif, data] = await Promise.all([
            prisma.profiles.count({ where: {} }),
            prisma.profiles.count({ where: { is_active: true } }),
            prisma.profiles.count({ where: { is_active: false } }),
            prisma.profiles.findMany({
                where,
                orderBy: { created_at: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                select: {
                    id:            true,
                    full_name:     true,
                    business_name: true,
                    email:         true,
                    phone_number:  true,
                    is_active:     true,
                    created_at:    true,
                    avatar_url:    true,
                    metadata:      true,
                    roles:         { select: { name: true } },
                },
            }),
        ]);

        return NextResponse.json({
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            stats: {
                total,
                aktif,
                nonaktif,
                menunggu: nonaktif, // alias: nonaktif = menunggu verifikasi
            },
        });
    } catch (error) {
        console.error("GET ADMIN TENANT ERROR:", error);
        return NextResponse.json({ error: "Gagal mengambil data tenant" }, { status: 500 });
    }
}

// ─── 2. PATCH — Ubah status aktif / nonaktif tenant atau fitur cabang ─────────
// Body: { id, is_active, branches_enabled }

export async function PATCH(req: Request) {
    try {
        const { id, is_active, branches_enabled } = await req.json();

        if (!id) {
            return NextResponse.json({ error: "ID tenant wajib disertakan" }, { status: 400 });
        }

        let dataToUpdate: any = {};
        
        if (is_active !== undefined) {
            dataToUpdate.is_active = is_active;
        }

        if (branches_enabled !== undefined) {
            const profile = await prisma.profiles.findUnique({
                where: { id },
                select: { metadata: true }
            });
            const meta = profile?.metadata ? (typeof profile.metadata === 'string' ? JSON.parse(profile.metadata) : profile.metadata) as Record<string, any> : {};
            meta.branches_enabled = branches_enabled;
            dataToUpdate.metadata = meta;
        }

        const updated = await prisma.profiles.update({
            where: { id },
            data: dataToUpdate,
            select: { 
                id: true, 
                full_name: true, 
                business_name: true, 
                is_active: true,
                metadata: true
            },
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Tenant tidak ditemukan" }, { status: 404 });
        }
        console.error("PATCH ADMIN TENANT ERROR:", error);
        return NextResponse.json({ error: "Gagal memperbarui status tenant" }, { status: 500 });
    }
}
