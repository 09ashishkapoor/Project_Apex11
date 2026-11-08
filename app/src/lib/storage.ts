/**
 * Storage durability.
 *
 * IndexedDB is "best effort" by default: a browser under storage pressure, or
 * Safari on iOS for a site that has not been added to the Home Screen, may evict
 * it. For an app whose entire value is a years-long practice record, that is not
 * acceptable, so we ask for persistent storage and tell the devotee the truth
 * when the browser says no.
 */

interface StorageManagerLike {
  persist?: () => Promise<boolean>;
  persisted?: () => Promise<boolean>;
  estimate?: () => Promise<{ usage?: number; quota?: number }>;
}

function manager(): StorageManagerLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & { storage?: StorageManagerLike }).storage;
}

export type PersistenceState = 'granted' | 'denied' | 'unsupported' | 'unknown';

/**
 * Ask the browser to exempt this origin's storage from eviction.
 * Chrome grants this silently for installed apps / engaged sites; Firefox and
 * Safari decide by heuristic, so a `false` here is not an error.
 */
export async function requestPersistentStorage(): Promise<PersistenceState> {
  const storage = manager();
  if (!storage?.persist || !storage.persisted) return 'unsupported';
  try {
    if (await storage.persisted()) return 'granted';
    return (await storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

export async function persistenceState(): Promise<PersistenceState> {
  const storage = manager();
  if (!storage?.persisted) return 'unsupported';
  try {
    return (await storage.persisted()) ? 'granted' : 'denied';
  } catch {
    return 'unknown';
  }
}

export async function storageEstimate(): Promise<{ usedKb: number; quotaKb: number } | null> {
  const storage = manager();
  if (!storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await storage.estimate();
    return { usedKb: Math.round(usage / 1024), quotaKb: Math.round(quota / 1024) };
  } catch {
    return null;
  }
}

/** True when running as an installed app rather than a browser tab. */
export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standalone || iosStandalone;
}

/** iOS and iPadOS: the platform where web install and storage behave differently. */
export function isAppleMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ reports itself as a Mac; the touch points give it away.
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints ?? 0) > 1;
}
