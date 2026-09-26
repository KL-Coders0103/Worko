export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'SUPPORT'
  | 'CLIENT'
  | 'WORKER';

export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'DELETED';

export type OtpPurpose =
  | 'LOGIN'
  | 'REGISTRATION'
  | 'PHONE_VERIFICATION'
  | 'EMAIL_VERIFICATION';

export type OtpChannel = 'EMAIL' | 'SMS';

export interface WorkoUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  status: UserStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RegisterResponse {
  message: string;
  user: WorkoUser;
}

export interface AuthResponse {
  message: string;
  user: WorkoUser;
  tokens: AuthTokens;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  role: Extract<UserRole, 'CLIENT' | 'WORKER'>;
}

export interface OtpInput {
  identifier: string;
  otp: string;
  purpose?: OtpPurpose;
  channel?: OtpChannel;
}

export interface SendOtpInput {
  identifier: string;
  purpose?: OtpPurpose;
  channel?: OtpChannel;
}

export interface LoginInput {
  identifier: string;
  otp: string;
  channel?: OtpChannel;
}

export interface GoogleAuthInput {
  idToken: string;
}
