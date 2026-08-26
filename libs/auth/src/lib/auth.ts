import type {
  Permission,
  Role,
  TaskItem,
  User,
} from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';

/**
 * Central RBAC policy used by the API when authorizing an action.
 * Resource ownership and organization scope must be checked separately.
 */
export const ROLE_PERMISSIONS: Readonly<Record<Role, readonly Permission[]>> = {
  owner: [
    'task:read',
    'task:create',
    'task:update',
    'task:delete',
    'audit:read',
    'role:manage',
  ],
  admin: [
    'task:read',
    'task:create',
    'task:update',
    'task:delete',
    'audit:read',
  ],
  viewer: ['task:read', 'task:create', 'task:update'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

type TaskAccessUser = Pick<User, 'id' | 'role' | 'organizationId'>;

type TaskAccessResource = Pick<
  TaskItem,
  'organizationId' | 'createdByUserId' | 'assigneeId'
>;

/**
 * Owners and admins can access every task in their organization. Viewers can
 * access only tasks they created or that are assigned to them.
 */
export function canAccessTask(
  user: TaskAccessUser,
  task: TaskAccessResource,
): boolean {
  if (user.organizationId !== task.organizationId) {
    return false;
  }

  if (user.role === 'owner' || user.role === 'admin') {
    return true;
  }

  return task.createdByUserId === user.id || task.assigneeId === user.id;
}

export function canPerformTaskAction(
  user: TaskAccessUser,
  task: TaskAccessResource,
  permission: Extract<Permission, `task:${string}`>,
): boolean {
  return hasPermission(user.role, permission) && canAccessTask(user, task);
}

type RoleManagementUser = Pick<User, 'id' | 'role' | 'organizationId'>;

/**
 * An owner can promote a viewer to admin or demote an admin to viewer within
 * their own organization. Owner accounts cannot be changed through this rule.
 */
export function canManageAdminRole(
  actor: RoleManagementUser,
  target: RoleManagementUser,
  nextRole: Role,
): boolean {
  return (
    hasPermission(actor.role, 'role:manage') &&
    actor.organizationId === target.organizationId &&
    actor.id !== target.id &&
    target.role !== 'owner' &&
    (nextRole === 'admin' || nextRole === 'viewer')
  );
}
