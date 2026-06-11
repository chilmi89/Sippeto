const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient();

async function main() {
  const newPhone = process.argv[2];
  if (!newPhone) {
    console.error("Error: Silakan masukkan nomor telepon baru.");
    console.error("Contoh penggunaan: node scratch/update-phone.js 08123456789");
    process.exit(1);
  }

  // Cari profile PT makmur jaya
  const profile = await prisma.profiles.findFirst({
    where: {
      business_name: {
        contains: "PT makmur jaya"
      }
    }
  });

  if (!profile) {
    console.error("Profile 'PT makmur jaya' tidak ditemukan di database.");
    process.exit(1);
  }

  console.log(`Mengubah nomor telepon untuk Profile ID: ${profile.id}...`);

  // Update nomor telepon profil
  await prisma.profiles.update({
    where: { id: profile.id },
    data: { phone_number: newPhone }
  });

  // Update nomor telepon semua cabang milik profil ini
  const updatedBranches = await prisma.branches.updateMany({
    where: { tenant_id: profile.id },
    data: { phone_number: newPhone }
  });

  console.log(`✅ Sukses memperbarui profil 'PT makmur jaya' dengan nomor: ${newPhone}`);
  console.log(`✅ Sukses memperbarui ${updatedBranches.count} cabang dengan nomor: ${newPhone}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
