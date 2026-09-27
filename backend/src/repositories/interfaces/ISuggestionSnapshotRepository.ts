import { SuggestionSnapshot } from '@prisma/client';

export interface ISuggestionSnapshotRepository {
  create(data: {
    family_id: string;
    member_id: string;
    strategy_name: string;
    surplus: any;
    allocations: string;
    metrics: string;
  }): Promise<SuggestionSnapshot>;

  findLatestByFamilyId(familyId: string): Promise<SuggestionSnapshot | null>;
  findByFamilyId(familyId: string): Promise<SuggestionSnapshot[]>;
}

export const I_SUGGESTION_SNAPSHOT_REPOSITORY = 'ISuggestionSnapshotRepository';

