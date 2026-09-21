import {api} from '../../services/api';

export type DiscoveryCategory = {
  id: string;
  name: string;
  slug: string;
};

export type DiscoverySkill = {
  id: string;
  name: string;
  slug: string;
};

export type DiscoveryLocation = {
  latitude: string;
  longitude: string;
  accuracyMeters: string | null;
};

export type DiscoveryWorker = {
  id: string;
  name: string;
  profilePhotoKey: string | null;
  bio: string | null;
  experienceYears: number | null;
  expectedHourlyRate: string | null;
  expectedDailyRate: string | null;
  isAvailable: boolean;
  verified: boolean;
  verifiedAt: string | null;
  categories: DiscoveryCategory[];
  skills: DiscoverySkill[];
  location: DiscoveryLocation | null;
  distanceKm: number | null;
};

export type DiscoveryResponse = {
  workers: DiscoveryWorker[];
  count: number;
  locationSearch: {
    latitude: number;
    longitude: number;
    radiusKm: number | null;
  } | null;
};

export type DiscoveryQuery = {
  search?: string;
  category?: string;
  skill?: string;
  available?: boolean;
  verified?: boolean;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
};

export async function discoverWorkers(
  query: DiscoveryQuery = {},
): Promise<DiscoveryResponse> {
  const params: Record<string, string | number | boolean> = {};

  if (query.search?.trim()) {
    params.search = query.search.trim();
  }

  if (query.category) {
    params.category = query.category;
  }

  if (query.skill) {
    params.skill = query.skill;
  }

  if (query.available !== undefined) {
    params.available = query.available;
  }

  if (query.verified !== undefined) {
    params.verified = query.verified;
  }

  if (query.latitude !== undefined) {
    params.latitude = query.latitude;
  }

  if (query.longitude !== undefined) {
    params.longitude = query.longitude;
  }

  if (query.radiusKm !== undefined) {
    params.radiusKm = query.radiusKm;
  }

  const response = await api.get<DiscoveryResponse>(
    '/discovery/workers',
    {
      params,
    },
  );

  return response.data;
}