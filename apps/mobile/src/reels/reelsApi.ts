import {workoApi} from '../api/apiClient';
import type {ReelDetails, ReelEngagementResponse, ReelFeedResponse} from './types';

export const reelsApi = {
  getFeed: async (limit = 10, cursor?: string): Promise<ReelFeedResponse> => {
    const response = await workoApi.get<ReelFeedResponse>('/reels/feed', {
      params: {limit, ...(cursor ? {cursor} : {})},
    });
    return response.data;
  },

  getReel: async (reelId: string): Promise<ReelDetails> =>
    (await workoApi.get<ReelDetails>(`/reels/${reelId}`)).data,

  like: async (reelId: string): Promise<ReelEngagementResponse> =>
    (await workoApi.post<ReelEngagementResponse>(`/reels/${reelId}/like`)).data,

  unlike: async (reelId: string): Promise<ReelEngagementResponse> =>
    (await workoApi.delete<ReelEngagementResponse>(`/reels/${reelId}/like`)).data,

  getEngagement: async (reelId: string): Promise<ReelEngagementResponse> =>
    (await workoApi.get<ReelEngagementResponse>(`/reels/${reelId}/engagement`)).data,
};
