import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = { Onboarding: undefined };
export type ClientTabParamList = {
  Home: undefined; Discover: undefined; Reels: undefined; Saved: undefined; Requests: undefined; Profile: undefined;
  Bookings: { stage?: string; bookingId?: string };
};
export type WorkerTabParamList = {
  Dashboard: undefined;
  Requests: undefined;
  Reels: undefined;
  Profile: undefined;
  Availability: undefined;
  Preferences: undefined;
  NoOffers: { updated?: boolean } | undefined;
  IncomingOffer: { offerId: string };
  OfferDetail: { offerId: string };
  JobFlow: { bookingId: string; stage?: 'navigate'|'start'|'checkin'|'before'|'startwork'|'progress'|'complete'|'summary'|'return' };
  WorkerAccount: { stage: 'notifications'|'chat'|'profile'|'editProfile'|'settings'|'support'|'dispute'|'safety'|'logout' };
  WorkerWallet: undefined;
};
export type RootStackParamList = { Auth: NavigatorScreenParams<AuthStackParamList>; Client: { accessToken: string }; Worker: NavigatorScreenParams<WorkerTabParamList> };
