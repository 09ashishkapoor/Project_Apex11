import { CHANTS_PER_MALA, type SessionMode } from '../data/types';

export interface SessionConfig {
  mode: SessionMode;
  /** How many malas the devotee intends to offer. */
  malas: number;
  /** Timed mode only: the length of the sitting. */
  timedMinutes: number;
}

export function defaultConfig(mode: SessionMode): SessionConfig {
  return { mode, malas: 1, timedMinutes: 5 };
}

/** The count the session is aiming for. Timed sessions are bounded by time. */
export function targetCountFor(config: SessionConfig): number {
  if (config.mode === 'timed') return 0;
  return Math.max(1, config.malas) * CHANTS_PER_MALA;
}

/** Timed sessions have a fixed length; everything else is open-ended. */
export function timedDurationMs(config: SessionConfig): number {
  return Math.max(1, config.timedMinutes) * 60_000;
}

export function isLoopMode(mode: SessionMode): boolean {
  return mode === 'timed' || mode === 'count';
}

/**
 * How long one chant is, in milliseconds.
 *
 * Prefers the measured duration of the loaded clip. Falls back to the clip's
 * known length when the audio never reported one — blocked autoplay, a decode
 * failure, data saver. Without the fallback an automatic sitting would derive
 * a count of zero forever and never reach its target, which is a silent dead
 * end rather than a visible error.
 */
export function cadenceMs(measured: number, fallback: number): number {
  return measured > 0 ? measured : Math.max(0, fallback);
}

/**
 * The count shown on the session screen.
 *
 * Manual and audio sessions count discrete events, so the count is whatever was
 * recorded. Loop modes derive the count from how long the chant has actually
 * been running — the same arithmetic the Flutter build used to keep its
 * automatic counting honest across pauses.
 */
export function completedCountFor(params: {
  config: SessionConfig;
  elapsedMs: number;
  chantMs: number;
  manualCount: number;
  loopOffset: number;
}): number {
  const { config, elapsedMs, chantMs, manualCount, loopOffset } = params;
  if (!isLoopMode(config.mode)) return Math.max(0, manualCount);
  if (chantMs <= 0) return Math.max(0, manualCount);
  const derived = Math.floor(Math.max(0, elapsedMs) / chantMs) + loopOffset;
  const cap = config.mode === 'count' ? targetCountFor(config) : Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.min(cap, derived));
}

/** Remaining milliseconds in a timed session; 0 for every other mode. */
export function remainingMs(config: SessionConfig, elapsedMs: number): number {
  if (config.mode !== 'timed') return 0;
  return Math.max(0, timedDurationMs(config) - elapsedMs);
}

/** True when the session has reached its own end condition. */
export function isSessionComplete(params: {
  config: SessionConfig;
  completed: number;
  elapsedMs: number;
}): boolean {
  const { config, completed, elapsedMs } = params;
  if (config.mode === 'timed') return remainingMs(config, elapsedMs) <= 0;
  return completed >= targetCountFor(config);
}

/** Malas closed so far, counted from zero for the current session. */
export function malasCompleted(completed: number): number {
  return Math.floor(completed / CHANTS_PER_MALA);
}

/** True when this count has just closed a mala. */
export function crossedMala(previous: number, next: number): boolean {
  if (next <= previous) return false;
  return Math.floor(next / CHANTS_PER_MALA) > Math.floor(previous / CHANTS_PER_MALA);
}

/** 108 chants in 9m12s is about 5.1 per minute. */
export function chantsPerMinute(completed: number, elapsedMs: number): string {
  if (elapsedMs < 5_000 || completed <= 0) return '—';
  const perMinute = completed / (elapsedMs / 60_000);
  return perMinute.toFixed(1);
}
