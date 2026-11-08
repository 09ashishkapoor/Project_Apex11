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
 * while the database opens, then for a short minimum so it registers as a brand
 * moment rather than a flicker. Tapping dismisses it as soon as the app is
 * ready. The old build blocked every cold start for 2.8s with no way out
 * (audit defect B2), which is exactly what this must not reproduce.
 */
const SPLASH_MIN_MS = 1150;
const SPLASH_MAX_MS = 4000;

export function App() {
  const state = useAppState();
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    if (!state.ready) return;
    const id = setTimeout(() => setSplashGone(true), SPLASH_MIN_MS);
    return () => clearTimeout(id);
  }, [state.ready]);

  // Absolute cap: never trap the devotee on a brand screen.
  useEffect(() => {
    const id = setTimeout(() => setSplashGone(true), SPLASH_MAX_MS);
    return () => clearTimeout(id);
  }, []);

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
