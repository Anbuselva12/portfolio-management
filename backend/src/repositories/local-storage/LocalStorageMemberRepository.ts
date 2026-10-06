import { Injectable } from '@nestjs/common';
import { Member } from '@prisma/client';
import { IMemberRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageMemberRepository implements IMemberRepository {
  private get items(): Member[] {
    return LocalStorageStore.getCollection<Member>('members');
  }

  async findById(id: string): Promise<Member | null> {
    const item = this.items.find((m) => m.id === id);
    return item ? { ...item } : null;
  }

  async findByUsername(username: string): Promise<Member | null> {
    const item = this.items.find((m) => m.username === username);
    return item ? { ...item } : null;
  }

  async findByFamilyId(familyId: string): Promise<Member[]> {
    return this.items.filter((m) => m.family_id === familyId).map((m) => ({ ...m }));
  }

  async findPendingByFamilyId(familyId: string): Promise<Member[]> {
    return this.items
      .filter((m) => m.family_id === familyId && m.status === 'pending_approval')
      .map((m) => ({ ...m }));
  }

  async create(data: any): Promise<Member> {
    const member: Member = {
      id: data.id || LocalStorageStore.generateId(),
      family_id: data.family_id || null,
      username: data.username,
      password_hash: data.password_hash,
      display_name: data.display_name,
      role: data.role || 'member',
      status: data.status || 'unaffiliated',
      is_active: data.is_active ?? true,
      preferred_currency: data.preferred_currency || 'INR',
      preferred_app: data.preferred_app || 'finfamily',
      created_at: new Date(),
      last_login_at: data.last_login_at || null,
    };
    this.items.push(member);
    return { ...member };
  }

  async update(id: string, data: Partial<Member>): Promise<Member> {
    const index = this.items.findIndex((m) => m.id === id);
    if (index === -1) throw new Error(`Member ${id} not found`);
    const updated = { ...this.items[index], ...data };
    this.items[index] = updated;
    return { ...updated };
  }
}

