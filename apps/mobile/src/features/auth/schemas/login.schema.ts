import { z } from 'zod';

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Email or phone number is required')
    .refine(
      value => {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

        const normalizedPhone = value.replace(/\s+/g, '');
        const isPhone = /^\+?[0-9]{10,15}$/.test(normalizedPhone);

        return isEmail || isPhone;
      },
      {
        message: 'Enter a valid email or phone number',
      },
    ),
});

export type LoginFormData = z.infer<typeof loginSchema>;