import React from "react";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import StorefrontClient from "@/components/store/StorefrontClient";

type Params = Promise<{ username: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { username } = await params;

  const profile = await prisma.profiles.findUnique({
    where: { username },
    select: { business_name: true, bio: true, username: true },
  });

  if (!profile) {
    return {
      title: "Toko Tidak Ditemukan - SiPetto",
      description: "Halaman toko UMKM tidak ditemukan di ekosistem SiPetto.",
    };
  }

  const storeTitle = profile.business_name || profile.username || username;
  return {
    title: `${storeTitle} - E-Catalog Online SiPetto`,
    description:
      profile.bio ||
      `Temukan produk-produk terbaik dari ${storeTitle} dengan pemesanan praktis via WhatsApp.`,
  };
}

export default async function StorePage({ params }: { params: Params }) {
  const { username } = await params;

  const profile = await prisma.profiles.findUnique({
    where: { username },
    include: {
      products: {
        where: { is_active: true },
        include: {
          product_categories: {
            select: { name: true },
          },
          product_stocks: {
            select: { stock: true, branch_id: true },
          },
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!profile) {
    notFound();
  }

  const branches = await prisma.branches.findMany({
    where: { tenant_id: profile.id, is_active: true },
    select: { id: true, name: true, address: true, phone_number: true, payment_qr: true },
    orderBy: { name: "asc" },
  });

  const serializedProfile = {
    id: profile.id,
    business_name: profile.business_name,
    full_name: profile.full_name,
    email: profile.email,
    phone_number: profile.phone_number,
    address: profile.address,
    avatar_url: profile.avatar_url,
    banner_url: profile.banner_url,
    bio: profile.bio,
    username: profile.username,
    created_at: profile.created_at?.toISOString() || null,
    payment_qr: profile.payment_qr,
  };

  const serializedProducts = profile.products.map((p) => ({
    id: p.id,
    profile_id: p.profile_id,
    category_id: p.category_id,
    name: p.name,
    description: p.description,
    base_price: Number(p.base_price),
    sell_price: Number(p.sell_price),
    image_url: p.image_url,
    is_active: p.is_active ?? true,
    product_categories: p.product_categories
      ? { name: p.product_categories.name }
      : null,
    product_stocks: p.product_stocks.map((s) => ({
      stock: s.stock,
      branch_id: s.branch_id,
    })),
  }));

  const serializedBranches = branches.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    phone_number: b.phone_number,
    payment_qr: b.payment_qr,
  }));

  return (
    <StorefrontClient
      profile={serializedProfile}
      products={serializedProducts}
      branches={serializedBranches}
    />
  );
}