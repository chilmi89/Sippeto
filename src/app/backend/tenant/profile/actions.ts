"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProfileAction(payload: {
  id: string;
  full_name?: string;
  business_name?: string | null;
  phone_number?: string | null;
  address?: string | null;
  bio?: string | null;
  avatar_url?: string;
  banner_url?: string;
  username?: string | null;
  payment_qr?: string | null;
}) {
  try {
    const {
      id,
      full_name,
      business_name,
      phone_number,
      address,
      bio,
      avatar_url,
      banner_url,
      username,
      payment_qr,
    } = payload;

    if (!id) {
      return { status: "error", message: "ID Profile tidak ditemukan" };
    }

    // Validasi keunikan dan format username
    let cleanUsername: string | null = null;
    if (username !== undefined && username !== null) {
      const trimmed = username.trim().toLowerCase();
      if (trimmed !== "") {
        if (!/^[a-z0-9-]+$/.test(trimmed)) {
          return {
            status: "error",
            message: "Username hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).",
          };
        }
        const existing = await prisma.profiles.findFirst({
          where: {
            username: trimmed,
            id: { not: id },
          },
        });
        if (existing) {
          return {
            status: "error",
            message: "Username toko ini sudah digunakan oleh UMKM lain. Silakan pilih username lain.",
          };
        }
        cleanUsername = trimmed;
      }
    }

    // Cari role Owner untuk memastikan role di-upgrade jika belum
    const ownerRole = await prisma.roles.findUnique({
      where: { name: "Owner" },
    });

    const updated = await prisma.profiles.update({
      where: { id },
      data: {
        full_name: full_name ?? undefined,
        business_name: business_name ?? null,
        phone_number: phone_number ?? null,
        address: address ?? null,
        bio: bio ?? null,
        avatar_url: avatar_url ?? undefined,
        banner_url: banner_url ?? undefined,
        username: cleanUsername,
        role_id: ownerRole?.id,
        payment_qr: payment_qr !== undefined ? payment_qr : undefined,
      },
    });

    revalidatePath("/backend/tenant/profile");
    return { status: "success", data: updated };
  } catch (error) {
    console.error("updateProfileAction error:", error);
    return { status: "error", message: "Gagal memperbarui profil." };
  }
}
