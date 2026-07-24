import { User } from '../types/index';

export type Role = 'admin' | 'user';

export type Permission = 
  | 'read:dashboard'
  | 'manage:users'
  | 'manage:plans'
  | 'view:analytics'
  | 'access:admin_panel';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'read:dashboard',
    'manage:users',
    'manage:plans',
    'view:analytics',
    'access:admin_panel',
  ],
  user: [
    'read:dashboard',
  ],
};

/**
 * Checks if a user has a specific permission based on role.
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  const role: Role = user.role === 'admin' ? 'admin' : 'user';
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Checks if a user is authorized for administrative actions.
 */
export function canAccessAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.role === 'admin';
}
