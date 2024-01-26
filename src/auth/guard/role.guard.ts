import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../user/roles.enum';
import { ROLE_KEY } from '../decorator/required-role.decorator';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    // Reflector reads Metadata from Roles-Decorator
    const requiredRole = this.reflector.getAllAndOverride<Role>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If developer does not put any roles in the @RequiredRole Decorator the route can be accessed
    if (!requiredRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    return requiredRole === request.user.role;
  }
}
