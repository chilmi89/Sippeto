const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const profiles = await prisma.profiles.findMany({
    include: {
      owned_branches: true
    }
  });
  console.log("=== PROFILES ===");
  profiles.forEach(p => {
    console.log(`ID: ${p.id}, Email: ${p.email}, Business: ${p.business_name}, BranchID: ${p.branch_id}, Branches Count: ${p.owned_branches.length}`);
    if (p.owned_branches.length > 0) {
      console.log("Branches:", p.owned_branches.map(b => b.name));
    }
  });
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
