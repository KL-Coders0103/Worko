import { z } from 'zod';

export const uuidSchema = z.uuid();

export const nonEmptyStringSchema = z.string().trim().min(1);

export const emailSchema = z.email().transform((value) => value.toLowerCase());

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Phone number must use international format');
