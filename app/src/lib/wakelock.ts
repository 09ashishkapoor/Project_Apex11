/**
 * Keep the screen awake while a session is running.
 *
 * A japa sitting is 10–45 minutes with the phone propped or held loosely. If the
 * screen sleeps the looping chant stops and the count freezes, which is exactly
 * the failure the Flutter build avoided with `wakelock_plus`.
 *
 * The Screen Wake Lock API is now supported in Chrome, Safari 16.4+ and
 * Firefox 126+, and requires a secure context (https or localhost).
 */

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
}

let sentinel: WakeLockSentinelLike | null = null;
let wanted = false;

function api(): WakeLockNavigator['wakeLock'] {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as Navigator & WakeLockNavigator).wakeLock;
}

export function wakeLockSupported(): boolean {
  return Boolean(api());
}

async function request(): Promise<boolean> {
  const wakeLock = api();
  if (!wakeLock) return false;
  try {
    const lock = await wakeLock.request('screen');
    sentinel = lock;
    lock.addEventListener('release', () => {
      if (sentinel === lock) sentinel = null;
    });
    return true;
  } catch {
    // Rejected when the document is hidden or the platform refuses; harmless.
    return false;
  }
}

/** Ask for a wake lock. Safe to call repeatedly. */
export async function acquireWakeLock(): Promise<boolean> {
  wanted = true;
  if (sentinel) return true;
  return request();
}

/** Give the screen back to the system. */
export function releaseWakeLock(): void {
  wanted = false;
  const lock = sentinel;
  sentinel = null;
  if (lock) void lock.release().catch(() => {});
}

// Browsers drop the lock whenever the page is hidden. Re-take it when the
// devotee comes back to a session that is still running.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (wanted && document.visibilityState === 'visible' && !sentinel) {
      void request();
    }
  });
}
