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
 * dedication were gone before most people had looked at them â€” a brand moment
 * you cannot read is just a flicker. Now it waits for the devotee to tap, and
 * "Tap to begin" is on screen from the moment the app is ready.
 *
 * The one exception is an automated browser, which has no one to tap for it.
 * `navigator.webdriver` is only true under WebDriver/Playwright, so the checks
 * keep working without a special URL or a hidden flag in the app.
 */
const AUTOMATED = typeof navigator !== 'undefined' && navigator.webdriver === true;

export function App() {
  const state = useAppState();
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    if (!state.ready || !AUTOMATED) return;
    // Long enough that the capture tooling can still photograph the splash.
    const id = setTimeout(() => setSplashGone(true), 1500);
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
