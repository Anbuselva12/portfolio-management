import { Family } from '@prisma/client';

export interface IFamilyRepository {
  /**
   * Find a family by ID
   */
  findById(id: string): Promise<Family | null>;

  /**
   * Find all discoverable families
   */
  findDiscoverable(): Promise<Family[]>;

  /**
   * Create a new family
   */
  create(data: {
    name: string;
    base_currency: string;
    country: string;
    join_policy: string;
    is_discoverable: boolean;
  }): Promise<Family>;

  /**
   * Update an existing family
   */
  update(id: string, data: Partial<Family>): Promise<Family>;
}

export const I_FAMILY_REPOSITORY = 'IFamilyRepository';
