import { z } from 'zod';

import { uuidSchema } from './common.schema.js';

export const createRequirementSchema = z.object({
  categoryId: uuidSchema,
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(10_000),
  budget: z.coerce.number().positive().max(1_000_000).optional(),
  currency: z.string().length(3).default('INR'),
  scheduledAt: z.coerce.date().optional(),
  location: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address: z.string().trim().min(5).max(500),
  }),
});

export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;
