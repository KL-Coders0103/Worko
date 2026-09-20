export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  VerifyOtp: {
    identifier: string;
    purpose: 'REGISTRATION' | 'LOGIN';
  };
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};