import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = { Onboarding: undefined };
export type ClientTabParamList = { Home: undefined; Discover: undefined; Reels: undefined; Requests: undefined; Profile: undefined };
export type WorkerTabParamList = { Dashboard: undefined; Requests: undefined; Reels: undefined; Profile: undefined };
export type RootStackParamList = { Auth: NavigatorScreenParams<AuthStackParamList>; Client: NavigatorScreenParams<ClientTabParamList>; Worker: NavigatorScreenParams<WorkerTabParamList> };
