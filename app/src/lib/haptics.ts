/**
 * Haptics. Japa is counted with a thumb while the attention is inward, so the
 * hand needs to know the tap landed without looking at the screen.
 *
 * Uses the Vibration API where it exists (Android Chrome), and degrades to a
 * no-op elsewhere (iOS Safari, desktop). Inside the Capacitor wrapper the same
 * call reaches the native Haptics plugin through the shim in lib/native.ts.
 */

type Vibrate = (pattern: number | number[]) => void;

/**
 * Inside the Capacitor Android wrapper the bridge injects `window.Capacitor`.
 * Reading it here (rather than importing @capacitor/haptics) keeps the web
 * bundle free of native code while still giving the APK true platform haptics.
 */
interface CapacitorBridge {
  isNativePlatform?: () => boolean;
  Plugins?: {
    Haptics?: {
      impact?: (options: { style: string }) => Promise<void>;
      notification?: (options: { type: string }) => Promise<void>;
    };
  };
}

function capacitor(): CapacitorBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { Capacitor?: CapacitorBridge }).Capacitor;
}

function nativeHaptics() {
  const bridge = capacitor();
  if (!bridge?.isNativePlatform?.()) return undefined;
  return bridge.Plugins?.Haptics;
}

function vibrator(): Vibrate | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { vibrate?: Vibrate };
  return typeof nav.vibrate === 'function' ? nav.vibrate.bind(nav) : null;
}

function fire(style: 'LIGHT' | 'MEDIUM' | 'HEAVY', fallback: number | number[]): void {
  const haptics = nativeHaptics();
  if (haptics?.impact) {
    void haptics.impact({ style }).catch(() => {
      vibrator()?.(fallback);
    });
    return;
  }
  vibrator()?.(fallback);
}

/** Every counted mantra. */
export function hapticCount(): void {
  fire('LIGHT', 9);
}

/** A mala closed. */
export function hapticMala(): void {
  fire('MEDIUM', [16, 44, 16]);
}

/** A session finished. */
export function hapticComplete(): void {
  fire('HEAVY', [14, 60, 14, 60, 26]);
}
