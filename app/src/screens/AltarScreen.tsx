import { DEITIES, MODE_OPTIONS, modeOption } from '../data/deities';
import type { SessionMode } from '../data/types';
import type { AppState, View } from '../state/store';
import { store } from '../state/store';
import { NavPill } from '../components/ui';

/**
 * ALTAR — four paths, one lamp.
 *
 * Replaces the old "Choose Deity" grid. The photographs are full-bleed plates
 * that fade into their own colour; the mode chooser is four words with a
 * one-line explanation, because "Timed auto" told nobody anything.
 */
export function AltarScreen({ state, onGo }: { state: AppState; onGo: (view: View) => void }) {
  const { config, stats } = state;
  const isTimed = config.mode === 'timed';

  const stepLabel = isTimed
    ? `${config.timedMinutes} min`
    : `${config.malas} ${config.malas === 1 ? 'mala' : 'malas'}`;

  return (
    <section class="view altar on" aria-label="Altar">
      <NavPill view={state.view} onGo={onGo} />

      <div class="altar__head">
        <h1 class="page-head">
          The <em>altar</em>
        </h1>
        <div class="altar__stepper">
          <button
            type="button"
            class="stepper__btn"
            aria-label={isTimed ? 'Less time' : 'Fewer malas'}
            disabled={isTimed ? config.timedMinutes <= 5 : config.malas <= 1}
            onClick={() => store.stepTarget(-1)}
          >
            −
          </button>
          <span class="stepper__value">
            <b>{stepLabel.split(' ')[0]}</b> {stepLabel.split(' ').slice(1).join(' ')}
          </span>
          <button
            type="button"
            class="stepper__btn"
            aria-label={isTimed ? 'More time' : 'More malas'}
            disabled={isTimed ? config.timedMinutes >= 60 : config.malas >= 9}
            onClick={() => store.stepTarget(1)}
          >
            +
          </button>
        </div>
      </div>

      <div class="altar__plates" role="radiogroup" aria-label="Deity">
        {DEITIES.map((deity) => {
          const selected = deity.id === state.deityId;
          const total = stats.perDeity.find((row) => row.deity.id === deity.id)?.totalCount ?? 0;
          return (
            <button
              key={deity.id}
              type="button"
              role="radio"
              aria-checked={selected}
              class={`plate${selected ? ' on' : ''}`}
              style={`--pc:${deity.plate};--pb:${deity.plateBrightness}`}
              onClick={() => store.selectDeity(deity.id)}
            >
              <span class="plate__photo">
                <img
                  src={deity.image}
                  alt=""
                  style={{ objectPosition: `50% ${deity.plateY}` }}
                />
              </span>
              <span class="plate__colour" />
              <span class="plate__text">
                <span class="plate__name">{deity.displayName}</span>
                <span class="plate__mantra deva">{deity.mantra}</span>
                <span class="plate__invocation">{deity.invocation}</span>
              </span>
              <span class="plate__mark" />
              {total > 0 ? <span class="sr-only">{total} chants offered</span> : null}
            </button>
          );
        })}
      </div>

      <div class="altar__foot">
        <div class="modes" role="radiogroup" aria-label="How will you chant">
          {MODE_OPTIONS.map((option) => (
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={config.mode === option.mode}
              class={`mode-tile${config.mode === option.mode ? ' on' : ''}`}
              onClick={() => store.setMode(option.mode as SessionMode)}
            >
              {option.short}
            </button>
          ))}
        </div>
        <p class="mode-desc" aria-live="polite">
          {modeOption(config.mode).description}
        </p>
        <button type="button" class="pill" onClick={() => void store.start()} disabled={state.busy}>
          Begin japa
        </button>
      </div>
    </section>
  );
}
