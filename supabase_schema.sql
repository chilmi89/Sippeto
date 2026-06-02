-- =========================================================================
-- SQL SCHEMA FOR SIPETTO (Supabase/PostgreSQL)
-- Core Database Schema with Multi-Tenant, Multi-Branch, and Connected Stocks
-- =========================================================================

-- 1. Roles Table
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Roles
INSERT INTO public.roles (name) VALUES ('Admin'), ('UMKM'), ('Owner') ON CONFLICT (name) DO NOTHING;

-- 2. Permissions Table
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Role Permissions (Junction Table)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Profiles Table (Linked to auth.users in Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL, 
    password VARCHAR(255), 
    full_name VARCHAR(255), 
    business_name VARCHAR(255),
    username VARCHAR(100) UNIQUE, -- Ditambahkan untuk slug URL katalog toko (/store/[username])
    phone_number VARCHAR(20), 
    address TEXT, 
    avatar_url TEXT, 
    banner_url TEXT, 
    bio TEXT, 
    is_active BOOLEAN DEFAULT TRUE,
    metadata JSONB DEFAULT '{}',
    branch_id UUID, -- Didefinisikan nanti setelah tabel branches dibuat
    payment_qr TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Branches Table (Multi-Branch Support)
CREATE TABLE IF NOT EXISTS public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    phone_number VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    payment_qr TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah foreign key branch_id ke profiles setelah tabel branches terbuat
ALTER TABLE public.profiles 
ADD CONSTRAINT fk_profiles_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;

-- 6. Categories Table (Master Data Kategorisasi)
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('pengeluaran', 'pemasukan')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, name, type)
);

-- 7. Payment Methods (Master Data Metode Pembayaran)
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, name)
);

-- 8. Kategori Produk Table (Master Data Kategori Khusus Produk)
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, name)
);

-- 9. Products Table (Master Data Produk tingkat Tenant Pusat)
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE, -- Tambahan: kolom branch_id untuk produk cabang
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_price NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Harga Beli / Harga Modal
    sell_price NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Harga Jual Dasar
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Product Stocks Table (Stok Fisik per Cabang)
CREATE TABLE IF NOT EXISTS public.product_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, branch_id)
);

-- 10. Stock Mutations Table (Log Transfer/Pergerakan Stok)
CREATE TABLE IF NOT EXISTS public.stock_mutations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    from_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    to_branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    quantity INT NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'TRANSFER', 'ADJUSTMENT', 'RESTOCK', 'SALE'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Transaction Groups (HEADER / NOTA KASIR)
CREATE TABLE IF NOT EXISTS public.transaction_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL, -- Cabang transaksi dibuat
    reference_number VARCHAR(100) UNIQUE,
    transaction_date DATE DEFAULT CURRENT_DATE,
    total_income NUMERIC(15, 2) DEFAULT 0,
    total_expense NUMERIC(15, 2) DEFAULT 0,
    net_balance NUMERIC(15, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Transaction Items (DETAIL / ITEM NOTA)
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.transaction_groups(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    payment_method_id UUID REFERENCES public.payment_methods(id) ON DELETE SET NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL, -- Ditambahkan untuk relasi ke master produk
    type VARCHAR(20) CHECK (type IN ('INCOME', 'EXPENSE')) NOT NULL,
    name VARCHAR(255),
    amount NUMERIC(15, 2) DEFAULT 0,
    quantity INTEGER DEFAULT 1 NOT NULL, -- Ditambahkan untuk mencatat jumlah barang
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Transaction Attachments
CREATE TABLE IF NOT EXISTS public.transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.transaction_groups(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- TRIGGERS & UTILITY FUNCTIONS
-- =========================================================================

-- Helper Function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_branches_modtime BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_products_modtime BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_product_stocks_modtime BEFORE UPDATE ON public.product_stocks FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Sesi Kalkulator Keuangan Sisi Server untuk Group Transaksi
CREATE OR REPLACE FUNCTION update_group_financials()
RETURNS TRIGGER AS $$
DECLARE
    target_group_id UUID;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_group_id := OLD.group_id;
    ELSE
        target_group_id := NEW.group_id;
    END IF;

    UPDATE public.transaction_groups
    SET 
        total_income = (SELECT COALESCE(SUM(amount), 0) FROM public.transaction_items WHERE group_id = target_group_id AND type = 'INCOME'),
        total_expense = (SELECT COALESCE(SUM(amount), 0) FROM public.transaction_items WHERE group_id = target_group_id AND type = 'EXPENSE'),
        net_balance = (
            (SELECT COALESCE(SUM(amount), 0) FROM public.transaction_items WHERE group_id = target_group_id AND type = 'INCOME') - 
            (SELECT COALESCE(SUM(amount), 0) FROM public.transaction_items WHERE group_id = target_group_id AND type = 'EXPENSE')
        )
    WHERE id = target_group_id;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_financials ON public.transaction_items;
CREATE TRIGGER trg_update_financials
AFTER INSERT OR UPDATE OR DELETE ON public.transaction_items
FOR EACH ROW EXECUTE FUNCTION update_group_financials();

-- Trigger Supabase: Auto-create Profile on Auth Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role_id)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'nama'),
    (SELECT id FROM public.roles WHERE name = 'UMKM' LIMIT 1)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Map Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Branches Policies
CREATE POLICY "Manage own branches" ON public.branches FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY "View branch if staff or owner" ON public.branches FOR SELECT USING (
    tenant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.branch_id = branches.id
    )
);

