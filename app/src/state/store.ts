import {
  allSessions,
  getSession,
  reapOrphanedSessions,
  insertMany,
  loadStats,
  replaceAll,
  resetAll as repoResetAll,
  resetDeity as repoResetDeity,
  setStatus,
  startSession,
  updateProgress,
} from '../data/repo';
import { exportBackup, parseBackup } from '../data/backup';
import { DEITIES, deityById } from '../data/deities';
import { CHANTS_PER_MALA, type SessionMode, type Stats } from '../data/types';
import type { ChantAudio } from '../lib/audio';
import { hapticComplete, hapticCount, hapticMala } from '../lib/haptics';
import { requestPersistentStorage, type PersistenceState } from '../lib/storage';
import { loadConfig, saveConfig } from '../lib/prefs';
import { acquireWakeLock, releaseWakeLock } from '../lib/wakelock';
import {
  cadenceMs,
  completedCountFor,
  isLoopMode,
  crossedMala,
  isSessionComplete,
  malasCompleted,
  remainingMs,
  targetCountFor,
  type SessionConfig,
} from './session';

export type View = 'today' | 'altar' | 'session' | 'blessing' | 'ledger';

/**
 * Fail a promise that never settles.
 *
 * IndexedDB is the one thing the app cannot run without, and a blocked origin â€”
 * Brave Shields, private mode, a storage policy â€” can leave `openDB` pending
 * forever with no error event. Without this the tap simply does nothing and the
 * app looks frozen.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

/** Turn a storage failure into something a devotee can act on. */
function beginErrorText(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  if (/storage|database|indexeddb/i.test(detail)) {
    return 'this browser is blocking the app\u2019s storage. Allow site data for this page, or open it in Chrome.';
  }
  return detail;
}

export interface LiveSession {
  id: number;
  deityId: string;
  config: SessionConfig;
  startedAt: number;
  /** Elapsed time banked before the current running segment. */
  accumulatedMs: number;
  /** Timestamp the current running segment began, or null while paused. */
  runningSince: number | null;
  manualCount: number;
  /** Measured length of one chant, in ms. */
  chantMs: number;
  /** Correction applied to derived loop counts (used by Undo). */
  loopOffset: number;
}

export interface BlessingState {
  deityId: string;
  mode: SessionMode;
  completed: number;
  malas: number;
  target: number;
  durationSeconds: number;
  /** True when the devotee closed the session before it finished on its own. */
  partial: boolean;
}

export interface AppState {
  ready: boolean;
  view: View;
  deityId: string;
  config: SessionConfig;
  live: LiveSession | null;
  blessing: BlessingState | null;
  stats: Stats;
  chantMs: number;
  audioPlaying: boolean;
  toast: string | null;
  busy: boolean;
  error: string | null;
  /** Whether the browser has agreed to keep this origin's storage. */
  persisted: PersistenceState;
  /** The offering animation is playing; covers the Blessing â†’ Today swap. */
  offering: boolean;
}

const EMPTY_STATS: Stats = {
  todayTotal: 0,
  lifetimeTotal: 0,
  completedMalas: 0,
  week: [0, 0, 0, 0, 0, 0, 0],
  perDeity: DEITIES.map((deity) => ({
    deity,
    totalCount: 0,
    completedMalas: 0,
    cycleCount: 0,
    toNextMala: CHANTS_PER_MALA,
  })),
  recent: [],
};

type Listener = () => void;

export class AppStore {
  private state: AppState = {
    ready: false,
    view: 'today',
    deityId: DEITIES[0]!.id,
    config: loadConfig(),
    live: null,
    blessing: null,
    stats: EMPTY_STATS,
    chantMs: 0,
    audioPlaying: false,
    toast: null,
    busy: false,
    error: null,
    persisted: 'unknown',
    offering: false,
  };

  private readonly listeners = new Set<Listener>();
  private ticker: ReturnType<typeof setInterval> | null = null;
  private lastPersist = 0;
  /** Last count shown, used to detect the moment a mala closes. */
  private lastCompleted = 0;
  /** Session id already warned about unplayable audio, so we warn once. */
  private audioWarnedFor: number | null = null;
  private audio: ChantAudio | null = null;
  private unsubEnded: (() => void) | null = null;

  constructor(audio?: ChantAudio) {
    if (audio) this.attachAudio(audio);
  }

