import { AuditLogEntry } from '@prisma/client';

export interface AuditFilters {
  memberId?: string;
  entityType?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IAuditRepository {
  /**
   * Create a new audit log entry
   */
  create(data: {
    family_id?: string | null;
    member_id?: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    field_changes?: string | null;
  }): Promise<AuditLogEntry>;

  /**
   * Find audit logs by family ID with optional filters
   */
  findByFamilyId(familyId: string, filters?: AuditFilters): Promise<AuditLogEntry[]>;

  /**
   * Find audit logs for a specific member ("My Activity")
   */
  findByMemberId(memberId: string, filters?: AuditFilters): Promise<AuditLogEntry[]>;
}

export const I_AUDIT_REPOSITORY = 'IAuditRepository';
