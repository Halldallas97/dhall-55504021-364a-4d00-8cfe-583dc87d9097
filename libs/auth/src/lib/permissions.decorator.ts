import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@dhall-55504021-364a-4d00-8cfe-583dc87d9097/data';

export const PERMISSIONS_KEY = 'permissions';

export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
