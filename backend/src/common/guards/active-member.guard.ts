import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class ActiveMemberGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (user.status === 'pending_approval' || user.status === 'deactivated' || !user.isActive) {
      throw new ForbiddenException('User is not active');
    }

    return true;
  }
}
