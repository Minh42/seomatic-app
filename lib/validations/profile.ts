import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim()
    .optional(),
  firstName: z
    .string()
    .max(50, 'First name must be less than 50 characters')
    .trim()
    .optional(),
  lastName: z
    .string()
    .max(50, 'Last name must be less than 50 characters')
    .trim()
    .optional(),
  image: z.string().url('Invalid image URL').optional().nullable(),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
