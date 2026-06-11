import prisma from "../src/lib/prisma";

async function main() {
  const profile = await prisma.profiles.findFirst({
    where: {
      phone_number: "083136830913"
    }
  });

  const branch = await prisma.branches.findFirst({
    where: {
      phone_number: "083136830913"
    }
  });

  console.log("HASIL PENCARIAN NOMOR TELEPON 083136830913:");
  console.log("Profile ditemukan:", JSON.stringify(profile, null, 2));
  console.log("Branch ditemukan:", JSON.stringify(branch, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
