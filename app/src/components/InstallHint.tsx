import { useEffect, useState } from 'preact/hooks';
import { isAppleMobile, isInstalled } from '../lib/storage';

const DISMISS_KEY = 'mantrini.install-hint-dismissed';

/**
 * On iPhone and iPad the app works, but two things behave differently until it
 * is added to the Home Screen: Safari may evict the site's storage after seven
 * days, and haptic feedback is not available at all. This is a one-line, once
 * dismissible note — not a modal, and never shown in a browser where it does
 * not apply.
 */
export function InstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isAppleMobile() || isInstalled()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* private mode: still show the hint, it cannot be remembered anyway */
    }
    setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  return (
    <aside class="install-hint" aria-label="Add to Home Screen">
      <p>
        Add MANTRINI to your Home Screen — tap Share, then <b>Add to Home Screen</b> — so your
        ledger is not cleared by the browser.
      </p>
      <button type="button" class="install-hint__close" onClick={dismiss} aria-label="Dismiss">
        Not now
      </button>
    </aside>
  );
}
