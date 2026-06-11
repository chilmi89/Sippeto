import prisma from "../src/lib/prisma";

async function main() {
  const profiles = await prisma.profiles.findMany({
    select: {
      id: true,
      business_name: true,
      full_name: true,
      phone_number: true,
      username: true,
    }
  });

  console.log("DAFTAR PROFILES DI DATABASE:");
  console.log(JSON.stringify(profiles, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
