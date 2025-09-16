import { z } from 'zod';

/**
 * Schema for workspace name validation
 */
export const workspaceNameSchema = z
  .string()
  .min(2, 'Workspace name must be at least 2 characters')
  .max(50, 'Workspace name must not exceed 50 characters')
  .regex(
    /^[a-zA-Z0-9\s\-_]+$/,
    'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'
  )
  .transform(val => val.trim());

/**
 * Schema for workspace creation
 */
export const createWorkspaceSchema = z.object({
  name: workspaceNameSchema,
  description: z.string().max(500).optional(),
});

/**
 * Schema for workspace update
 */
export const updateWorkspaceSchema = z.object({
  name: workspaceNameSchema.optional(),
  description: z.string().max(500).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
