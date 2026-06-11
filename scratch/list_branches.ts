import prisma from "../src/lib/prisma";

async function main() {
  const branches = await prisma.branches.findMany({
    include: {
      tenant: {
        select: {
          username: true,
          full_name: true,
        }
      }
    }
  });

  console.log("DAFTAR BRANCHES DI DATABASE:");
  console.log(JSON.stringify(branches, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
