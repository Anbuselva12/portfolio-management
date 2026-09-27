import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const defaultCategories = [
  'Groceries',
  'Electricity',
  'Gas/LPG',
  'Internet',
  'Fuel',
  'Medical',
  'Education',
  'Dining Out',
  'Entertainment',
  'Rent',
  'Others',
];

async function main() {
  console.log('Seeding default data...');
  // As this seed might run multiple times, typically default categories are seeded per family upon creation,
  // but if we are just creating some initial templates globally or for a test family, here it is:
  // Let's create a test family and seed categories for it.
  
  let family = await prisma.family.findFirst({ where: { name: 'Seed Family' } });
  if (!family) {
    family = await prisma.family.create({
      data: {
        name: 'Seed Family',
        base_currency: 'INR',
        country: 'IN',
        join_policy: 'open',
        is_discoverable: true,
      },
    });
  }

  for (const name of defaultCategories) {
    const existing = await prisma.expenseCategory.findFirst({
      where: { family_id: family.id, name },
    });
    if (!existing) {
      await prisma.expenseCategory.create({
        data: {
          name,
          family_id: family.id,
        },
      });
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