  /** Wire the audio element up once, after the browser has a document. */
  attachAudio(audio: ChantAudio): void {
    this.unsubEnded?.();
    this.audio?.dispose();
    this.audio = audio;
    audio.onDuration((seconds) => {
      const ms = Math.round(seconds * 1000);
      this.patch({ chantMs: ms });
      const live = this.state.live;
      if (live) this.patch({ live: { ...live, chantMs: ms } });
    });
    this.unsubEnded = audio.onEnded(() => {
      // Audio mode: one chant finished, so one count.
      if (this.state.live?.config.mode === 'audio') {
        this.patch({ audioPlaying: false });
        void this.count();
      }
    });
  }

  // ---------------------------------------------------------------- plumbing

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getState = (): AppState => this.state;

  private patch(changes: Partial<AppState>): void {
    this.state = { ...this.state, ...changes };
    for (const listener of this.listeners) listener();
  }

  private toast(message: string): void {
    this.patch({ toast: message });
    setTimeout(() => {
      if (this.state.toast === message) this.patch({ toast: null });
    }, 2600);
  }

  /** Public notification used by the UI for clipboard/backup feedback. */
  notify(message: string): void {
    this.toast(message);
  }

  // -------------------------------------------------------------------- boot

  async boot(): Promise<void> {
    try {
      // Ask for durable storage before the first write, not after. A practice
      // record that a browser can evict is not a record.
      const persisted = await requestPersistentStorage();
      const reaped = await reapOrphanedSessions();
      const stats = await loadStats();
      this.patch({ ready: true, stats, persisted });
      if (reaped > 0) {
        // Nothing to tell the devotee about individually; just make sure the
        // books are square. This is data hygiene, not an event.
        console.info(`[mantrini] closed ${reaped} unfinished session(s) left by a previous run`);
      }
    } catch (error) {
      this.patch({ ready: true, error: String(error) });
    }
  }

  private async refreshStats(): Promise<void> {
    try {
      this.patch({ stats: await loadStats() });
    } catch (error) {
      console.warn('[mantrini] could not refresh stats', error);
    }
  }

  // ------------------------------------------------------------ navigation

  go(view: View): void {
    if (view === this.state.view) return;
    this.patch({ view });
  }

  selectDeity(id: string): void {
    this.patch({ deityId: id });
  }

  setMode(mode: SessionMode): void {
    const config = { ...this.state.config, mode };
    saveConfig(config);
    this.patch({ config });
  }

  /** The Altar stepper. Malas for every mode but timed, minutes for timed. */
  stepTarget(delta: number): void {
    const config = this.state.config;
    if (config.mode === 'timed') {
      const minutes = Math.min(60, Math.max(5, config.timedMinutes + delta * 5));
      const next = { ...config, timedMinutes: minutes };
      saveConfig(next);
      this.patch({ config: next });
      return;
    }
    const malas = Math.min(9, Math.max(1, config.malas + delta));
    const next = { ...config, malas };
    saveConfig(next);
    this.patch({ config: next });
  }

  // ----------------------------------------------------------- session live

  private elapsedMs(): number {
    const live = this.state.live;
    if (!live) return 0;
    const running = live.runningSince === null ? 0 : Date.now() - live.runningSince;
    return live.accumulatedMs + running;
  }

  private completedNow(): number {
    const live = this.state.live;
    if (!live) return 0;
    return completedCountFor({
      config: live.config,
      elapsedMs: this.elapsedMs(),
      chantMs: this.chantSecondsMs(),
      manualCount: live.manualCount,
      loopOffset: live.loopOffset,
    });
  }

  private chantSecondsMs(): number {
    const live = this.state.live;
    const measured = Math.max(live?.chantMs ?? 0, this.state.chantMs);
    const deityId = live?.deityId ?? this.state.deityId;
    return cadenceMs(measured, deityById(deityId).chantMs);
  }

  async start(): Promise<void> {
    if (this.state.busy) return;

    // Must happen synchronously, while the tap is still a gesture. Everything
    // below awaits IndexedDB first, and by then browsers will refuse to start
    // audio at all. See ChantAudio.prime.
    this.audio?.prime(deityById(this.state.deityId).audio);

    this.patch({ busy: true });
    const deity = deityById(this.state.deityId);
    const config = this.state.config;
    const target = targetCountFor(config);
    const durationSeconds = config.mode === 'timed' ? config.timedMinutes * 60 : 0;

    try {
      const id = await withTimeout(
        startSession({
          deityId: deity.id,
          mantraId: deity.mantraId,
          mode: config.mode,
          targetCount: target,
          durationSeconds,
        }),
        4000,
        'storage did not answer in time',
      );

      const now = Date.now();
      const live: LiveSession = {
        id,
        deityId: deity.id,
        config,
        startedAt: now,
        accumulatedMs: 0,
        runningSince: now,
        manualCount: 0,
        chantMs: this.state.chantMs,
        loopOffset: 0,
      };
      this.patch({ live, view: 'session', busy: false, blessing: null, audioPlaying: false });
      this.lastCompleted = 0;
      this.audioWarnedFor = null;
      this.startTicker();
      void acquireWakeLock();

      if (isLoopMode(config.mode)) {
        await this.playLoop(deity.audio);
      }
    } catch (error) {
      console.error('[mantrini] could not begin the sitting', error);
      this.patch({ busy: false });
      this.toast(`Could not begin: ${beginErrorText(error)}`);
    }
  }

