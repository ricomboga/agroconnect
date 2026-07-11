import { z } from 'zod';

export const assignRoleSchema = z.object({
  roleId: z.string().min(1),
});

export type AssignRoleDto = z.infer<typeof assignRoleSchema>;

export const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;

export const createPermissionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreatePermissionDto = z.infer<typeof createPermissionSchema>;

export const attachPermissionSchema = z.object({
  permissionId: z.string().min(1),
});

export type AttachPermissionDto = z.infer<typeof attachPermissionSchema>;
