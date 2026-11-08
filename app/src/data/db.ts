import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { SessionRecord } from './types';

const DB_NAME = 'mantrini';
const DB_VERSION = 1;
const STORE = 'sessions';

interface MantriniDB extends DBSchema {
  sessions: {
    key: number;
    value: SessionRecord;
    indexes: {
      'by-startedAt': number;
      'by-status': string;
      'by-deityId': string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<MantriniDB>> | null = null;

export function openDatabase(): Promise<IDBPDatabase<MantriniDB>> {
  dbPromise ??= openDB<MantriniDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('by-startedAt', 'startedAt');
      store.createIndex('by-status', 'status');
      store.createIndex('by-deityId', 'deityId');
    },
  });
  return dbPromise;
}

/** Test seam: swap in a fresh in-memory implementation. */
export function resetDatabase(): void {
  dbPromise = null;
}

export type { MantriniDB };
export { STORE };
