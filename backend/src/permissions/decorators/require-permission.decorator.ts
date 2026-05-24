import { SetMetadata } from '@nestjs/common';
import type { PermissionSlug } from '../permissions.registry';

export const PERMISSION_KEY = 'required_permission';
export const RequirePermission = (slug: PermissionSlug) =>
  SetMetadata(PERMISSION_KEY, slug);
