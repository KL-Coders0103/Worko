import {api} from '../../services/api';

export type ReelWorker = {
  id: string;
  profilePhotoKey: string | null;
  bio: string | null;
  expectedHourlyRate: string | null;
  expectedDailyRate: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
};

export type Reel = {
  id: string;
  status: 'PUBLISHED';
  title: string | null;
  description: string | null;
  videoKey: string;
  thumbnailKey: string | null;
  durationSeconds: number | null;
  publishedAt: string;
  createdAt: string;
  worker: ReelWorker;
  likes: number;
  liked: boolean;
};

export type ReelFeedResponse = {
  items: Reel[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ReelEngagement = {
  reelId: string;
  likes: number;
  liked: boolean;
};

export async function getReelsFeed(
  limit = 10,
  cursor?: string,
): Promise<ReelFeedResponse> {
  const params = new URLSearchParams();

  params.append('limit', String(limit));

  if (cursor) {
    params.append('cursor', cursor);
  }

  const response = await api.get<ReelFeedResponse>(
    `/reels/feed?${params.toString()}`,
  );

  return response.data;
}

export async function getReel(
  reelId: string,
): Promise<Reel> {
  const response = await api.get<Reel>(
    `/reels/${reelId}`,
  );

  return response.data;
}

export async function getWorkerReels(
  workerId: string,
): Promise<Reel[]> {
  const response = await api.get<Reel[]>(
    `/reels/worker/${workerId}`,
  );

  return response.data;
}

export async function likeReel(
  reelId: string,
): Promise<{
  reelId: string;
  liked: boolean;
}> {
  const response = await api.post<{
    reelId: string;
    liked: boolean;
  }>(`/reels/${reelId}/like`);

  return response.data;
}

export async function unlikeReel(
  reelId: string,
): Promise<{
  reelId: string;
  liked: boolean;
}> {
  const response = await api.delete<{
    reelId: string;
    liked: boolean;
  }>(`/reels/${reelId}/like`);

  return response.data;
}

export async function getReelEngagement(
  reelId: string,
): Promise<ReelEngagement> {
  const response = await api.get<ReelEngagement>(
    `/reels/${reelId}/engagement`,
  );

  return response.data;
}

export type UploadReelResponse = {
  id: string;
  status: 'DRAFT';
  videoKey: string;
  mimeType: string;
  fileSizeBytes: string | null;
  createdAt: string;
};

export async function uploadReelVideo(
  uri: string,
  fileName: string,
  mimeType: string,
  onUploadProgress?: (
    progress: number,
  ) => void,
): Promise<UploadReelResponse> {
  const formData = new FormData();

  formData.append(
    'file',
    {
      uri,
      name: fileName,
      type: mimeType,
    } as any,
  );

  const response =
    await api.post<UploadReelResponse>(
      '/reels/upload',
      formData,
      {
        onUploadProgress: event => {
          if (!event.total) {
            return;
          }

          const progress =
            event.loaded / event.total;

          onUploadProgress?.(
            Math.min(
              Math.max(progress, 0),
              1,
            ),
          );
        },
      },
    );

  return response.data;
}

export type UpdateReelPayload = {
  title?: string;
  description?: string;
  durationSeconds?: number;
};

export async function updateReel(
  reelId: string,
  payload: UpdateReelPayload,
) {
  const response = await api.patch(
    `/reels/${reelId}`,
    payload,
  );

  return response.data;
}

export async function publishReel(
  reelId: string,
) {
  const response = await api.post(
    `/reels/${reelId}/publish`,
  );

  return response.data;
}

export async function deleteReel(
  reelId: string,
) {
  const response = await api.delete(
    `/reels/${reelId}`,
  );

  return response.data;
}

