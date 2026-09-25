import type { NavigatorScreenParams } from '@react-navigation/native';
import { OtpChannel } from '../../services/authService';

export type RequirementPayload = {
  category: string;
  location: string;
  description: string;
  budget: string;
};

export type MatchedWorkerPayload = {
  name: string;
  job: string;
  rating: string;
  eta: string;
  avatar: string;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined; 
  VerifyOTP: { 
    identifier: string; 
    channel: OtpChannel; 
    purpose: 'LOGIN' | 'REGISTRATION' 
  };
};

export type ClientTabParamList = {
  ClientHome: undefined;
  ClientRequirements: undefined;
  ClientActivity: undefined;
  ClientProfile: undefined;
};

// NEW: Stack wrapper for Client side to allow full-screen overlays (Searching & Matched)
export type ClientStackParamList = {
  ClientTabs: NavigatorScreenParams<ClientTabParamList>;
  ClientSearching: { requirementData: RequirementPayload };
  WorkerMatched: { workerData: MatchedWorkerPayload };
};

export type WorkerTabParamList = {
  WorkerHome: undefined;
  WorkerRequests: undefined;
  WorkerReels: undefined;
  WorkerProfile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  ClientApp: NavigatorScreenParams<ClientStackParamList>;
  WorkerApp: undefined; 
};