import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fixing publishedAt dates for existing reels...');
  
  const result = await prisma.reel.updateMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: null,
    },
    data: {
      publishedAt: new Date(),
    },
  });

  console.log(`✅ Fixed ${result.count} reels!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });