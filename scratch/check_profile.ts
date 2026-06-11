import prisma from "../src/lib/prisma";

async function main() {
  const profile = await prisma.profiles.findFirst({
    where: {
      business_name: {
        contains: "makmur jaya",
        mode: "insensitive"
      }
    }
  });

  console.log("PROFIL TOKO MAKMUR JAYA:");
  console.log("Business Name:", profile?.business_name);
  console.log("Phone Number:", profile?.phone_number);
  console.log("Username:", profile?.username);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
