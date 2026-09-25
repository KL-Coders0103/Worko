import { z } from 'zod';

export const otpSchema = z.object({
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit OTP'),
});

export type OtpFormData = z.infer<typeof otpSchema>;