import { describe, expect, it } from 'vitest';
import {
  cadenceMs,
  chantsPerMinute,
  completedCountFor,
  crossedMala,
  defaultConfig,
  isLoopMode,
  isSessionComplete,
  malasCompleted,
  remainingMs,
  targetCountFor,
  timedDurationMs,
  type SessionConfig,
} from '../src/state/session';

const config = (overrides: Partial<SessionConfig> = {}): SessionConfig => ({
  ...defaultConfig('manual'),
  ...overrides,
});

describe('session targets', () => {
  it('targets malas worth of chants for every counting mode', () => {
    expect(targetCountFor(config({ mode: 'manual', malas: 1 }))).toBe(108);
    expect(targetCountFor(config({ mode: 'manual', malas: 3 }))).toBe(324);
    expect(targetCountFor(config({ mode: 'count', malas: 2 }))).toBe(216);
  });

  it('leaves timed sessions bounded by the clock, not a count', () => {
    expect(targetCountFor(config({ mode: 'timed', timedMinutes: 10 }))).toBe(0);
    expect(timedDurationMs(config({ mode: 'timed', timedMinutes: 10 }))).toBe(600_000);
  });

  it('knows which modes are self-counting', () => {
    expect(isLoopMode('timed')).toBe(true);
    expect(isLoopMode('count')).toBe(true);
    expect(isLoopMode('manual')).toBe(false);
    expect(isLoopMode('audio')).toBe(false);
  });
});

describe('counting', () => {
  it('returns the manual count unchanged for tap and audio modes', () => {
    expect(
      completedCountFor({
        config: config({ mode: 'manual' }),
        elapsedMs: 999_999,
        chantMs: 4000,
        manualCount: 12,
        loopOffset: 0,
      }),
    ).toBe(12);
  });

  it('derives the loop count from elapsed chant time', () => {
    const count = completedCountFor({
      config: config({ mode: 'count', malas: 2 }),
      elapsedMs: 40_000,
      chantMs: 4000,
      manualCount: 0,
      loopOffset: 0,
    });
    expect(count).toBe(10);
  });

  it('applies the undo offset to loop modes and never goes negative', () => {
    const base = {
      config: config({ mode: 'count' }),
      elapsedMs: 20_000,
      chantMs: 4000,
      manualCount: 0,
    };
    expect(completedCountFor({ ...base, loopOffset: -1 })).toBe(4);
    expect(completedCountFor({ ...base, loopOffset: -99 })).toBe(0);
  });

  it('never lets an auto-counted mala overshoot its target', () => {
    const count = completedCountFor({
      config: config({ mode: 'count', malas: 1 }),
      elapsedMs: 10_000_000,
      chantMs: 1000,
      manualCount: 0,
      loopOffset: 0,
    });
    expect(count).toBe(108);
  });

  it('does not derive a count before the chant length is known', () => {
    expect(
      completedCountFor({
        config: config({ mode: 'count' }),
        elapsedMs: 60_000,
        chantMs: 0,
        manualCount: 3,
        loopOffset: 0,
      }),
    ).toBe(3);
  });
});

describe('completion', () => {
  it('completes counting modes at their target', () => {
    const cfg = config({ mode: 'manual', malas: 1 });
    expect(isSessionComplete({ config: cfg, completed: 107, elapsedMs: 0 })).toBe(false);
    expect(isSessionComplete({ config: cfg, completed: 108, elapsedMs: 0 })).toBe(true);
  });

  it('completes a timed sitting when the clock runs out', () => {
    const cfg = config({ mode: 'timed', timedMinutes: 5 });
    expect(isSessionComplete({ config: cfg, completed: 0, elapsedMs: 299_000 })).toBe(false);
    expect(isSessionComplete({ config: cfg, completed: 0, elapsedMs: 300_000 })).toBe(true);
  });

  it('counts down and never reports negative time', () => {
    const cfg = config({ mode: 'timed', timedMinutes: 5 });
    expect(remainingMs(cfg, 0)).toBe(300_000);
    expect(remainingMs(cfg, 120_000)).toBe(180_000);
    expect(remainingMs(cfg, 400_000)).toBe(0);
    expect(remainingMs(config({ mode: 'manual' }), 400_000)).toBe(0);
  });
});

describe('mala boundaries', () => {
  it('counts malas closed in a session', () => {
    expect(malasCompleted(0)).toBe(0);
    expect(malasCompleted(107)).toBe(0);
    expect(malasCompleted(108)).toBe(1);
    expect(malasCompleted(215)).toBe(1);
    expect(malasCompleted(216)).toBe(2);
  });

  it('fires exactly when a mala closes, and not on every later count', () => {
    expect(crossedMala(107, 108)).toBe(true);
    expect(crossedMala(108, 109)).toBe(false);
    expect(crossedMala(107, 109)).toBe(true);
    expect(crossedMala(5, 4)).toBe(false);
    expect(crossedMala(0, 1)).toBe(false);
  });
});

describe('cadence', () => {
  it('uses the measured clip length when the audio reported one', () => {
    expect(cadenceMs(2470, 1080)).toBe(2470);
  });

  it('falls back to the clip\'s known length when the audio never reported one', () => {
    // A clip that failed to load reports 0. Without this, an automatic sitting
    // derives a count of zero forever and never reaches its target.
    expect(cadenceMs(0, 2470)).toBe(2470);
    expect(cadenceMs(-5, 2470)).toBe(2470);
  });

  it('keeps automatic counting alive with no measured duration at all', () => {
    const completed = completedCountFor({
      config: config({ mode: 'count', malas: 1 }),
      elapsedMs: 24_700,
      chantMs: cadenceMs(0, 2470),
      manualCount: 0,
      loopOffset: 0,
    });
    expect(completed).toBe(10);
  });
});

describe('rate', () => {
  it('shows nothing before there is enough signal', () => {
    expect(chantsPerMinute(0, 60_000)).toBe('—');
    expect(chantsPerMinute(5, 1_000)).toBe('—');
  });

  it('reports chants per minute', () => {
    // 108 chants in 9m12s is about 11.7 a minute.
    expect(chantsPerMinute(108, 552_000)).toBe('11.7');
  });
});
