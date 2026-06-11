const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profiles.findMany({
    select: {
      id: true,
      email: true,
      business_name: true,
      phone_number: true,
      owned_branches: {
        select: {
          name: true,
          phone_number: true
        }
      }
    }
  });
  console.log("=== PROFILES WITH PHONE NUMBERS ===");
  profiles.forEach(p => {
    console.log(`ID: ${p.id}, Business: ${p.business_name}, Phone: ${p.phone_number}`);
    p.owned_branches.forEach(b => {
      console.log(`  - Branch: ${b.name}, Phone: ${b.phone_number}`);
    });
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
