import { Injectable } from '@nestjs/common';
import { InsurancePolicy, Prisma } from '@prisma/client';
import { IInsurancePolicyRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageInsurancePolicyRepository implements IInsurancePolicyRepository {
  private get items(): InsurancePolicy[] {
    return LocalStorageStore.getCollection<InsurancePolicy>('insurance_policies');
  }

  async findById(id: string): Promise<InsurancePolicy | null> {
    const item = this.items.find((i) => i.id === id && i.deleted_at === null);
    return item ? { ...item } : null;
  }

  async findByMemberId(memberId: string): Promise<InsurancePolicy[]> {
    return this.items.filter((i) => i.member_id === memberId && i.deleted_at === null).map((i) => ({ ...i }));
  }

  async findByFamilyId(familyId: string): Promise<InsurancePolicy[]> {
    return this.items.filter((i) => i.family_id === familyId && i.deleted_at === null).map((i) => ({ ...i }));
  }

  async create(data: any): Promise<InsurancePolicy> {
    const policy: InsurancePolicy = {
      id: LocalStorageStore.generateId(),
      member_id: data.member_id,
      family_id: data.family_id,
      policy_type: data.policy_type,
      provider: data.provider,
      policy_number: data.policy_number,
      sum_assured: new Prisma.Decimal(data.sum_assured),
      premium_amount: new Prisma.Decimal(data.premium_amount),
      premium_frequency: data.premium_frequency,
      next_due_date: new Date(data.next_due_date),
      linked_category_id: data.linked_category_id || null,
      status: data.status || 'active',
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };
    this.items.push(policy);
    return { ...policy };
  }

  async update(id: string, data: Partial<InsurancePolicy>): Promise<InsurancePolicy> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`InsurancePolicy ${id} not found`);
    const updated = {
      ...this.items[index],
      ...data,
      sum_assured: data.sum_assured ? new Prisma.Decimal(data.sum_assured as any) : this.items[index].sum_assured,
      premium_amount: data.premium_amount ? new Prisma.Decimal(data.premium_amount as any) : this.items[index].premium_amount,
      next_due_date: data.next_due_date ? new Date(data.next_due_date) : this.items[index].next_due_date,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    return { ...updated };
  }

  async softDelete(id: string): Promise<InsurancePolicy> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`InsurancePolicy ${id} not found`);
    this.items[index].deleted_at = new Date();
    return { ...this.items[index] };
  }

  async restore(id: string): Promise<InsurancePolicy> {
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) throw new Error(`InsurancePolicy ${id} not found`);
    this.items[index].deleted_at = null;
    return { ...this.items[index] };
  }
}

