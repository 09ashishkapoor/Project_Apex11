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
 * Fallback cadence: how long one chant lasts, in milliseconds.
 *
 * Only used when the audio cannot play at all (blocked autoplay, decode
 * failure, data saver). While the chant is heard, the count comes from the
 * audio element's real loop boundaries — see `completedCountFor`.
 *
 * Prefers the measured duration of the loaded clip. Falls back to the clip's
 * known length when the audio never reported one. Without the fallback an
 * automatic sitting would derive a count of zero forever and never reach its
 * target, which is a silent dead end rather than a visible error.
 */
export function cadenceMs(measured: number, fallback: number): number {
  return measured > 0 ? measured : Math.max(0, fallback);
}

/**
 * Where a looping session's count comes from.
 *
 * `audio` counts the chant loops the audio element actually finished. `clock`
 * is the fallback for a sitting whose audio will not start at all: the clip's
 * known length is the best cadence available, and counting continues (with the
 * one-time notice) rather than stalling forever. `pending` is the moment
 * between Start and the first successful play, when neither source is true yet.
 */
export type LoopCountSource = 'pending' | 'audio' | 'clock';

/**
 * The count shown on the session screen.
 *
 * Manual and audio sessions count discrete events, so the count is whatever was
 * recorded. Loop modes count the chant itself: the audio wrapper reports every
 * real loop boundary and that is one completed chant (`loopSource: 'audio'`).
 *
 * Do not derive a playing loop's count from the sitting clock. The clip's
 * measured duration is not how long a looping element really takes to repeat —
 * the browser re-seeks to the start at every loop and the seam adds time — and
 * the sitting clock starts before the first chant does. `floor(elapsed / clip)`
 * therefore runs ahead of the chant, and the devotee watches the count outrun
 * the sound. The clock is only used for the `clock` fallback, where counting at
 * the clip's pace is better than never reaching the target at all.
 */
export function completedCountFor(params: {
  config: SessionConfig;
  elapsedMs: number;
  chantMs: number;
  manualCount: number;
  loopOffset: number;
  /** Loop modes: chant loops the audio has actually completed. */
  loopCount?: number;
  /** Loop modes: which source drives the count. Defaults to the clock. */
  loopSource?: LoopCountSource;
}): number {
  const { config, elapsedMs, chantMs, manualCount, loopOffset } = params;
  if (!isLoopMode(config.mode)) return Math.max(0, manualCount);

  const source = params.loopSource ?? 'clock';
  if (source === 'pending') return 0;
  if (source === 'clock' && chantMs <= 0) return Math.max(0, manualCount);

  const derived =
    source === 'audio'
      ? (params.loopCount ?? 0) + loopOffset
      : Math.floor(Math.max(0, elapsedMs) / chantMs) + loopOffset;
  const cap = config.mode === 'count' ? targetCountFor(config) : Number.MAX_SAFE_INTEGER;
  return Math.max(0, Math.min(cap, Math.max(0, derived)));
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
