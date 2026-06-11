import prisma from "../src/lib/prisma";

async function main() {
  const updated = await prisma.profiles.update({
    where: {
      id: "0c518ec4-b623-4503-8639-8cd17bb63339"
    },
    data: {
      business_name: "PT makmur jaya",
      phone_number: "083136830913"
    }
  });

  console.log("PROFIL BERHASIL DIPULIHKAN:");
  console.log("ID:", updated.id);
  console.log("Business Name:", updated.business_name);
  console.log("Phone Number:", updated.phone_number);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
