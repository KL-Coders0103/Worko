import { OtpChannel } from '../../services/authService';

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

export type WorkerTabParamList = {
  WorkerHome: undefined;
  WorkerRequests: undefined;
  WorkerReels: undefined;
  WorkerProfile: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  ClientApp: undefined;
  WorkerApp: undefined;
};