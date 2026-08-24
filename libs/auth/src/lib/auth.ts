import type {
  Permission,
  Role,
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
  ],
  admin: [
    'task:read',
    'task:create',
    'task:update',
    'task:delete',
    'audit:read',
  ],
  viewer: ['task:read'],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
