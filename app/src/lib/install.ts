/**
 * Install prompting.
 *
 * Two platforms, two mechanisms:
 *
 * - Chrome, Edge and Android fire `beforeinstallprompt`. The event has to be
 *   captured early and held, then re-fired from a user gesture, and it can only
 *   be used once.
 * - Safari — every browser on iOS — never fires it. There is no API to install
 *   a web app there, so the only honest thing to show is instructions.
 *
 * Nothing is offered on arrival. The ask appears on the Today screen, after the
 * devotee has actually completed a sitting, and a "not now" is respected for a
 * month rather than forever.
 */
import { isInstalled } from './storage';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const INSTALL_DISMISS_KEY = 'mantrini.install-dismissed-at';
export const INSTALL_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

let deferred: InstallPromptEvent | null = null;
let installedThisVisit = false;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Must run before the first render. The browser fires `beforeinstallprompt`
 * as soon as the app qualifies, which can be well before any component mounts.
 */
export function watchInstallability(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installedThisVisit = true;
    notify();
  });
}

export function onInstallChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function canPromptInstall(): boolean {
  return deferred !== null;
}

/** Open the browser's own install dialog. Returns what the devotee chose. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = deferred;
  if (!event) return 'unavailable';
  // The deferred event is single use; drop it either way.
  deferred = null;
  notify();
  try {
    await event.prompt();
    const choice = await event.userChoice;
    return choice.outcome;
  } catch {
    return 'unavailable';
  }
}

export function isInstalledNow(): boolean {
  return installedThisVisit || isInstalled();
}

/**
 * Whether to show the install card. Pure, so the rules are testable without a
 * browser and without a clock.
 */
export function shouldOfferInstall(input: {
  installed: boolean;
  appleMobile: boolean;
  canPrompt: boolean;
  lifetimeChants: number;
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (input.installed) return false;
  // Never on arrival: only after the devotee has actually finished a sitting.
  if (input.lifetimeChants <= 0) return false;
  // If there is nothing to offer and nothing to explain, say nothing.
  if (!input.canPrompt && !input.appleMobile) return false;
  if (input.dismissedAt !== null) {
    const elapsed = input.now - input.dismissedAt;
    // A clock that moved backwards should still suppress, not loop forever.
    if (elapsed < INSTALL_COOLDOWN_MS) return false;
  }
  return true;
}

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readDismissedAt(): number | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(INSTALL_DISMISS_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export function markDismissed(now: number = Date.now()): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(INSTALL_DISMISS_KEY, String(now));
  } catch {
    /* private mode: the card simply reappears next visit */
  }
}
