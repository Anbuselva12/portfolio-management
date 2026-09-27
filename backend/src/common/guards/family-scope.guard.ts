import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_FAMILY_SCOPED_KEY } from '../decorators/family-scoped.decorator';

@Injectable()
export class FamilyScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isFamilyScoped = this.reflector.getAllAndOverride<boolean>(IS_FAMILY_SCOPED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isFamilyScoped) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.status === 'pending_approval') {
      throw new ForbiddenException('User is pending approval and cannot access family resources');
    }

    if (!user.familyId) {
      throw new ForbiddenException('User is not part of a family');
    }

    // Usually, you would check if request body/params family_id matches user.familyId.
    // By enforcing all resources are scoped, you can inject user.familyId into services instead of trusting the request.
    return true;
  }
}
