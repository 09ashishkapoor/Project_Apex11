import { describe, expect, it } from 'vitest';
import { DEFAULT_MODE, defaultSessionConfig, parseConfig } from '../src/lib/prefs';

describe('parseConfig', () => {
  it('falls back to the default when nothing is stored', () => {
    expect(parseConfig(null)).toEqual(defaultSessionConfig());
    expect(parseConfig('')).toEqual(defaultSessionConfig());
    expect(defaultSessionConfig().mode).toBe(DEFAULT_MODE);
  });

  it('restores a stored mode', () => {
    expect(parseConfig(JSON.stringify({ mode: 'timed', malas: 3, timedMinutes: 15 }))).toEqual({
      mode: 'timed',
      malas: 3,
      timedMinutes: 15,
    });
  });

  it('ignores corrupt or hostile values instead of failing to open', () => {
    expect(parseConfig('{not json')).toEqual(defaultSessionConfig());
    expect(parseConfig('null')).toEqual(defaultSessionConfig());
    expect(parseConfig('"a string"')).toEqual(defaultSessionConfig());
    expect(parseConfig(JSON.stringify({ mode: 'banana' })).mode).toBe(DEFAULT_MODE);
  });

  it('keeps the stepper inside its own bounds', () => {
    expect(parseConfig(JSON.stringify({ malas: 999 })).malas).toBe(9);
    expect(parseConfig(JSON.stringify({ malas: 0 })).malas).toBe(1);
    expect(parseConfig(JSON.stringify({ timedMinutes: 9999 })).timedMinutes).toBe(60);
    expect(parseConfig(JSON.stringify({ timedMinutes: -5 })).timedMinutes).toBe(5);
    expect(parseConfig(JSON.stringify({ malas: 'wat' })).malas).toBe(1);
  });

  it('round-trips exactly what it writes', () => {
    const config = { mode: 'count' as const, malas: 4, timedMinutes: 30 };
    expect(parseConfig(JSON.stringify(config))).toEqual(config);
  });

  it('does not let a stored mode smuggle in a custom count', () => {
    // Only the three known fields survive; anything else is dropped.
    const parsed = parseConfig(JSON.stringify({ mode: 'manual', malas: 2, timedMinutes: 10, targetCount: 7 }));
    expect(Object.keys(parsed).sort()).toEqual(['malas', 'mode', 'timedMinutes']);
  });
});
