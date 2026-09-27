import { Injectable } from '@nestjs/common';
import { AuditLogEntry } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IAuditRepository, AuditFilters } from '../interfaces';

@Injectable()
export class PrismaAuditRepository implements IAuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    family_id?: string | null;
    member_id?: string | null;
    entity_type: string;
    entity_id: string;
    action: string;
    field_changes?: string | null;
  }): Promise<AuditLogEntry> {
    return this.prisma.auditLogEntry.create({ data });
  }

  async findByFamilyId(familyId: string, filters?: AuditFilters): Promise<AuditLogEntry[]> {
    const where: any = { family_id: familyId };
    if (filters?.memberId) where.member_id = filters.memberId;
    if (filters?.entityType) where.entity_type = filters.entityType;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.auditLogEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        member: {
          select: {
            id: true,
            display_name: true,
            username: true,
          },
        },
      },
    });
  }

  async findByMemberId(memberId: string, filters?: AuditFilters): Promise<AuditLogEntry[]> {
    const where: any = { member_id: memberId };
    if (filters?.entityType) where.entity_type = filters.entityType;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.auditLogEntry.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      include: {
        member: {
          select: {
            id: true,
            display_name: true,
            username: true,
          },
        },
      },
    });
  }
}
