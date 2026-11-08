import { useEffect, useState } from 'preact/hooks';
import { DEDICATION } from '../data/deities';

/**
 * The opening screen: darshan, brand, and the dedication.
 *
 * The deity sits inside a downward-pointing trikoṇa — the Shakti triangle that
 * is central to Ma Kali's yantra — drawn as a single stroked triangle rather
 * than a full yantra. A complete yantra would add concentric circles, lotus
 * petals and the bindu; inventing those would be decoration, not devotion, so
 * only the one form that is unambiguous is used, plus the lamplight behind it.
 *
 * This replaces two things at once — the old 2.8-second unskippable dedication
 * gate (audit defect B2) and the bare loading state the rebuild shipped with.
 * It is the real boot screen: it stays only as long as the database is opening,
 * with a short minimum so it registers as a brand moment instead of a flash.
 * Tapping it dismisses it immediately once the app is ready.
 */
export function Splash({ canDismiss, onDismiss }: { canDismiss: boolean; onDismiss: () => void }) {
  const [lit, setLit] = useState(false);

  // The lamp comes up: a warm wash rises over the first three quarters of a second.
  useEffect(() => {
    const id = setTimeout(() => setLit(true), 40);
    return () => clearTimeout(id);
  }, []);

  // Any key continues, so a devotee is never stuck hunting for the button — and
  // so the screen is usable without a pointer.
  useEffect(() => {
    if (!canDismiss) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [canDismiss, onDismiss]);

  return (
    <div
      class={`splash${lit ? ' is-lit' : ''}`}
      role="group"
      aria-label="MANTRINI, a respectful, offline japa companion"
      onClick={canDismiss ? onDismiss : undefined}
    >
      <div class="splash__glow" aria-hidden="true" />
      <div class="splash__grain" aria-hidden="true" />

      <div class="splash__body">
        <div class="splash__yantra" aria-hidden="true">
          <svg viewBox="0 0 280 244" class="splash__yantra-svg" preserveAspectRatio="xMidYMid meet">
            <defs>
              <clipPath id="kali-trikona">
                <polygon points="140,241 2,3 278,3" />
              </clipPath>
              <linearGradient id="kali-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#F7E3BB" />
                <stop offset="42%" stop-color="#EDAE55" />
                <stop offset="100%" stop-color="#C0803A" />
              </linearGradient>
              {/* Sinks the photograph's black backdrop into the room, so the
                  darshan reads as a lit plate rather than a pasted photo. */}
              <radialGradient id="kali-wash" cx="50%" cy="40%" r="64%">
                <stop offset="0%" stop-color="#0D0506" stop-opacity="0" />
                <stop offset="58%" stop-color="#0D0506" stop-opacity="0.1" />
                <stop offset="100%" stop-color="#0D0506" stop-opacity="0.66" />
              </radialGradient>
              <linearGradient id="kali-ember" x1="0" y1="0" x2="0" y2="1">
                <stop offset="52%" stop-color="#EDAE55" stop-opacity="0" />
                <stop offset="100%" stop-color="#EDAE55" stop-opacity="0.13" />
              </linearGradient>
            </defs>
            <image
              href="img/adya-mahakali.jpg"
              clip-path="url(#kali-trikona)"
              x="0"
              y="0"
              width="280"
              height="244"
              preserveAspectRatio="xMidYMin slice"
            />
            <g clip-path="url(#kali-trikona)">
              <rect x="0" y="0" width="280" height="244" fill="url(#kali-ember)" />
              <rect x="0" y="0" width="280" height="244" fill="url(#kali-wash)" />
            </g>
            <polygon
              points="140,241 2,3 278,3"
              fill="none"
              stroke="url(#kali-gold)"
              stroke-width="2.6"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <h1 class="splash__word">MANTRINI</h1>
        <p class="splash__tagline">A respectful, offline japa companion.</p>

        <div class="splash__dedication">
          <p class="splash__dedication-label">Dedicated to</p>
          <p class="splash__dedication-name">{DEDICATION[0]}</p>
          <p class="splash__dedication-and">and</p>
          <p class="splash__dedication-sub">{DEDICATION[1]}</p>
        </div>
      </div>

      <div class="splash__foot">
        {canDismiss ? (
          <button type="button" class="splash__continue" onClick={onDismiss}>
            Tap to begin
          </button>
        ) : (
          <span class="splash__waiting" aria-live="polite">
            Opening the altar…
          </span>
        )}
      </div>
    </div>
  );
}
