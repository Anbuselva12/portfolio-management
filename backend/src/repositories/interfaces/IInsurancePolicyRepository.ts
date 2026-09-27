import { InsurancePolicy } from '@prisma/client';

export interface IInsurancePolicyRepository {
  /**
   * Find an insurance policy by ID
   */
  findById(id: string): Promise<InsurancePolicy | null>;

  /**
   * Find insurance policies by member ID
   */
  findByMemberId(memberId: string): Promise<InsurancePolicy[]>;

  /**
   * Find insurance policies by family ID
   */
  findByFamilyId(familyId: string): Promise<InsurancePolicy[]>;

  /**
   * Create a new insurance policy
   */
  create(data: any): Promise<InsurancePolicy>;

  /**
   * Update an existing insurance policy
   */
  update(id: string, data: Partial<InsurancePolicy>): Promise<InsurancePolicy>;

  /**
   * Soft delete an insurance policy
   */
  softDelete(id: string): Promise<InsurancePolicy>;

  /**
   * Restore a soft-deleted insurance policy
   */
  restore(id: string): Promise<InsurancePolicy>;
}

export const I_INSURANCE_POLICY_REPOSITORY = 'IInsurancePolicyRepository';
