import { prisma } from '@agroconnect/db/auth';

export async function createRole(name: string, description?: string) {
  return prisma.role.create({ data: { name, description } });
}

export async function createPermission(name: string, description?: string) {
  return prisma.permission.create({ data: { name, description } });
}

export async function listRoles() {
  return prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function listPermissions() {
  return prisma.permission.findMany({ orderBy: { name: 'asc' } });
}

export async function attachPermissionToRole(roleId: string, permissionId: string) {
  return prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId, permissionId } },
    create: { roleId, permissionId },
    update: {},
  });
}

export async function detachPermissionFromRole(roleId: string, permissionId: string) {
  await prisma.rolePermission.delete({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
}

export async function assignRoleToUser(userId: string, roleId: string, assignedByUserId?: string) {
  return prisma.userRoleAssignment.upsert({
    where: { userId_roleId: { userId, roleId } },
    create: { userId, roleId, assignedByUserId },
    update: { assignedByUserId, assignedAt: new Date() },
  });
}

export async function revokeRoleFromUser(userId: string, roleId: string) {
  await prisma.userRoleAssignment.delete({
    where: { userId_roleId: { userId, roleId } },
  });
}

export async function getUserRoles(userId: string) {
  return prisma.userRoleAssignment.findMany({
    where: { userId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });
}

export async function getUserPermissionNames(userId: string): Promise<string[]> {
  const assignments = await getUserRoles(userId);
  const names = new Set<string>();
  for (const assignment of assignments) {
    for (const rp of assignment.role.permissions) {
      names.add(rp.permission.name);
    }
  }
  return [...names];
}
