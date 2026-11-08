/**
 * Remembered sitting preferences.
 *
 * The chosen mode used to reset on every launch, so anyone who deliberately
 * picked Tap or Timer had to pick it again each time — which quietly pushes
 * everyone back onto the default. Kept in localStorage rather than IndexedDB on
 * purpose: it must be readable synchronously, before the first render, so the
 * Altar and the session agree on the mode from the first frame.
 *
 * Everything here is defensive. A stored value can be corrupt, from an older
 * build, or hand-edited, and none of that may stop the app from opening.
 */
import type { SessionMode } from '../data/types';
import { defaultConfig, type SessionConfig } from '../state/session';

const KEY = 'mantrini.config';

/** What a devotee who has never chosen gets. */
export const DEFAULT_MODE: SessionMode = 'audio';

const MODES: readonly SessionMode[] = ['manual', 'audio', 'timed', 'count'];
const MALAS = { min: 1, max: 9 };
const MINUTES = { min: 5, max: 60 };

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function defaultSessionConfig(): SessionConfig {
  return defaultConfig(DEFAULT_MODE);
}

/** Pure: turn whatever was stored into a usable config. */
export function parseConfig(raw: string | null | undefined): SessionConfig {
  const fallback = defaultSessionConfig();
  if (!raw) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (!parsed || typeof parsed !== 'object') return fallback;

  const value = parsed as Partial<Record<keyof SessionConfig, unknown>>;
  const mode = MODES.includes(value.mode as SessionMode) ? (value.mode as SessionMode) : fallback.mode;

  return {
    mode,
    malas: clamp(value.malas, MALAS.min, MALAS.max, fallback.malas),
    timedMinutes: clamp(value.timedMinutes, MINUTES.min, MINUTES.max, fallback.timedMinutes),
  };
}

function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadConfig(): SessionConfig {
  const store = storage();
  if (!store) return defaultSessionConfig();
  try {
    return parseConfig(store.getItem(KEY));
  } catch {
    return defaultSessionConfig();
  }
}

export function saveConfig(config: SessionConfig): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(KEY, JSON.stringify(config));
  } catch {
    /* private mode or full quota: the app keeps working, just forgets */
  }
}

export const CONFIG_KEY = KEY;
