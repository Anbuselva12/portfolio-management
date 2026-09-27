import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, user, url } = request;

    // We only care about mutating requests
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle().pipe(
        tap(async (data) => {
          // Fire and forget audit log creation
          // Ideally, actions, entity types, etc. would be extracted from the route or response
          // A robust implementation would use a service, but this is a simplified version.
          try {
            if (user) {
               await this.prisma.auditLogEntry.create({
                  data: {
                    family_id: user.familyId || null,
                    member_id: user.sub || null,
                    entity_type: url.split('/')[3] || 'unknown', // e.g. api/v1/assets -> assets
                    entity_id: data?.id || 'unknown',
                    action: method === 'POST' ? 'create' : method === 'DELETE' ? 'delete' : 'update',
                    field_changes: method === 'PATCH' || method === 'PUT' ? JSON.stringify(request.body) : null,
                  },
               });
            }
          } catch (err) {
            console.error('Failed to write audit log', err);
          }
        }),
      );
    }

    return next.handle();
  }
}
