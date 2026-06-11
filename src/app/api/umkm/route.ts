import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { id, full_name, business_name, phone_number, address, email } = body;

        // Validasi minimal
        if (!email || !full_name) {
            return NextResponse.json(
                { error: "Nama lengkap dan email wajib diisi" },
                { status: 400 }
            );
        }

        /**
         * 1. Ambil ID role 'Owner'
         * Kita upgrade role user dari UMKM (pendaftaran awal) menjadi Owner
         * setelah mereka melengkapi data bisnis.
         */
        const ownerRole = await prisma.roles.findUnique({
            where: { name: 'Owner' }
        });

        const profile = await prisma.profiles.upsert({
            where: { id: id || "generate-temp-id" },
            update: {
                full_name,
                business_name: business_name ?? null,
                phone_number: phone_number ?? null,
                address: address ?? null,
                role_id: ownerRole?.id, // Otomatis jadi OWNER
                is_active: true,
            },
            create: {
                id: id,
                full_name,
                email,
                business_name: business_name ?? null,
                phone_number: phone_number ?? null,
                address: address ?? null,
                role_id: ownerRole?.id, // Otomatis jadi OWNER
                is_active: true,
            },
        });

        return NextResponse.json(
            { message: "Registrasi UMKM Berhasil. Anda sekarang adalah Owner.", profile },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("POST UMKM ERROR:", error);
        return NextResponse.json({ error: "Gagal memproses data UMKM" }, { status: 500 });
    }
}

export async function PATCH(req: Request) {
    try {
        const body = await req.json();
        const { id, business_name, phone_number, address, full_name, bio, avatar_url, banner_url, username, payment_qr, metadata } = body;

        if (!id) {
            return NextResponse.json({ error: "ID Profile tidak ditemukan" }, { status: 400 });
        }

        // Validasi keunikan dan format username
        let cleanUsername = undefined;
        if (username !== undefined) {
            if (username === null || username.trim() === "") {
                cleanUsername = null;
            } else {
                const trimmed = username.trim().toLowerCase();
                if (!/^[a-z0-9-]+$/.test(trimmed)) {
                    return NextResponse.json({ error: "Username hanya boleh berisi huruf kecil, angka, dan tanda hubung (-)." }, { status: 400 });
                }
                const existing = await prisma.profiles.findFirst({
                    where: {
                        username: trimmed,
                        id: { not: id }
                    }
                });
                if (existing) {
                    return NextResponse.json({ error: "Username toko ini sudah digunakan oleh UMKM lain. Silakan pilih username lain." }, { status: 400 });
                }
                cleanUsername = trimmed;
            }
        }

        // Cari role Owner untuk memastikan role di-upgrade jika belum
        const ownerRole = await prisma.roles.findUnique({
            where: { name: 'Owner' }
        });

        const updated = await prisma.profiles.update({
            where: { id },
            data: {
                full_name: full_name !== undefined ? full_name : undefined,
                business_name: business_name !== undefined ? business_name : undefined,
                phone_number: phone_number !== undefined ? phone_number : undefined,
                address: address !== undefined ? address : undefined,
                bio: bio !== undefined ? bio : undefined,
                avatar_url: avatar_url !== undefined ? avatar_url : undefined,
                banner_url: banner_url !== undefined ? banner_url : undefined,
                username: cleanUsername, // Memperbarui username/slug toko (bisa bernilai undefined, null, atau string)
                role_id: ownerRole?.id, // Pastikan role jadi OWNER saat data lengkap
                payment_qr: payment_qr !== undefined ? payment_qr : undefined,
                metadata: metadata !== undefined ? metadata : undefined,
            },
            select: {
                id: true,
                full_name: true,
                business_name: true,
                email: true,
                phone_number: true,
                address: true,
                bio: true,
                avatar_url: true,
                banner_url: true,
                is_active: true,
                role_id: true,
                username: true,
                created_at: true,
                payment_qr: true,
                metadata: true,
            },
        });

        return NextResponse.json(
            { message: "Profil UMKM Berhasil Dilengkapi. Role Anda telah di-upgrade menjadi Owner.", profile: updated },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("PATCH UMKM ERROR:", error);
        return NextResponse.json({ error: "Gagal memperbarui data UMKM" }, { status: 500 });
    }
}
