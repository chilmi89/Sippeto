// File tipe bersama untuk semua komponen store
// Dipisah agar tidak ada circular dependency dengan lazy imports

export interface Product {
  id: string;
  profile_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  base_price: number;
  sell_price: number;
  image_url: string | null;
  is_active: boolean;
  product_categories: { name: string } | null;
  product_stocks: { stock: number; branch_id: string }[];
}

export interface Profile {
  id: string;
  business_name: string | null;
  full_name: string | null;
  email: string;
  phone_number: string | null;
  address: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  username: string | null;
  created_at: string | null;
  payment_qr?: string | null;
  metadata?: any;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone_number: string | null;
  payment_qr?: string | null;
}

export interface VirtualProduct {
  virtualId: string;
  originalProduct: Product;
  branchId: string;
  branchName: string;
  displayName: string;
  stock: number;
  phone_number: string | null;
}

export interface CartItem {
  virtualProduct: VirtualProduct;
  quantity: number;
}

export const formatCurrency = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(v);
