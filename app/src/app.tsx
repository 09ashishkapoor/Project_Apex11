import { useEffect, useState } from 'preact/hooks';
import { useAppState } from './hooks/useAppState';
import { store, type View } from './state/store';
import { MalaSeamClip } from './components/MalaSeam';
import { Toast } from './components/ui';
import { Splash } from './components/Splash';
import { TodayScreen } from './screens/TodayScreen';
import { AltarScreen } from './screens/AltarScreen';
import { SessionScreen } from './screens/SessionScreen';
import { BlessingScreen } from './screens/BlessingScreen';
import { LedgerScreen } from './screens/LedgerScreen';

/**
 * The splash is the real boot screen, not a delay for its own sake: it stays
 * while the database opens, and then it waits.
 *
 * It used to dismiss itself after 1.15s, which meant the darshan and the
 * dedication were gone before most people had looked at them — a brand moment
 * you cannot read is just a flicker. Now it waits for the devotee to tap, and
 * "Tap to begin" is on screen from the moment the app is ready.
 *
 * Waiting on *every* launch would be its own problem: someone relaunching the app
 * to count would meet a wall each time. So the darshan is a cold-start moment —
 * the first open of a session waits for "Tap to begin" — while a returning visit
 * within that same session moves on by itself after a short beat.
 *
 * `sessionStorage` has exactly the right lifetime for this: it survives a reload
 * and dies with the tab, so a fresh launch is always a cold start.
 *
 * The one other exception is an automated browser, which has no one to tap for
 * it. `navigator.webdriver` is only true under WebDriver/Playwright, so the checks
 * keep working without a special URL or a hidden flag in the app.
 */
const AUTOMATED = typeof navigator !== 'undefined' && navigator.webdriver === true;
const SPLASH_SEEN_KEY = 'mantrini.splash-seen';
const RETURNING_BEAT_MS = 500;

/** False on a cold start, or when storage is unavailable and we cannot know. */
function splashAlreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function rememberSplashSeen(): void {
  try {
    sessionStorage.setItem(SPLASH_SEEN_KEY, '1');
  } catch {
    /* private mode: every launch is treated as a cold start */
  }
}

export function App() {
  const state = useAppState();
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    if (!state.ready) return;

    const returning = splashAlreadySeen();
    if (!returning) rememberSplashSeen();

    // A cold start with someone present waits indefinitely; a returning visit,
    // or automation, continues on its own.
    if (!returning && !AUTOMATED) return;

    // Long enough that the capture tooling can still photograph the splash.
    const id = setTimeout(() => setSplashGone(true), AUTOMATED ? 1500 : RETURNING_BEAT_MS);
    return () => clearTimeout(id);
  }, [state.ready]);

  const onGo = (view: View) => {
    // Leaving a running session from the nav would strand it; the Session
    // screen deliberately has no nav, and this is the second guard.
    if (state.live) return;
    store.go(view);
  };

  // A closed tab mid-session loses the sitting. Ask first.
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => {
      if (!store.hasLiveSession()) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, []);

  const showSplash = !splashGone;

  return (
    <div class="stage">
      <MalaSeamClip />
      <div class={`phone${state.view === 'blessing' ? ' is-lit' : ''}`}>
        {showSplash ? (
          <Splash
            canDismiss={state.ready}
            onDismiss={() => {
              if (state.ready) setSplashGone(true);
            }}
          />
        ) : (
          <>
            {state.view === 'today' ? <TodayScreen state={state} onGo={onGo} /> : null}
            {state.view === 'altar' ? <AltarScreen state={state} onGo={onGo} /> : null}
            {state.view === 'session' ? <SessionScreen state={state} /> : null}
            {state.view === 'blessing' ? <BlessingScreen state={state} /> : null}
            {state.view === 'ledger' ? <LedgerScreen state={state} onGo={onGo} /> : null}
          </>
        )}
        {state.offering ? <div class="offer-veil" aria-hidden="true" /> : null}
      </div>
      <Toast message={state.toast} />
    </div>
  );
}
