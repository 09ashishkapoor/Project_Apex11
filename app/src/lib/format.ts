import { CHANTS_PER_MALA } from '../data/types';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

/** "Saturday, 7 November" */
export function longDate(date = new Date()): string {
  const weekday = WEEKDAYS[date.getDay()] ?? '';
  const month = MONTHS[date.getMonth()] ?? '';
  return `${weekday}, ${date.getDate()} ${month}`;
}

/** 9:12 — minutes and seconds, used for elapsed time and countdowns. */
export function clock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** 9m41s — used in the ledger's recent sittings. */
export function durationShort(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m${seconds.toString().padStart(2, '0')}s`;
}

/** 4,212 */
export function groupDigits(value: number): string {
  return value.toLocaleString('en-IN');
}

export function malaWord(count: number): string {
  return count === 1 ? 'mala' : 'malas';
}

export function chantsToNextMala(totalCount: number): number {
  const cycle = totalCount % CHANTS_PER_MALA;
  return cycle === 0 ? CHANTS_PER_MALA : CHANTS_PER_MALA - cycle;
}

/** Relative day label for recent sittings: "today", "yesterday", "Nov 5". */
export function relativeDay(timestamp: number, now = new Date()): string {
  const then = new Date(timestamp);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime();
  const dayMs = 86_400_000;
  const diff = Math.round((startOfToday - startOfThen) / dayMs);
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  return `${(MONTHS[then.getMonth()] ?? '').slice(0, 3)} ${then.getDate()}`;
}

export const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/** Index 0..6 mapping a JS getDay() onto a Monday-first week. */
export function mondayFirstIndex(date = new Date()): number {
  return (date.getDay() + 6) % 7;
}
