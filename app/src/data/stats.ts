import { CHANTS_PER_MALA, type Deity, type SessionMode, type SessionRecord, type Stats } from './types';
import { DEITIES } from './deities';

/** Pure statistics over a session list. Kept separate from storage so the
 *  numbers can be unit-tested without a database. */
export function computeStats(rows: readonly SessionRecord[], now = new Date()): Stats {
  const completed = rows.filter((row) => row.status === 'completed');

  let todayTotal = 0;
  let lifetimeTotal = 0;
  const perDeityTotals = new Map<string, number>(DEITIES.map((deity) => [deity.id, 0]));

  // Seven local day boundaries, oldest first, today last.
  // Built with Date arithmetic rather than `now - i * 86_400_000` on purpose:
  // across a daylight-saving change a day is 23 or 25 hours long, and fixed
  // millisecond arithmetic silently puts a session in the wrong bucket.
  const dayStarts = Array.from({ length: 7 }, (_, index) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - (6 - index)).getTime(),
  );
  const startOfToday = dayStarts[6]!;
  const dayIndex = new Map<number, number>(dayStarts.map((time, index) => [time, index]));
  const week = new Array<number>(7).fill(0);

  for (const row of completed) {
    lifetimeTotal += row.completedCount;
    perDeityTotals.set(
      row.deityId,
      (perDeityTotals.get(row.deityId) ?? 0) + row.completedCount,
    );

    const anchor = new Date(row.endedAt ?? row.startedAt);
    const dayStart = new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      anchor.getDate(),
    ).getTime();

    if (dayStart === startOfToday) {
      todayTotal += row.completedCount;
    }
    const bucket = dayIndex.get(dayStart);
    if (bucket !== undefined) {
      week[bucket] = (week[bucket] ?? 0) + row.completedCount;
    }
  }

  const perDeity = DEITIES.map((deity) => {
    const totalCount = perDeityTotals.get(deity.id) ?? 0;
    const cycleCount = totalCount % CHANTS_PER_MALA;
    return {
      deity,
      totalCount,
      completedMalas: Math.floor(totalCount / CHANTS_PER_MALA),
      cycleCount,
      toNextMala: cycleCount === 0 ? CHANTS_PER_MALA : CHANTS_PER_MALA - cycleCount,
    };
  });

  const recent = [...completed]
    .sort((a, b) => (b.endedAt ?? b.startedAt) - (a.endedAt ?? a.startedAt))
    .slice(0, 12)
    .map((row) => ({
      id: row.id,
      deity: deityFor(row.deityId),
      mode: row.mode,
      completedCount: row.completedCount,
      durationSeconds: row.durationSeconds,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
    }));

  return {
    todayTotal,
    lifetimeTotal,
    completedMalas: Math.floor(lifetimeTotal / CHANTS_PER_MALA),
    week,
    perDeity,
    recent,
  };
}

function deityFor(id: string): Deity {
  return DEITIES.find((deity) => deity.id === id) ?? (DEITIES[0] as Deity);
}

export interface SessionDraft {
  deityId: string;
  mantraId: string;
  mode: SessionMode;
  targetCount: number;
  durationSeconds: number;
}

export function newSessionRecord(draft: SessionDraft, now = Date.now()): Omit<SessionRecord, 'id'> {
  return {
    deityId: draft.deityId,
    mantraId: draft.mantraId,
    startedAt: now,
    targetCount: draft.targetCount,
    completedCount: 0,
    mode: draft.mode,
    durationSeconds: draft.durationSeconds,
    status: 'active',
  };
}
