import { Injectable } from '@nestjs/common';
import { AuditLogEntry } from '@prisma/client';
import { IAuditRepository, AuditFilters } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageAuditRepository implements IAuditRepository {
  private get items(): AuditLogEntry[] {
    return LocalStorageStore.getCollection<AuditLogEntry>('audit_logs');
  }

  async create(data: {
    family_id?: string | null;
    member_id?: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    field_changes?: string | null;
  }): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      id: LocalStorageStore.generateId(),
      family_id: data.family_id || null,
      member_id: data.member_id || null,
      entity_type: data.entity_type,
      entity_id: data.entity_id,
      action: data.action,
      field_changes: data.field_changes ? (typeof data.field_changes === 'string' ? data.field_changes : JSON.stringify(data.field_changes)) : null,
      timestamp: new Date(),
    };
    this.items.push(entry);
    return { ...entry };
  }

  async findByFamilyId(familyId: string, filters?: AuditFilters): Promise<AuditLogEntry[]> {
    return this.items
      .filter((entry) => {
        if (entry.family_id !== familyId) return false;
        if (filters?.memberId && entry.member_id !== filters.memberId) return false;
        if (filters?.entityType && entry.entity_type !== filters.entityType) return false;
        if (filters?.action && entry.action !== filters.action) return false;
        if (filters?.startDate && new Date(entry.timestamp) < filters.startDate) return false;
        if (filters?.endDate && new Date(entry.timestamp) > filters.endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((entry) => ({ ...entry }));
  }

  async findByMemberId(memberId: string, filters?: AuditFilters): Promise<AuditLogEntry[]> {
    return this.items
      .filter((entry) => {
        if (entry.member_id !== memberId) return false;
        if (filters?.entityType && entry.entity_type !== filters.entityType) return false;
        if (filters?.action && entry.action !== filters.action) return false;
        if (filters?.startDate && new Date(entry.timestamp) < filters.startDate) return false;
        if (filters?.endDate && new Date(entry.timestamp) > filters.endDate) return false;
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map((entry) => ({ ...entry }));
  }
}
