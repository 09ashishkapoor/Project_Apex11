import { describe, expect, it } from 'vitest';
import { BackupFormatError, BACKUP_FORMAT, exportBackup, parseBackup } from '../src/data/backup';
import { DEITIES } from '../src/data/deities';
import type { SessionRecord } from '../src/data/types';

const SESSION: SessionRecord = {
  id: 7,
  deityId: DEITIES[0]!.id,
  mantraId: DEITIES[0]!.mantraId,
  startedAt: Date.UTC(2026, 10, 7, 6, 20),
  endedAt: Date.UTC(2026, 10, 7, 6, 30),
  targetCount: 108,
  completedCount: 108,
  mode: 'manual',
  durationSeconds: 581,
  status: 'completed',
};

describe('backup', () => {
  it('writes the same envelope the Flutter app writes', () => {
    const payload = JSON.parse(exportBackup([SESSION], new Date(Date.UTC(2026, 10, 7, 12))));
    expect(payload.format).toBe(BACKUP_FORMAT);
    expect(payload.format).toBe('sadhana_for_a_khyapa_backup');
    expect(payload.version).toBe(1);
    expect(payload.sessions).toHaveLength(1);
    expect(payload.sessions[0]).toMatchObject({
      deityId: DEITIES[0]!.id,
      completedCount: 108,
      mode: 'manual',
      status: 'completed',
      endedAt: new Date(SESSION.endedAt!).toISOString(),
    });
  });

  it('round-trips without losing a session', () => {
    const restored = parseBackup(exportBackup([SESSION]));
    expect(restored).toHaveLength(1);
    expect(restored[0]).toMatchObject({
      id: 7,
      deityId: SESSION.deityId,
      startedAt: SESSION.startedAt,
      endedAt: SESSION.endedAt,
      completedCount: 108,
      durationSeconds: 581,
    });
  });

  it('accepts a payload exported by the old Android app', () => {
    // Shape copied from lib/services/sadhana_repository.dart `_rowToJson`.
    const fromFlutter = JSON.stringify({
      format: 'sadhana_for_a_khyapa_backup',
      version: 1,
      exportedAt: '2026-11-01T10:00:00.000',
      sessions: [
        {
          id: 1,
          deityId: 'batuk-bhairav',
          mantraId: 'batuk-bhairav-japa',
          startedAt: '2026-10-31T18:04:00.000',
          endedAt: '2026-10-31T18:09:00.000',
          targetCount: 54,
          completedCount: 54,
          mode: 'timed',
          durationSeconds: 300,
          status: 'completed',
        },
      ],
    });
    const rows = parseBackup(fromFlutter);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.deityId).toBe('batuk-bhairav');
    expect(rows[0]!.mode).toBe('timed');
  });

  it('falls back to the deity mantra id when the backup omits one', () => {
    const raw = JSON.stringify({
      sessions: [
        {
          deityId: 'skanda-bhairav',
          startedAt: '2026-10-31T18:04:00.000Z',
          mode: 'manual',
          status: 'completed',
        },
      ],
    });
    const [row] = parseBackup(raw);
    expect(row!.mantraId).toBe('skanda-bhairav-japa');
    expect(row!.completedCount).toBe(0);
  });

  it('rejects non-JSON', () => {
    expect(() => parseBackup('not json')).toThrow(BackupFormatError);
  });

  it('rejects a payload with no sessions list', () => {
    expect(() => parseBackup('{"sessions": 3}')).toThrow(/missing a sessions list/);
  });

  it('rejects an unknown deity', () => {
    const raw = JSON.stringify({
      sessions: [
        {
          deityId: 'not-a-deity',
          startedAt: '2026-10-31T18:04:00.000Z',
          mode: 'manual',
          status: 'completed',
        },
      ],
    });
    expect(() => parseBackup(raw)).toThrow(/Unknown deityId/);
  });

  it('rejects an unknown mode', () => {
    const raw = JSON.stringify({
      sessions: [
        {
          deityId: DEITIES[0]!.id,
          startedAt: '2026-10-31T18:04:00.000Z',
          mode: 'telepathy',
          status: 'completed',
        },
      ],
    });
    expect(() => parseBackup(raw)).toThrow(/unknown mode/);
  });
});
