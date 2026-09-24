import { PrismaClient, UserRole, WorkerStatus, ReelStatus } from '@prisma/client';

const prisma = new PrismaClient();

const JOB_TYPES = ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'AC Technician', 'Cleaner'];
const FIRST_NAMES = ['Rahul', 'Amit', 'Priya', 'Vikram', 'Neha', 'Suresh', 'Anita', 'Ravi', 'Pooja', 'Karan'];
const LAST_NAMES = ['Sharma', 'Verma', 'Patil', 'Desai', 'Singh', 'Joshi', 'Mishra', 'Kumar', 'Rao', 'Das'];

// Reliable public MP4 test videos (Mix of aspect ratios for testing)
const DUMMY_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4'
];

async function main() {
  console.log('Seeding 50 dummy workers and reels...');

  for (let i = 1; i <= 50; i++) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const job = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];
    const phone = `+9190000${i.toString().padStart(5, '0')}`;
    const rate = Math.floor(Math.random() * 500) + 200; // 200 to 700

    // 1. Create User
    const user = await prisma.user.create({
      data: {
        role: UserRole.WORKER,
        firstName,
        lastName,
        phoneNumber: phone,
        email: `worker${i}@worko.test`,
        phoneVerified: true,
      }
    });

    // 2. Create Worker Profile
    const worker = await prisma.worker.create({
      data: {
        userId: user.id,
        status: WorkerStatus.VERIFIED,
        profilePhotoKey: `https://i.pravatar.cc/300?img=${(i % 70) + 1}`,
        bio: `Professional ${job} with over ${Math.floor(Math.random() * 10) + 1} years of experience.`,
        expectedHourlyRate: rate,
        isAvailable: true,
      }
    });

    // 3. Create 1-2 Reels for each worker
    const numReels = Math.random() > 0.5 ? 2 : 1;
    for (let r = 0; r < numReels; r++) {
      const videoKey = DUMMY_VIDEOS[Math.floor(Math.random() * DUMMY_VIDEOS.length)];
      
      await prisma.reel.create({
        data: {
          workerId: worker.id,
          status: ReelStatus.PUBLISHED,
          title: `${job} Work - Project ${r + 1}`,
          description: `Just finished this amazing ${job.toLowerCase()} job for a client. Quality guaranteed!`,
          videoKey: videoKey,
          thumbnailKey: `https://picsum.photos/seed/${worker.id}${r}/400/600`, // Random thumbnail
          mimeType: 'video/mp4',
        }
      });
    }

    console.log(`Created Worker ${i}/50: ${firstName} (${job})`);
  }

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });