import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import type { AccessTokenPayload } from '../jwt.service';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => {
  return (
    target: object,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    Reflect.defineMetadata(
      ROLES_KEY,
      roles,
      descriptor?.value ?? target,
    );
  };
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const requiredRoles =
      this.reflector.getAllAndOverride<string[]>(
        ROLES_KEY,
        [
          context.getHandler(),
          context.getClass(),
        ],
      );

    if (!requiredRoles?.length) {
      return true;
    }

    const request =
      context.switchToHttp().getRequest<
        Request & { user: AccessTokenPayload }
      >();

    const userRole = request.user?.role;

    if (!userRole || !requiredRoles.includes(userRole)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }
}