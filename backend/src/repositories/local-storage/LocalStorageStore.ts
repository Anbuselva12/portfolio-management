import * as crypto from 'crypto';

/**
 * Storage store for LocalStorage mode.
 * Operates in memory with optional JSON file or browser localStorage backing.
 */
export class LocalStorageStore {
  private static storage: Map<string, any[]> = new Map();

  static getCollection<T = any>(name: string): T[] {
    if (!this.storage.has(name)) {
      this.storage.set(name, []);
    }
    return this.storage.get(name)!;
  }

  static clear(): void {
    this.storage.clear();
  }

  static generateId(): string {
    return crypto.randomUUID();
  }
}
