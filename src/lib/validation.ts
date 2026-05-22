import { z } from 'zod';

export const createCardSchema = z.object({
  title: z.string().min(1).max(256),
  description: z.string().max(5000).nullable().optional(),
  position: z.number().finite().optional()
});

export const createColumnSchema = z.object({
  name: z.string().min(1).max(256)
});

export const moveCardSchema = z.object({
  newColumnId: z.number().int().positive(),
  newPosition: z.number().finite().optional(),
  afterCardId: z.number().int().positive().nullable().optional(),
  beforeCardId: z.number().int().positive().nullable().optional()
});

export const updateCardSchema = z
  .object({
    title: z.string().min(1).max(256).optional(),
    description: z.string().max(5000).nullable().optional()
  })
  .refine((data) => data.title !== undefined || data.description !== undefined, {
    message: 'At least one field is required.'
  });
