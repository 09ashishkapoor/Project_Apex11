import { useEffect, useState } from 'preact/hooks';
import { isAppleMobile } from '../lib/storage';
import {
  canPromptInstall,
  isInstalledNow,
  markDismissed,
  onInstallChange,
  promptInstall,
  readDismissedAt,
  shouldOfferInstall,
} from '../lib/install';

/**
 * The install ask, shown on Today once a sitting has actually been completed.
 *
 * It sits in the normal flow rather than floating over the content, so it can
 * never cover the altar or swallow a tap. On iOS there is no install API, so it
 * explains the Share → Add to Home Screen route instead of pretending to have a
 * button.
 */
export function InstallHint({ lifetimeChants }: { lifetimeChants: number }) {
  const [, setTick] = useState(0);
  const [appleMobile] = useState(() => isAppleMobile());

  useEffect(() => {
    // Re-evaluate whenever the browser tells us installability changed.
    const update = () => setTick((value) => value + 1);
    const unsubscribe = onInstallChange(update);
    return unsubscribe;
  }, []);

  const offered = shouldOfferInstall({
    installed: isInstalledNow(),
    appleMobile,
    canPrompt: canPromptInstall(),
    lifetimeChants,
    dismissedAt: readDismissedAt(),
    now: Date.now(),
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

  return (
    <aside class="install-hint" aria-label="Install MANTRINI">
      <p>
        {canPrompt ? (
          <>
            Keep MANTRINI on your Home Screen — it opens without a connection, and your ledger
            stays put.
          </>
        ) : (
          <>
            Add MANTRINI to your Home Screen — tap Share, then <b>Add to Home Screen</b> — so your
            ledger is not cleared by the browser.
          </>
        )}
      </p>
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
