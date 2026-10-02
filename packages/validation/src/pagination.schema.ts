import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type PaginationInput = z.infer<typeof paginationSchema>;
export type PaginationMetaInput = z.infer<typeof paginationMetaSchema>;

export const getPaginationOffset = ({ page, limit }: PaginationInput): number => (page - 1) * limit;

export const createPaginationMeta = (page: number, limit: number, total: number): PaginationMetaInput => {
  const totalPages = Math.ceil(total / limit);
  return { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 && totalPages > 0 };
};
