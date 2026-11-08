import { useEffect, useState } from 'preact/hooks';
import { store, type AppState } from '../state/store';

/**
 * Subscribes to the single app store. The app is small enough that one
 * subscription at the root is cheaper than a context tree, and the tick is
 * only mounted while a session is running.
 */
export function useAppState(): AppState {
  const [state, setState] = useState<AppState>(store.getState);
  useEffect(() => {
    const unsubscribe = store.subscribe(() => setState(store.getState()));
    setState(store.getState());
    return () => {
      unsubscribe();
    };
  }, []);
  return state;
}

/** Re-renders once a second so a running clock stays current. */
export function useSecondTick(enabled: boolean): void {
  const [, force] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, [enabled]);
}
