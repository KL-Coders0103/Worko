import { z } from 'zod';

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name is too long'),

  lastName: z
    .string()
    .trim()
    .max(50, 'Last name is too long')
    .optional()
    .or(z.literal('')),

  email: z
    .string()
    .trim()
    .email('Enter a valid email address'),

  phoneNumber: z
    .string()
    .trim()
    .regex(
      /^\+?[0-9]{10,15}$/,
      'Enter a valid phone number',
    ),

  role: z.enum(['CLIENT', 'WORKER']),
});

export type RegisterFormData = z.infer<typeof registerSchema>;