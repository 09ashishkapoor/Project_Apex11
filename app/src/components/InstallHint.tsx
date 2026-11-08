import { useEffect, useState } from 'preact/hooks';
import { isAppleMobile } from '../lib/storage';
import {
  canPromptInstall,
  isChromium,
  isInstalledNow,
  markDismissed,
  onInstallChange,
  promptInstall,
  readDismissedAt,
  shouldOfferInstall,
} from '../lib/install';

/**
 * The install ask.
 *
 * Three shapes, because there are three situations:
 *
 * - Chromium with the deferred prompt → a real Install button.
 * - iOS → Share → Add to Home Screen, because no install API exists there.
 * - Chromium without the prompt yet → where the browser's own menu entry is.
 *   Chrome only fires `beforeinstallprompt` once it has engagement history, so a
 *   first-time visitor otherwise gets no install control at all and reasonably
 *   concludes the app cannot be installed.
 *
 * `requireSitting` is true on Today (never interrupt someone who just arrived)
 * and false in the Ledger, which is where someone goes looking for it.
 */
export function InstallHint({
  lifetimeChants,
  requireSitting = true,
}: {
  lifetimeChants: number;
  requireSitting?: boolean;
}) {
  const [, setTick] = useState(0);
  const [appleMobile] = useState(() => isAppleMobile());
  const [chromium] = useState(() => isChromium());

  useEffect(() => {
    const update = () => setTick((value) => value + 1);
    return onInstallChange(update);
  }, []);

  const offered = shouldOfferInstall({
    installed: isInstalledNow(),
    appleMobile,
    chromium,
    canPrompt: canPromptInstall(),
    lifetimeChants,
    dismissedAt: readDismissedAt(),
    now: Date.now(),
    requireSitting,
  });

  if (!offered) return null;

  const canPrompt = canPromptInstall();

  const dismiss = () => {
    markDismissed();
    setTick((value) => value + 1);
  };

  const install = async () => {
    const outcome = await promptInstall();
    // A dismissal from the browser's own dialog counts as "not now" for a while;
    // if they accepted, `appinstalled` will hide this for good.
    if (outcome === 'dismissed') markDismissed();
    setTick((value) => value + 1);
  };

  const message = canPrompt ? (
    <>
      Keep MANTRINI on your Home Screen — it opens without a connection, and your ledger stays
      put.
    </>
  ) : appleMobile ? (
    <>
      Add MANTRINI to your Home Screen — tap Share, then <b>Add to Home Screen</b> — so your
      ledger is not cleared by the browser.
    </>
  ) : (
    <>
      To install MANTRINI, open the browser menu <b>⋮</b> and choose <b>Install app</b> or{' '}
      <b>Add to Home screen</b>. If it is not there yet, use the app once more and it will
      appear.
    </>
  );

  return (
    <aside class="install-hint" aria-label="Install MANTRINI">
      <p>{message}</p>
      <div class="install-hint__actions">
        {canPrompt ? (
          <button type="button" class="install-hint__go" onClick={() => void install()}>
            Install
          </button>
        ) : null}
        <button type="button" class="install-hint__close" onClick={dismiss}>
          Not now
        </button>
      </div>
    </aside>
  );
}
