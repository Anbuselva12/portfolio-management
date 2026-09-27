import { Injectable } from '@nestjs/common';
import { ExpenseCategory } from '@prisma/client';
import { IExpenseCategoryRepository } from '../interfaces';
import { LocalStorageStore } from './LocalStorageStore';

@Injectable()
export class LocalStorageExpenseCategoryRepository implements IExpenseCategoryRepository {
  private get items(): ExpenseCategory[] {
    return LocalStorageStore.getCollection<ExpenseCategory>('expense_categories');
  }

  async findById(id: string): Promise<ExpenseCategory | null> {
    const item = this.items.find((c) => c.id === id);
    return item ? { ...item } : null;
  }

  async findByFamilyId(familyId: string): Promise<ExpenseCategory[]> {
    return this.items.filter((c) => c.family_id === familyId).map((c) => ({ ...c }));
  }

  async create(data: any): Promise<ExpenseCategory> {
    const category: ExpenseCategory = {
      id: LocalStorageStore.generateId(),
      family_id: data.family_id,
      name: data.name,
      icon: data.icon || null,
      color: data.color || null,
      is_active: data.is_active ?? true,
      created_at: new Date(),
    };
    this.items.push(category);
    return { ...category };
  }

  async update(id: string, data: Partial<ExpenseCategory>): Promise<ExpenseCategory> {
    const index = this.items.findIndex((c) => c.id === id);
    if (index === -1) throw new Error(`ExpenseCategory ${id} not found`);
    const updated = { ...this.items[index], ...data };
    this.items[index] = updated;
    return { ...updated };
  }
}

