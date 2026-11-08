/** Core domain types. Mirrors the original Flutter/Drift schema so that
 *  backups exported by the old app import without translation. */

export type SessionMode = 'manual' | 'audio' | 'timed' | 'count';

export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface Deity {
  readonly id: string;
  readonly mantraId: string;
  readonly displayName: string;
  readonly mantra: string;
  readonly invocation: string;
  readonly image: string;
  readonly audio: string;
  /**
   * Length of the chant clip in milliseconds, as measured from the bundled
   * file. Used as the counting cadence when the audio cannot report its own
   * duration (blocked autoplay, decode failure, data saver). Keep in step with
   * `public/audio/` — `tools/reencode-audio.py` prints the values.
   */
  readonly chantMs: number;
  /** Plate colour drawn from the deity's own photograph. */
  readonly plate: string;
  /** CSS object-position Y for the plate crop. */
  readonly plateY: string;
  /** Brightness multiplier for the plate crop. */
  readonly plateBrightness: number;
  readonly defaultTargetCount: number;
}

export interface SessionRecord {
  id: number;
  deityId: string;
  mantraId: string;
  /** epoch milliseconds */
  startedAt: number;
  /** epoch milliseconds, absent while the session is still open */
  endedAt?: number;
  targetCount: number;
  completedCount: number;
  mode: SessionMode;
  durationSeconds: number;
  status: SessionStatus;
}

export interface DeityStats {
  deity: Deity;
  totalCount: number;
  completedMalas: number;
  /** Chants into the current mala cycle, 0..107 */
  cycleCount: number;
  /** Chants still needed to close the next mala */
  toNextMala: number;
}

export interface RecentSession {
  id: number;
  deity: Deity;
  mode: SessionMode;
  completedCount: number;
  durationSeconds: number;
  startedAt: number;
  endedAt?: number;
}

export interface Stats {
  todayTotal: number;
  lifetimeTotal: number;
  completedMalas: number;
  /** Seven entries, oldest first, today last. */
  week: number[];
  perDeity: DeityStats[];
  recent: RecentSession[];
}

export const CHANTS_PER_MALA = 108;

/** The word used beside a running count. Kept to the same four words as the
 *  Altar tiles so the vocabulary never shifts under the devotee. */
export const MODE_LABEL: Record<SessionMode, string> = {
  manual: 'tap',
  audio: 'audio',
  timed: 'timer',
  count: 'auto',
};

export const MODE_FULL_LABEL: Record<SessionMode, string> = {
  manual: 'Tap each mantra',
  audio: 'Chant with audio',
  timed: 'Sit for a set time',
  count: 'Auto-count malas',
};
