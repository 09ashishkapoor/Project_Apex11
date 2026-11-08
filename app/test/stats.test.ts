import { describe, expect, it } from 'vitest';
import { computeStats } from '../src/data/stats';
import { DEITIES } from '../src/data/deities';
import type { SessionRecord } from '../src/data/types';

/** Fixed "now" so day bucketing is deterministic: Saturday 7 Nov 2026, 18:00. */
const NOW = new Date(2026, 10, 7, 18, 0, 0);

function record(overrides: Partial<SessionRecord> = {}): SessionRecord {
  const base = Date.UTC(2026, 10, 7, 9, 0, 0);
  return {
    id: 1,
    deityId: DEITIES[0]!.id,
    mantraId: DEITIES[0]!.mantraId,
    startedAt: base,
    targetCount: 108,
    completedCount: 108,
    mode: 'manual',
    durationSeconds: 552,
    status: 'completed',
    ...overrides,
  };
}

describe('computeStats', () => {
  it('counts only completed sessions', () => {
    const rows = [
      record({ id: 1, completedCount: 108 }),
      record({ id: 2, completedCount: 27, deityId: DEITIES[1]!.id }),
      record({ id: 3, completedCount: 54, status: 'cancelled' }),
      record({ id: 4, completedCount: 12, status: 'active' }),
    ];
    const stats = computeStats(rows, NOW);
    expect(stats.todayTotal).toBe(135);
    expect(stats.lifetimeTotal).toBe(135);
    expect(stats.completedMalas).toBe(1);
    expect(stats.recent).toHaveLength(2);
  });

  it('keeps a stable per-deity list even with no sessions', () => {
    const stats = computeStats([], NOW);
    expect(stats.perDeity).toHaveLength(DEITIES.length);
    expect(stats.perDeity.every((row) => row.totalCount === 0)).toBe(true);
    expect(stats.perDeity.every((row) => row.toNextMala === 108)).toBe(true);
    expect(stats.week).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('puts today in the last week bucket and walks back seven days', () => {
    const today = record({ id: 1, completedCount: 10, endedAt: NOW.getTime() });
    const sixDaysAgo = record({
      id: 2,
      completedCount: 90,
      endedAt: new Date(2026, 10, 1, 12).getTime(),
    });
    const tooOld = record({
      id: 3,
      completedCount: 999,
      endedAt: new Date(2026, 9, 20, 12).getTime(),
    });
    const stats = computeStats([today, sixDaysAgo, tooOld], NOW);
    expect(stats.week[6]).toBe(10);
    expect(stats.week[0]).toBe(90);
    expect(stats.week.reduce((a, b) => a + b, 0)).toBe(100);
    expect(stats.lifetimeTotal).toBe(1099);
  });

  it('reports leftover chants to the next mala', () => {
    const stats = computeStats([record({ completedCount: 130 })], NOW);
    const adya = stats.perDeity.find((row) => row.deity.id === DEITIES[0]!.id)!;
    expect(adya.completedMalas).toBe(1);
    expect(adya.cycleCount).toBe(22);
    expect(adya.toNextMala).toBe(86);
  });

  it('treats an exact mala as a full cycle waiting to be closed', () => {
    const stats = computeStats([record({ completedCount: 216 })], NOW);
    const adya = stats.perDeity.find((row) => row.deity.id === DEITIES[0]!.id)!;
    expect(adya.completedMalas).toBe(2);
    expect(adya.cycleCount).toBe(0);
    expect(adya.toNextMala).toBe(108);
  });

  it('orders recent sittings newest first and caps at twelve', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      record({
        id: i + 1,
        endedAt: new Date(2026, 10, 7, 10, i).getTime(),
      }),
    );
    const stats = computeStats(rows, NOW);
    expect(stats.recent).toHaveLength(12);
    expect(stats.recent[0]!.id).toBe(20);
    expect(stats.recent[11]!.id).toBe(9);
  });
});
