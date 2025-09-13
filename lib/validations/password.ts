import { z } from 'zod';

export const passwordUpdateSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required').optional(), // Optional for users setting password for the first time
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be less than 100 characters'),
});

export type PasswordUpdateData = z.infer<typeof passwordUpdateSchema>;
