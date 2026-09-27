import { Member } from '@prisma/client';

export interface IMemberRepository {
  /**
   * Find a member by ID
   */
  findById(id: string): Promise<Member | null>;

  /**
   * Find a member by username
   */
  findByUsername(username: string): Promise<Member | null>;

  /**
   * Find all members of a family
   */
  findByFamilyId(familyId: string): Promise<Member[]>;

  /**
   * Find pending members of a family
   */
  findPendingByFamilyId(familyId: string): Promise<Member[]>;

  /**
   * Create a new member
   */
  create(data: any): Promise<Member>;

  /**
   * Update an existing member
   */
  update(id: string, data: Partial<Member>): Promise<Member>;
}

export const I_MEMBER_REPOSITORY = 'IMemberRepository';
