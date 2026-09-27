import { Asset } from '@prisma/client';

export interface IAssetRepository {
  /**
   * Find an asset by ID
   */
  findById(id: string): Promise<Asset | null>;

  /**
   * Find assets by member ID
   */
  findByMemberId(memberId: string): Promise<Asset[]>;

  /**
   * Find assets by family ID
   */
  findByFamilyId(familyId: string): Promise<Asset[]>;

  /**
   * Create a new asset
   */
  create(data: any): Promise<Asset>;

  /**
   * Update an existing asset
   */
  update(id: string, data: Partial<Asset>): Promise<Asset>;

  /**
   * Soft delete an asset
   */
  softDelete(id: string): Promise<Asset>;

  /**
   * Restore a soft-deleted asset
   */
  restore(id: string): Promise<Asset>;
}

export const I_ASSET_REPOSITORY = 'IAssetRepository';
