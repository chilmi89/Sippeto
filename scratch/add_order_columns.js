const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  console.log("Running migration to add order columns to transaction_groups...");
  
  // 1. Add customer_name
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.transaction_groups 
      ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255) DEFAULT NULL;
    `);
    console.log("Added customer_name column successfully.");
  } catch (e) {
    console.error("Error adding customer_name column:", e.message);
  }

  // 2. Add customer_phone
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.transaction_groups 
      ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20) DEFAULT NULL;
    `);
    console.log("Added customer_phone column successfully.");
  } catch (e) {
    console.error("Error adding customer_phone column:", e.message);
  }

  // 3. Add customer_address
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.transaction_groups 
      ADD COLUMN IF NOT EXISTS customer_address TEXT DEFAULT NULL;
    `);
    console.log("Added customer_address column successfully.");
  } catch (e) {
    console.error("Error adding customer_address column:", e.message);
  }

  // 4. Add order_status
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE public.transaction_groups 
      ADD COLUMN IF NOT EXISTS order_status INT DEFAULT 6;
    `);
    console.log("Added order_status column successfully.");
  } catch (e) {
    console.error("Error adding order_status column:", e.message);
  }

  console.log("Migration complete!");
}

main()
  .catch(e => console.error("Migration failed:", e))
  .finally(() => prisma.$disconnect());
