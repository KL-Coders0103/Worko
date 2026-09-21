import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Industrial',
    slug: 'industrial',
    description: 'Industrial and factory-related work',
    sortOrder: 1,
    skills: [
      {name: 'Machine Operator', slug: 'machine-operator', sortOrder: 1},
      {name: 'Factory Worker', slug: 'factory-worker', sortOrder: 2},
      {name: 'Production Worker', slug: 'production-worker', sortOrder: 3},
      {name: 'Warehouse Worker', slug: 'warehouse-worker', sortOrder: 4},
      {name: 'Loader / Unloader', slug: 'loader-unloader', sortOrder: 5},
      {name: 'Packaging Worker', slug: 'packaging-worker', sortOrder: 6},
    ],
  },
  {
    name: 'Security',
    slug: 'security',
    description: 'Security and protection services',
    sortOrder: 2,
    skills: [
      {name: 'Security Guard', slug: 'security-guard', sortOrder: 1},
      {name: 'Security Supervisor', slug: 'security-supervisor', sortOrder: 2},
      {name: 'Gate Security', slug: 'gate-security', sortOrder: 3},
      {name: 'Event Security', slug: 'event-security', sortOrder: 4},
    ],
  },
  {
    name: 'Domestic',
    slug: 'domestic',
    description: 'Domestic and household services',
    sortOrder: 3,
    skills: [
      {name: 'Domestic Helper', slug: 'domestic-helper', sortOrder: 1},
      {name: 'House Cleaning', slug: 'house-cleaning', sortOrder: 2},
      {name: 'Cook', slug: 'cook', sortOrder: 3},
      {name: 'Babysitter', slug: 'babysitter', sortOrder: 4},
      {name: 'Elder Care', slug: 'elder-care', sortOrder: 5},
      {name: 'Maid', slug: 'maid', sortOrder: 6},
    ],
  },
  {
    name: 'Technical',
    slug: 'technical',
    description: 'Technical and skilled services',
    sortOrder: 4,
    skills: [
      {name: 'Electrician', slug: 'electrician', sortOrder: 1},
      {name: 'Plumber', slug: 'plumber', sortOrder: 2},
      {name: 'Carpenter', slug: 'carpenter', sortOrder: 3},
      {name: 'Painter', slug: 'painter', sortOrder: 4},
      {name: 'AC Technician', slug: 'ac-technician', sortOrder: 5},
      {name: 'Appliance Repair', slug: 'appliance-repair', sortOrder: 6},
    ],
  },
];

async function main() {
  console.log('Seeding Worko categories and skills...');

  for (const categoryData of categories) {
    const category = await prisma.category.upsert({
      where: {
        slug: categoryData.slug,
      },
      update: {
        name: categoryData.name,
        description: categoryData.description,
        sortOrder: categoryData.sortOrder,
        status: 'ACTIVE',
      },
      create: {
        name: categoryData.name,
        slug: categoryData.slug,
        description: categoryData.description,
        sortOrder: categoryData.sortOrder,
        status: 'ACTIVE',
      },
    });

    for (const skillData of categoryData.skills) {
        await prisma.skill.upsert({
            where: {
            categoryId_slug: {
                categoryId: category.id,
                slug: skillData.slug,
            },
            },
            update: {
            name: skillData.name,
            categoryId: category.id,
            sortOrder: skillData.sortOrder,
            status: 'ACTIVE',
            },
            create: {
            name: skillData.name,
            slug: skillData.slug,
            categoryId: category.id,
            sortOrder: skillData.sortOrder,
            status: 'ACTIVE',
            },
        });
    }

    console.log(`✓ ${category.name}`);
  }

  console.log('Worko category and skill seed completed.');
}

main()
  .catch(error => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });