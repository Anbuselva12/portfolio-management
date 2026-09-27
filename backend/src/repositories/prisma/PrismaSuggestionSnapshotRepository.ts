import { Injectable } from '@nestjs/common';
import { SuggestionSnapshot } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ISuggestionSnapshotRepository } from '../interfaces';

@Injectable()
export class PrismaSuggestionSnapshotRepository implements ISuggestionSnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    family_id: string;
    member_id: string;
    strategy_name: string;
    surplus: any;
    allocations: string;
    metrics: string;
  }): Promise<SuggestionSnapshot> {
    return this.prisma.suggestionSnapshot.create({ data });
  }

  async findLatestByFamilyId(familyId: string): Promise<SuggestionSnapshot | null> {
    return this.prisma.suggestionSnapshot.findFirst({
      where: { family_id: familyId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findByFamilyId(familyId: string): Promise<SuggestionSnapshot[]> {
    return this.prisma.suggestionSnapshot.findMany({
      where: { family_id: familyId },
      orderBy: { created_at: 'desc' },
    });
  }
}

