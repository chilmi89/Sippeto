import prisma from "../src/lib/prisma";

async function main() {
  console.log("Memulai eksekusi DDL SQL...");
  
  // SQL DDL tabel orders
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "orders" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "profile_id" UUID REFERENCES "profiles"("id") ON DELETE CASCADE,
        "branch_id" UUID REFERENCES "branches"("id") ON DELETE SET NULL,
        "reference_number" VARCHAR(100) UNIQUE NOT NULL,
        "customer_name" VARCHAR(255) NOT NULL,
        "customer_phone" VARCHAR(20) NOT NULL,
        "customer_address" TEXT,
        "payment_method" VARCHAR(50) NOT NULL,
        "total_price" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
        "status" VARCHAR(50) DEFAULT 'PENDING' NOT NULL,
        "created_at" TIMESTAMPTZ(6) DEFAULT now(),
        "updated_at" TIMESTAMPTZ(6) DEFAULT now()
    );
  `);
  console.log("Tabel 'orders' berhasil dibuat/diverifikasi.");

  // SQL DDL tabel order_items
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "order_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "order_id" UUID REFERENCES "orders"("id") ON DELETE CASCADE,
        "product_id" UUID REFERENCES "products"("id") ON DELETE CASCADE,
        "quantity" INTEGER DEFAULT 1 NOT NULL,
        "price" DECIMAL(15, 2) DEFAULT 0 NOT NULL,
        "created_at" TIMESTAMPTZ(6) DEFAULT now()
    );
  `);
  console.log("Tabel 'order_items' berhasil dibuat/diverifikasi.");
}

main()
  .catch((e) => {
    console.error("Terjadi error saat mengeksekusi DDL SQL:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