-- 3. Categories Policies
CREATE POLICY "Manage Categories" ON public.categories FOR ALL USING (auth.uid() = profile_id);

-- 4. Payment Methods Policies
CREATE POLICY "Manage Payment Methods" ON public.payment_methods FOR ALL USING (auth.uid() = profile_id);

-- 4b. Product Categories Policies
CREATE POLICY "Product categories are viewable by everyone" ON public.product_categories FOR SELECT USING (true);
CREATE POLICY "Manage own product categories" ON public.product_categories FOR ALL USING (auth.uid() = profile_id);

-- 5. Products Policies
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (is_active = true);
CREATE POLICY "Manage own products" ON public.products FOR ALL USING (auth.uid() = profile_id);

-- 6. Product Stocks Policies
CREATE POLICY "Stocks are viewable by branch staff/owners" ON public.product_stocks FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.branches b 
        WHERE b.id = branch_id 
        AND (b.tenant_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.branch_id = b.id
        ))
    )
);
CREATE POLICY "Manage stocks via branch owner" ON public.product_stocks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.branches b 
        WHERE b.id = branch_id 
        AND b.tenant_id = auth.uid()
    )
);

-- 7. Stock Mutations Policies
CREATE POLICY "Mutations are viewable by branch staff/owners" ON public.stock_mutations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_id 
        AND p.profile_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM public.branches b 
        WHERE (b.id = from_branch_id OR b.id = to_branch_id) 
        AND (b.tenant_id = auth.uid() OR EXISTS (
            SELECT 1 FROM public.profiles pr WHERE pr.id = auth.uid() AND pr.branch_id = b.id
        ))
    )
);
CREATE POLICY "Insert mutations by owners" ON public.stock_mutations FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.products p 
        WHERE p.id = product_id 
        AND p.profile_id = auth.uid()
    )
);

-- 8. Transaction Groups Policies
CREATE POLICY "Manage Groups" ON public.transaction_groups FOR ALL USING (auth.uid() = profile_id);

-- 9. Transaction Items Policies
CREATE POLICY "Manage Items via Group" ON public.transaction_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.transaction_groups g WHERE g.id = group_id AND g.profile_id = auth.uid())
);

-- =========================================================================
-- FUTURE FEATURES SCHEMA (FASE 5: ORDERS & ORDER ITEMS)
-- =========================================================================

CREATE TYPE order_status AS ENUM ('PENDING', 'SUCCESS', 'CANCELLED');

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    reference_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status order_status DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    price NUMERIC(15, 2) NOT NULL DEFAULT 0
);

-- RLS for orders and order_items
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Manage own orders" ON public.orders FOR ALL USING (auth.uid() = profile_id);
CREATE POLICY "Public can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Manage own order items" ON public.order_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.profile_id = auth.uid())
);
CREATE POLICY "Public can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Trigger to update updated_at on orders
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_profile_id ON public.orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch_id ON public.orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
