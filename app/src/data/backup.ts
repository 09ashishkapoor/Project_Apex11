import { DEITIES, DEITIES_BY_ID } from './deities';
import type { SessionMode, SessionRecord, SessionStatus } from './types';

/**
 * Backup payload. The shape is deliberately identical to what the Flutter app
 * writes, so a JSON export from the APK imports here and vice versa.
 */
export const BACKUP_FORMAT = 'sadhana_for_a_khyapa_backup';
export const BACKUP_VERSION = 1;

export interface BackupPayload {
  format: string;
  version: number;
  exportedAt: string;
  sessions: BackupSession[];
}

interface BackupSession {
  id?: number;
  deityId: string;
  mantraId: string;
  startedAt: string;
  endedAt: string | null;
  targetCount: number;
  completedCount: number;
  mode: string;
  durationSeconds: number;
  status: string;
}

const MODES: ReadonlySet<string> = new Set<SessionMode>(['manual', 'audio', 'timed', 'count']);
const STATUSES: ReadonlySet<string> = new Set<SessionStatus>([
  'active',
  'paused',
  'completed',
  'cancelled',
]);

export function exportBackup(rows: readonly SessionRecord[], now = new Date()): string {
  const payload: BackupPayload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    sessions: [...rows]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((row) => ({
        id: row.id,
        deityId: row.deityId,
        mantraId: row.mantraId,
        startedAt: new Date(row.startedAt).toISOString(),
        endedAt: row.endedAt === undefined ? null : new Date(row.endedAt).toISOString(),
        targetCount: row.targetCount,
        completedCount: row.completedCount,
        mode: row.mode,
        durationSeconds: row.durationSeconds,
        status: row.status,
      })),
  };
  return JSON.stringify(payload, null, 2);
}

export class BackupFormatError extends Error {}

export function parseBackup(raw: string): SessionRecord[] {
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw new BackupFormatError('That does not look like JSON.');
  }
  if (typeof decoded !== 'object' || decoded === null) {
    throw new BackupFormatError('Backup must decode to a JSON object.');
  }
  const sessions = (decoded as { sessions?: unknown }).sessions;
  if (!Array.isArray(sessions)) {
    throw new BackupFormatError('Backup is missing a sessions list.');
  }

  return sessions.map((entry, index) => parseSession(entry, index));
}

function parseSession(entry: unknown, index: number): SessionRecord {
  if (typeof entry !== 'object' || entry === null) {
    throw new BackupFormatError(`Session ${index + 1} is not an object.`);
  }
  const raw = entry as Record<string, unknown>;

  const deityId = raw.deityId;
  if (typeof deityId !== 'string' || !DEITIES_BY_ID.has(deityId)) {
    throw new BackupFormatError(`Unknown deityId in backup: ${String(deityId)}`);
  }
  const mode = raw.mode;
  const status = raw.status;
  if (typeof mode !== 'string' || !MODES.has(mode)) {
    throw new BackupFormatError(`Session ${index + 1} has an unknown mode.`);
  }
  if (typeof status !== 'string' || !STATUSES.has(status)) {
    throw new BackupFormatError(`Session ${index + 1} has an unknown status.`);
  }

  const startedAt = parseDate(raw.startedAt, index, 'startedAt');
  const endedAtRaw = raw.endedAt;
  const endedAt =
    endedAtRaw === null || endedAtRaw === undefined
      ? undefined
      : parseDate(endedAtRaw, index, 'endedAt');

  const deity = DEITIES_BY_ID.get(deityId) ?? DEITIES[0]!;

  return {
    id: typeof raw.id === 'number' ? raw.id : 0,
    deityId,
    mantraId: typeof raw.mantraId === 'string' ? raw.mantraId : deity.mantraId,
    startedAt,
    ...(endedAt === undefined ? {} : { endedAt }),
    targetCount: numberOr(raw.targetCount, 0),
    completedCount: numberOr(raw.completedCount, 0),
    mode: mode as SessionMode,
    durationSeconds: numberOr(raw.durationSeconds, 0),
    status: status as SessionStatus,
  };
}

function parseDate(value: unknown, index: number, field: string): number {
  if (typeof value !== 'string') {
    throw new BackupFormatError(`Session ${index + 1} is missing ${field}.`);
  }
  const time = Date.parse(value);
  if (Number.isNaN(time)) {
    throw new BackupFormatError(`Session ${index + 1} has an unreadable ${field}.`);
  }
  return time;
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
