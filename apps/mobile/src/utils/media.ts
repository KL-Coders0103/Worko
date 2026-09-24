import { ENV } from '../config/env'; // Adjust path if needed

export function getMediaUrl(key: string | null | undefined): string | undefined {
  if (!key) return undefined;
  
  // If the backend already returns a full HTTP URL, just use it
  if (key.startsWith('http')) return key;
  
  // Construct the Cloudinary URL using your cloud name
  return `https://res.cloudinary.com/${ENV.CLOUDINARY_CLOUD_NAME}/image/upload/${key}`;
}