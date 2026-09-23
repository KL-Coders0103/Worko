export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: {
    identifier: string;
    purpose: 'REGISTRATION' | 'LOGIN';
    channel: 'EMAIL' | 'SMS'
  };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};