export type AuthStackParamList = {
  AuthLanding: undefined;
  Login: undefined;
  Register: undefined;
  VerifyOtp: {
    identifier: string;
    purpose: 'LOGIN' | 'REGISTRATION';
    channel: 'EMAIL' | 'SMS';
  };
};

export type AppTabParamList = {
  Home: undefined;
  Jobs: undefined;
  Reels: undefined;
  Profile: undefined;
};

export type AppStackParamList = {
  Home: undefined;
};

export type RootStackParamList = {
  Startup: undefined;
  Onboarding: undefined;
};
