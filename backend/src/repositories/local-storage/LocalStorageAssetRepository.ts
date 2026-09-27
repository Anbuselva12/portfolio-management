import { Injectable } from '@nestjs/common';
import { Asset, Prisma } from '@prisma/client';
import { IAssetRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageAssetRepository implements IAssetRepository {
  private get items(): Asset[] {
    return LocalStorageStore.getCollection<Asset>('assets');
  }

  async findById(id: string): Promise<Asset | null> {
    const item = this.items.find((a) => a.id === id && a.deleted_at === null);
    return item ? { ...item } : null;
  }

  async findByMemberId(memberId: string): Promise<Asset[]> {
    return this.items.filter((a) => a.member_id === memberId && a.deleted_at === null).map((a) => ({ ...a }));
  }

  async findByFamilyId(familyId: string): Promise<Asset[]> {
    return this.items.filter((a) => a.family_id === familyId && a.deleted_at === null).map((a) => ({ ...a }));
  }

  async create(data: any): Promise<Asset> {
    const asset: Asset = {
      id: LocalStorageStore.generateId(),
      member_id: data.member_id,
      family_id: data.family_id,
      type: data.type,
      name: data.name,
      currency: data.currency || 'INR',
      current_value: new Prisma.Decimal(data.current_value),
      principal_invested: data.principal_invested ? new Prisma.Decimal(data.principal_invested) : null,
      maturity_date: data.maturity_date ? new Date(data.maturity_date) : null,
      interest_rate: data.interest_rate ? new Prisma.Decimal(data.interest_rate) : null,
      notes: data.notes || null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    };
    this.items.push(asset);
    return { ...asset };
  }

  async update(id: string, data: Partial<Asset>): Promise<Asset> {
    const index = this.items.findIndex((a) => a.id === id);
    if (index === -1) throw new Error(`Asset ${id} not found`);
    const updated = {
      ...this.items[index],
      ...data,
      current_value: data.current_value ? new Prisma.Decimal(data.current_value as any) : this.items[index].current_value,
      updated_at: new Date(),
    };
    this.items[index] = updated;
    return { ...updated };
  }

  async softDelete(id: string): Promise<Asset> {
    const index = this.items.findIndex((a) => a.id === id);
    if (index === -1) throw new Error(`Asset ${id} not found`);
    this.items[index].deleted_at = new Date();
    return { ...this.items[index] };
  }

  async restore(id: string): Promise<Asset> {
    const index = this.items.findIndex((a) => a.id === id);
    if (index === -1) throw new Error(`Asset ${id} not found`);
    this.items[index].deleted_at = null;
    return { ...this.items[index] };
  }
}

