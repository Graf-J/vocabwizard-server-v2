import { SetMetadata } from '@nestjs/common';
import { Role } from '../../user/roles.enum';

export const ROLE_KEY = 'role';

export function RequiredRole(role: Role) {
  return SetMetadata(ROLE_KEY, role);
}
