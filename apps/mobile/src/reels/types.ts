export type ReelStatus = 'DRAFT' | 'PROCESSING' | 'PUBLISHED' | 'REJECTED' | 'DELETED';

export type ReelFeedItem = {
  id: string;
  status: ReelStatus;
  title: string | null;
  description: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  createdAt: string;
  likes: number;
  liked: boolean;
  videoPath: string;
};

export type ReelFeedResponse = {
  items: ReelFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type ReelEngagementResponse = {
  reelId: string;
  likes: number;
  liked: boolean;
};

export type ReelUploadResponse = {
  id: string;
  status: ReelStatus;
  mimeType: string;
  fileSizeBytes: string | null;
  createdAt: string;
};

export type ReelDetails = {
  id: string;
  status: ReelStatus;
  title: string | null;
  description: string | null;
  mimeType: string;
  durationSeconds: number | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt?: string;
  fileSizeBytes?: string | null;
  videoPath: string;
};