  private async playLoop(src: string): Promise<void> {
    if (!this.audio) return;
    try {
      await this.audio.play(src, { loop: true });
      this.patch({ audioPlaying: true });
    } catch (error) {
      // The sitting keeps its own clock, and the cadence falls back to the
      // clip's known length (see `chantSecondsMs`), so the count genuinely does
      // continue without sound. Say that, rather than the old claim that the
      // count "still works" while it silently stayed at zero.
      console.warn('[mantrini] chant audio failed to start', error);
      this.patch({ audioPlaying: false });
      this.warnAudioOnce(
        "The chant audio could not start. Counting continues at this mantra's pace.",
      );
    }
  }

  /** One notice per session: repeated identical toasts are just noise. */
  private warnAudioOnce(message: string): void {
    const sessionId = this.state.live?.id ?? null;
    if (sessionId !== null && this.audioWarnedFor === sessionId) return;
    this.audioWarnedFor = sessionId;
    this.toast(message);
  }

  private startTicker(): void {
    this.stopTicker();
    this.ticker = setInterval(() => this.tick(), 250);
  }

  private stopTicker(): void {
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  }

  private tick(): void {
    const live = this.state.live;
    if (!live || live.runningSince === null) return;

    const elapsed = this.elapsedMs();
    const completed = this.completedNow();

    if (crossedMala(this.lastCompleted, completed)) hapticMala();
    this.lastCompleted = completed;

    if (isSessionComplete({ config: live.config, completed, elapsedMs: elapsed })) {
      void this.finish(false);
      return;
    }

    // Keep the database reasonably current without writing four times a second.
    const now = Date.now();
    if (now - this.lastPersist > 2000) {
      this.lastPersist = now;
      void updateProgress(live.id, completed, Math.floor(elapsed / 1000)).catch(() => {});
    }

    this.patch({}); // re-render for the clock / derived count
  }

  /** Manual tap, or the audio-mode completion event. */
  async count(): Promise<void> {
    const live = this.state.live;
    if (!live || live.runningSince === null) return;
    if (isLoopMode(live.config.mode)) return;

    const prev = live.manualCount;
    const next = prev + 1;
    const liveNext: LiveSession = { ...live, manualCount: next };

    if (next % CHANTS_PER_MALA === 0) hapticMala();
    else hapticCount();

    this.patch({ live: liveNext });

    const elapsedSeconds = Math.floor(this.elapsedMs() / 1000);
    await updateProgress(live.id, next, elapsedSeconds).catch(() => {});

    if (isSessionComplete({ config: live.config, completed: next, elapsedMs: this.elapsedMs() })) {
      await this.finish(false);
    }
  }

  /** Audio mode: play one chant; the count comes from onEnded. */
  async playSingle(): Promise<void> {
    const live = this.state.live;
    if (!live || !this.audio || live.runningSince === null) return;
    if (live.config.mode !== 'audio') return;
    const deity = deityById(live.deityId);
    try {
      await this.audio.replay(deity.audio);
      this.patch({ audioPlaying: true });
    } catch (error) {
      // If the chant will not play, the sitting must not stall: count the
      // press so the devotee can keep going and is told what happened.
      console.warn('[mantrini] chant audio failed to play', error);
      this.patch({ audioPlaying: false });
      this.warnAudioOnce('The chant audio could not start. Counting without sound.');
      await this.count();
    }
  }

  /** Undo the most recent count. Audit defect B6. */
  async undo(): Promise<void> {
    const live = this.state.live;
    if (!live) return;
    if (isLoopMode(live.config.mode)) {
      const next: LiveSession = { ...live, loopOffset: live.loopOffset - 1 };
      this.patch({ live: next });
      return;
    }
    if (live.manualCount <= 0) return;
    const next = live.manualCount - 1;
    this.patch({ live: { ...live, manualCount: next } });
    await updateProgress(live.id, next, Math.floor(this.elapsedMs() / 1000)).catch(() => {});
  }

