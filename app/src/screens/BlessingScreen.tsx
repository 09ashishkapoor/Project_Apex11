import { useState } from 'preact/hooks';
import { deityById } from '../data/deities';
import { CHANTS_PER_MALA, MODE_LABEL } from '../data/types';
import { BlessingRing } from '../components/BlessingRing';
import type { AppState } from '../state/store';
import { store } from '../state/store';

/**
 * BLESSING — the lamp is raised.
 *
 * Replaces the old completion AlertDialog, which listed
 * "Deity: … / Mode: … / Completed chants: …" like a receipt. This is the
 * emotional peak of the whole loop; it should feel like a bow, not a summary.
 */
export function BlessingScreen({ state }: { state: AppState }) {
  const blessing = state.blessing;
  const [offering, setOffering] = useState(false);
  if (!blessing) return null;

  const give = () => {
    if (offering) return;
    setOffering(true);
    store.beginOffer();
  };

  const deity = deityById(blessing.deityId);
  const full = !blessing.partial && blessing.malas > 0;
  const cycle = blessing.completed % CHANTS_PER_MALA;

  const line = full ? (
    <>
      One mala, <em>complete</em>.
    </>
  ) : blessing.partial ? (
    <>
      <em>{blessing.completed}</em> chants offered.
    </>
  ) : (
    <>
      The sitting is <em>complete</em>.
    </>
  );

  const detail = full
    ? `${MODE_LABEL[blessing.mode]} · ${blessing.malas} ${blessing.malas === 1 ? 'mala' : 'malas'}`
    : blessing.target > 0
      ? `${MODE_LABEL[blessing.mode]} · ${blessing.completed} of ${blessing.target}`
      : `${MODE_LABEL[blessing.mode]} · ${Math.round(blessing.durationSeconds / 60)} minutes`;

  return (
    <section
      class={`view blessing on${offering ? ' is-offering' : ''}`}
      aria-label="Session complete"
    >
      <div class="blessing__photo">
        <img src={deity.image} alt="" />
        <span class="blessing__fade" />
      </div>

      <div class="blessing__body">
        <BlessingRing completed={full ? CHANTS_PER_MALA : cycle} full={full} />

        <h1 class="blessing__line">{line}</h1>
        <p class="blessing__thanks">
          Gratitude to Maa Adya, GuruShreshta.
          <br />
          <span style={{ color: 'var(--cream-4)', fontSize: '12.5px' }}>{detail}</span>
        </p>

        <button
          type="button"
          class="blessing__second"
          onClick={() => store.anotherMala()}
          disabled={offering}
        >
          Begin another mala
        </button>

        {/* Ma Adya is the receiver of every offering: the sitting is not
            "rested", it is given. The beads themselves travel to her. */}
        <button
          type="button"
          class="pill blessing__rest"
          onClick={give}
          disabled={offering}
          aria-live="polite"
        >
          {offering ? 'Offering…' : 'Offer to Ma Adya'}
        </button>
      </div>
    </section>
  );
}
