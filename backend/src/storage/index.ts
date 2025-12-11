import { config } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { MemoryStorage } from './memory.storage.js';
import { DatabaseStorage } from './database.storage.js';
import type { IStorage } from './types.js';

export * from './types.js';

let storageInstance: IStorage | null = null;

export function getStorage(): IStorage {
  if (!storageInstance) {
    if (config.storageMode === 'database') {
      logger.info('Using database storage (PostgreSQL)');
      storageInstance = new DatabaseStorage();
    } else {
      logger.info('Using in-memory storage (no persistence)');
      storageInstance = new MemoryStorage();
    }
  }
  return storageInstance as IStorage;
}

export async function disconnectStorage(): Promise<void> {
  if (storageInstance && config.storageMode === 'database') {
    await (storageInstance as DatabaseStorage).disconnect();
  }
  storageInstance = null;
}

// Re-export for convenience
export { MemoryStorage } from './memory.storage.js';
export { DatabaseStorage } from './database.storage.js';
