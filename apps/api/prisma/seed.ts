import { PrismaClient, UserRole, UserStatus, WorkerAvailabilityStatus, WorkerVerificationStatus, ReelModerationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const categories = [
  ['Electrician', 'electrician'],
  ['Plumber', 'plumber'],
  ['Carpenter', 'carpenter'],
  ['Painter', 'painter'],
  ['AC & Appliance Repair', 'ac-appliance-repair'],
  ['Cleaning', 'cleaning'],
  ['Home Shifting', 'home-shifting'],
  ['Beauty & Wellness', 'beauty-wellness'],
  ['Gardening', 'gardening'],
  ['Pest Control', 'pest-control'],
];

const demoWorkers = [
  { email: 'demo.electrician@worko.local', name: 'Aarav Electrician', category: 'electrician', caption: 'Safe electrical repairs and installations.' },
  { email: 'demo.plumber@worko.local', name: 'Rohan Plumbing', category: 'plumber', caption: 'Tap, pipe and bathroom plumbing services.' },
  { email: 'demo.carpenter@worko.local', name: 'Kabir Carpenter', category: 'carpenter', caption: 'Custom furniture and precise woodwork.' },
  { email: 'demo.cleaner@worko.local', name: 'Ishita Cleaning', category: 'cleaning', caption: 'Professional home deep-cleaning.' },
];

async function main() {
  const passwordHash = await bcrypt.hash('WorkoDemo@123', 12);

  for (const [name, slug] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug, isActive: true },
    });
  }

  await prisma.user.upsert({
    where: { email: 'demo.admin@worko.local' },
    update: { role: UserRole.ADMIN, status: UserStatus.ACTIVE, passwordHash },
    create: { email: 'demo.admin@worko.local', role: UserRole.ADMIN, status: UserStatus.ACTIVE, passwordHash },
  });

  const client = await prisma.user.upsert({
    where: { email: 'demo.client@worko.local' },
    update: { role: UserRole.CLIENT, status: UserStatus.ACTIVE, passwordHash },
    create: {
      email: 'demo.client@worko.local',
      role: UserRole.CLIENT,
      status: UserStatus.ACTIVE,
      passwordHash,
      clientProfile: { create: { fullName: 'Worko Demo Client', address: 'Baner, Pune, Maharashtra', latitude: 18.5590, longitude: 73.7868 } },
    },
  });

  // Ensure profile exists even when the demo user was created previously without it.
  await prisma.clientProfile.upsert({
    where: { userId: client.id },
    update: { fullName: 'Worko Demo Client', address: 'Baner, Pune, Maharashtra', latitude: 18.5590, longitude: 73.7868 },
    create: { userId: client.id, fullName: 'Worko Demo Client', address: 'Baner, Pune, Maharashtra', latitude: 18.5590, longitude: 73.7868 },
  });

  for (const worker of demoWorkers) {
    const user = await prisma.user.upsert({
      where: { email: worker.email },
      update: { role: UserRole.WORKER, status: UserStatus.ACTIVE, passwordHash },
      create: { email: worker.email, role: UserRole.WORKER, status: UserStatus.ACTIVE, passwordHash },
    });

    const profile = await prisma.workerProfile.upsert({
      where: { userId: user.id },
      update: { verificationStatus: WorkerVerificationStatus.VERIFIED, availabilityStatus: WorkerAvailabilityStatus.AVAILABLE, latitude: 18.5590, longitude: 73.7868 },
      create: { userId: user.id, verificationStatus: WorkerVerificationStatus.VERIFIED, availabilityStatus: WorkerAvailabilityStatus.AVAILABLE, latitude: 18.5590, longitude: 73.7868 },
    });

    const category = await prisma.category.findUniqueOrThrow({ where: { slug: worker.category } });
    await prisma.workerCategory.upsert({
      where: { workerId_categoryId: { workerId: profile.id, categoryId: category.id } },
      update: {},
      create: { workerId: profile.id, categoryId: category.id },
    });

    const existingReel = await prisma.reel.findFirst({ where: { creatorId: user.id, caption: worker.caption } });
    const reelData = {
      mediaUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
      caption: worker.caption,
      moderationStatus: ReelModerationStatus.APPROVED,
      publishedAt: new Date(),
    };
    if (existingReel) {
      await prisma.reel.update({ where: { id: existingReel.id }, data: reelData });
    } else {
      await prisma.reel.create({ data: { creatorId: user.id, ...reelData } });
    }
  }

  console.log('Worko development seed completed: categories, demo client, demo workers, worker categories and approved reels.');
  console.log('Demo login password for seeded accounts: WorkoDemo@123');
}

main()
  .catch((error) => {
    console.error('Worko seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
