import { openDatabase, STORE } from './db';
import { computeStats, newSessionRecord, type SessionDraft } from './stats';
import type { SessionRecord, SessionStatus, Stats } from './types';

async function db() {
  return openDatabase();
}

export async function startSession(draft: SessionDraft, now = Date.now()): Promise<number> {
  const database = await db();
  const record = newSessionRecord(draft, now);
  return database.add(STORE, record as SessionRecord);
}

export async function getSession(id: number): Promise<SessionRecord | undefined> {
  const database = await db();
  return database.get(STORE, id);
}

async function patch(id: number, changes: Partial<SessionRecord>): Promise<void> {
  const database = await db();
  const existing = await database.get(STORE, id);
  if (!existing) return;
  await database.put(STORE, { ...existing, ...changes });
}

export async function updateProgress(
  id: number,
  completedCount: number,
  durationSeconds: number,
): Promise<void> {
  await patch(id, { completedCount, durationSeconds });
}

export async function setStatus(
  id: number,
  status: SessionStatus,
  completedCount: number,
  durationSeconds: number,
  endedAt?: number,
): Promise<void> {
  await patch(id, {
    status,
    completedCount,
    durationSeconds,
    ...(endedAt === undefined ? {} : { endedAt }),
  });
}

export async function allSessions(): Promise<SessionRecord[]> {
  const database = await db();
  return database.getAll(STORE);
}

export async function loadStats(now = new Date()): Promise<Stats> {
  return computeStats(await allSessions(), now);
}

/**
 * Sessions left `active`/`paused` by a crash, a browser kill or a closed tab
 * are unreachable: nothing can resume them, so they would sit in the database
 * forever. Fold them into `cancelled` on boot, keeping whatever count was
 * already recorded. This is the fix for audit defect B3.
 */
export async function reapOrphanedSessions(now = Date.now()): Promise<number> {
  const rows = await allSessions();
  const orphans = rows.filter((row) => row.status === 'active' || row.status === 'paused');
  for (const row of orphans) {
    await patch(row.id, { status: 'cancelled', endedAt: row.endedAt ?? now });
  }
  return orphans.length;
}

export async function resetAll(): Promise<void> {
  const database = await db();
  await database.clear(STORE);
}

export async function resetDeity(deityId: string): Promise<void> {
  const database = await db();
  const tx = database.transaction(STORE, 'readwrite');
  const index = tx.store.index('by-deityId');
  let cursor = await index.openCursor(deityId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function replaceAll(rows: readonly SessionRecord[]): Promise<void> {
  const database = await db();
  const tx = database.transaction(STORE, 'readwrite');
  await tx.store.clear();
  for (const row of rows) await tx.store.put(row);
  await tx.done;
}

export async function insertMany(rows: readonly SessionRecord[]): Promise<void> {
  const database = await db();
  const tx = database.transaction(STORE, 'readwrite');
  for (const row of rows) {
    // Keep the row's own id when it is free so repeated merges are idempotent.
    const existing = await tx.store.get(row.id);
    if (existing) {
      const { id: _discarded, ...rest } = row;
      await tx.store.add(rest as SessionRecord);
    } else {
      await tx.store.put(row);
    }
  }
  await tx.done;
}
