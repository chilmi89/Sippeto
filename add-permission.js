const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const permName = 'kelola_cabang';
  
  // Create or get permission
  let perm = await prisma.permissions.findUnique({
    where: { name: permName }
  });
  
  if (!perm) {
    perm = await prisma.permissions.create({
      data: { name: permName }
    });
    console.log(`Created permission: ${permName}`);
  } else {
    console.log(`Permission ${permName} already exists.`);
  }

  // Find owner role
  const ownerRole = await prisma.roles.findUnique({
    where: { name: 'owner' }
  });

  if (ownerRole) {
    // Assign to owner
    await prisma.role_permissions.upsert({
      where: {
        role_id_permission_id: {
          role_id: ownerRole.id,
          permission_id: perm.id,
        }
      },
      update: {},
      create: {
        role_id: ownerRole.id,
        permission_id: perm.id,
      }
    });
    console.log('Assigned kelola_cabang to owner role');
  } else {
    console.log('Owner role not found');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
