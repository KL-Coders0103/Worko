import { PrismaClient, UserRole, WorkerStatus, ReelStatus } from '@prisma/client';

// Add your Pexels API Key here
const PEXELS_API_KEY = 'RDDyFo7ER7a7wq0quhKNJL5zqthY2SnEZVX6cBfstB6oaG2QOAm8EJ6O'; 

const prisma = new PrismaClient();

const JOB_TYPES = ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'AC Technician', 'Cleaner'];
const FIRST_NAMES = ['Rahul', 'Amit', 'Priya', 'Vikram', 'Neha', 'Suresh', 'Anita', 'Ravi', 'Pooja', 'Karan', 'Sunil', 'Kiran', 'Sneha', 'Raj'];
const LAST_NAMES = ['Sharma', 'Verma', 'Patil', 'Desai', 'Singh', 'Joshi', 'Mishra', 'Kumar', 'Rao', 'Das', 'Gupta', 'Mehta', 'Nair'];

// Helper to fetch vertical videos from Pexels API
async function fetchPexelsVideos(query: string, count: number): Promise<string[]> {
  try {
    const response = await fetch(`https://api.pexels.com/videos/search?query=${query}&orientation=portrait&per_page=${count}`, {
      headers: {
        Authorization: PEXELS_API_KEY
      }
    });
    
    if (!response.ok) {
      console.warn(`Pexels API failed for query: ${query}. Returning fallbacks.`);
      return [];
    }

    const data = await response.json();
    
    // Extract the HD .mp4 link from each video result
    return data.videos.map((video: any) => {
      const hdFile = video.video_files.find((file: any) => file.quality === 'hd');
      return hdFile ? hdFile.link : video.video_files[0].link;
    });
  } catch (error) {
    console.warn(`Failed to fetch Pexels videos for ${query}`);
    return [];
  }
}

// Fallback videos just in case Pexels fails or hits a rate limit
const FALLBACK_VIDEOS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
];

async function main() {
  console.log('Fetching live vertical videos from Pexels...');
  
  // Pre-fetch videos for each trade
  const tradeVideos: Record<string, string[]> = {};
  for (const job of JOB_TYPES) {
    const query = job === 'AC Technician' ? 'HVAC' : job;
    console.log(`Pulling ${job} reels...`);
    const videos = await fetchPexelsVideos(query, 15); // Get 15 distinct vertical videos per trade
    tradeVideos[job] = videos.length > 0 ? videos : FALLBACK_VIDEOS;
  }

  console.log('Seeding 50 unique dummy workers and reels...');
  const usedPersonas = new Set<string>();
  let i = 1;

  while (i <= 50) {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const job = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];
    
    const personaKey = `${firstName} ${lastName} - ${job}`;
    if (usedPersonas.has(personaKey)) continue;
    usedPersonas.add(personaKey);

    const phone = `+9170000${i.toString().padStart(5, '0')}`;
    const rate = Math.floor(Math.random() * 500) + 200;

    // 1. Create User
    const user = await prisma.user.create({
      data: {
        role: UserRole.WORKER,
        firstName,
        lastName,
        phoneNumber: phone,
        email: `worker${Date.now()}${i}@worko.test`,
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

    // 3. Create Reels
    const numReels = Math.random() > 0.5 ? 2 : 1;
    const availableVideos = tradeVideos[job];
    
    // Pick random unique videos for this worker from the Pexels array
    const shuffledVideos = [...availableVideos].sort(() => 0.5 - Math.random());
    const assignedVideos = shuffledVideos.slice(0, numReels);

    for (let r = 0; r < numReels; r++) {
      await prisma.reel.create({
        data: {
          workerId: worker.id,
          status: ReelStatus.PUBLISHED,
          title: `${job} Project - Client Site`,
          description: `Just finished this amazing ${job.toLowerCase()} job for a client. Quality guaranteed!`,
          videoKey: assignedVideos[r], // This is now a real Pexels .mp4 URL
          thumbnailKey: `https://picsum.photos/seed/${worker.id}${r}/400/600`,
          mimeType: 'video/mp4',
        }
      });
    }

    console.log(`Created Worker ${i}/50: ${firstName} ${lastName} (${job})`);
    i++;
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