  pause(): void {
    const live = this.state.live;
    if (!live || live.runningSince === null) return;
    const elapsed = this.elapsedMs();
    const completed = this.completedNow();
    this.stopTicker();
    this.audio?.pause();
    releaseWakeLock();
    this.patch({
      live: { ...live, accumulatedMs: elapsed, runningSince: null },
      audioPlaying: false,
    });
    void setStatus(live.id, 'paused', completed, Math.floor(elapsed / 1000)).catch(() => {});
  }

  async resume(): Promise<void> {
    const live = this.state.live;
    if (!live || live.runningSince !== null) return;
    this.patch({ live: { ...live, runningSince: Date.now() } });
    this.lastCompleted = this.completedNow();
    this.startTicker();
    void acquireWakeLock();
    const deity = deityById(live.deityId);
    if (isLoopMode(live.config.mode)) await this.playLoop(deity.audio);
  }

  /** Close the session. `dueToTimer` is true when the session's own clock ran out. */
  async finish(dueToTimer: boolean): Promise<void> {
    const live = this.state.live;
    if (!live) return;

    const elapsed = this.elapsedMs();
    const completed = this.completedNow();
    const durationSeconds = Math.floor(elapsed / 1000);

    this.stopTicker();
    this.audio?.stop();
    releaseWakeLock();

    const target = targetCountFor(live.config);
    const reachedTarget = target > 0 ? completed >= target : dueToTimer;
    const deity = deityById(live.deityId);

    try {
      await setStatus(live.id, 'completed', completed, durationSeconds, Date.now());
    } catch (error) {
      console.warn('[mantrini] could not close the session cleanly', error);
    }

    hapticComplete();
    this.patch({
      live: null,
      audioPlaying: false,
      view: 'blessing',
      blessing: {
        deityId: deity.id,
        mode: live.config.mode,
        completed,
        malas: malasCompleted(completed),
        target,
        durationSeconds,
        partial: !reachedTarget,
      },
    });
    await this.refreshStats();
  }

  /** The devotee ends the session early, from the Finish control. */
  async finishEarly(): Promise<void> {
    await this.finish(false);
  }

  /** Close the sitting: the offering has been made, so return to Today. */
  offer(): void {
    this.patch({ view: 'today', blessing: null });
  }

  /**
   * Give the mala away, then return to Today.
   *
   * The Beads animation runs in CSS on the Blessing screen; this only has to
   * hold the veil across the view swap and clear it afterwards. The timings
   * match `styles/offering.css` â€” change them together.
   */
  beginOffer(): void {
    if (this.state.offering) return;
    this.patch({ offering: true });

    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const swapAt = reduced ? 120 : 1250;
    const veilGoneAt = reduced ? 900 : 1800;

    setTimeout(() => this.offer(), swapAt);
    setTimeout(() => this.patch({ offering: false }), veilGoneAt);
  }

  anotherMala(): void {
    const live = this.state.blessing;
    const deityId = live?.deityId ?? this.state.deityId;
    const config = this.state.config;
    this.patch({ view: 'altar', blessing: null, deityId, config });
  }

  // ------------------------------------------------------------- backup I/O

  async exportBackup(): Promise<string> {
    return exportBackup(await allSessions());
  }

  async importBackup(raw: string, mode: 'merge' | 'replace'): Promise<number> {
    const rows = parseBackup(raw);
    if (mode === 'replace') {
      await replaceAll(rows);
    } else {
      await insertMany(rows);
    }
    await this.refreshStats();
    return rows.length;
  }

  async resetAll(): Promise<void> {
    await repoResetAll();
    await this.refreshStats();
    this.toast('Ledger cleared.');
  }

  async resetDeity(deityId: string): Promise<void> {
    await repoResetDeity(deityId);
    await this.refreshStats();
    this.toast(`${deityById(deityId).displayName} history cleared.`);
  }

  async loadSession(id: number) {
    return getSession(id);
  }

  /** Remaining time for a timed sitting, in ms. */
  remaining(): number {
    const live = this.state.live;
    if (!live || live.config.mode !== 'timed') return 0;
    return remainingMs(live.config, this.elapsedMs());
  }

  elapsedSeconds(): number {
    return Math.floor(this.elapsedMs() / 1000);
  }

  completed(): number {
    return this.completedNow();
  }

  /** Called from the "beforeunload" guard. */
  hasLiveSession(): boolean {
    return this.state.live !== null;
  }

  dispose(): void {
    this.stopTicker();
    this.unsubEnded?.();
    this.audio?.dispose();
    this.listeners.clear();
  }
}

export const store = new AppStore();
