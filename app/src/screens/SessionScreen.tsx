import { useEffect, useRef, useState } from 'preact/hooks';
import { deityById } from '../data/deities';
import { CHANTS_PER_MALA, MODE_LABEL } from '../data/types';
import { clock } from '../lib/format';
import type { AppState } from '../state/store';
import { store } from '../state/store';
import { targetCountFor } from '../state/session';
import { isAppleMobile } from '../lib/storage';
import { MalaSeam } from '../components/MalaSeam';

/**
 * SESSION â€” the counting surface.
 *
 * The product. A full-bleed darshan, the mala seam riding the edge of the
 * photograph, the mantra, the count, and one thumb-sized action.
 *
 * Deliberately has no navigation: leaving mid-session now requires the explicit
 * Finish control, which is the exit guard the old build was missing.
 */
export function SessionScreen({ state }: { state: AppState }) {
  const live = state.live;
  const deity = deityById(live?.deityId ?? state.deityId);
  const completed = live ? store.completed() : 0;
  const elapsed = live ? store.elapsedSeconds() : 0;
  const remaining = live ? store.remaining() : 0;
  const running = live?.runningSince !== null;
  const mode = live?.config.mode ?? state.config.mode;

  // A short pop on every count, so the number acknowledges the thumb.
  const [pop, setPop] = useState(false);
  const previous = useRef(completed);
  useEffect(() => {
    if (completed > previous.current) {
      setPop(true);
      const id = setTimeout(() => setPop(false), 240);
      previous.current = completed;
      return () => clearTimeout(id);
    }
    previous.current = completed;
    return undefined;
  }, [completed]);

  const meta =
    mode === 'timed'
      ? `${clock(elapsed)} elapsed Â· ${clock(Math.ceil(remaining / 1000))} left`
      : `${clock(elapsed)} elapsed Â· ${MODE_LABEL[mode]}`;

  const target = live
    ? live.config.mode === 'timed'
      ? 0
      : targetCountFor(live.config)
    : CHANTS_PER_MALA;

  return (
    <section class="view session on" aria-label="Japa session">
      <div class="session__photo-wrap">
        <div class="session__photo-clip">
          <img src={deity.image} alt="" />
          <span class="session__glow" />
          <span class="session__scrim-l" />
          <span class="session__scrim-r" />
          <span class="session__scrim-b" />
        </div>
        <MalaSeam completed={completed} />
      </div>

      <p class="session__altar" aria-hidden="true">
        {deity.displayName}
      </p>
      <button type="button" class="session__finish" onClick={() => void store.finishEarly()}>
        Finish
      </button>

      <div class="session__low">
        <p class="session__mantra deva">{deity.mantra}</p>

        <div class="session__count" aria-live="polite" aria-atomic="true">
          <span class={`session__num${pop ? ' pop' : ''}`}>{completed}</span>
          {target > 0 ? <span class="session__of">of {target}</span> : null}
        </div>
        <p class="session__meta">{meta}</p>

        <div class="session__controls">
          <button type="button" class="ctl" onClick={() => (running ? store.pause() : void store.resume())}>
            {running ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            class="ctl"
            onClick={() => void store.undo()}
            disabled={completed <= 0}
            style={completed <= 0 ? { opacity: 0.55 } : undefined}
          >
            Undo last
          </button>
        </div>

        {mode === 'manual' ? (
          <button type="button" class="pill session__pill" onClick={() => void store.count()}>
            Count chant
          </button>
        ) : mode === 'audio' ? (
          <button
            type="button"
            class={`pill session__pill${state.audioPlaying ? ' is-muted' : ''}`}
            onClick={() => void store.playSingle()}
          >
            {state.audioPlaying ? 'Chantingâ€¦' : 'Play chant'}
          </button>
        ) : (
          <div class="session__status" role="status">
            <span class={`session__pulse${state.audioPlaying ? ' on' : ''}`} aria-hidden="true" />
            {state.audioPlaying ? 'The chant is playing' : 'The chant is paused'}
          </div>
        )}

        {/*
          iOS mutes <audio> with the Ring/Silent switch, and no web API can see
          that switch or unmute around it. A devotee with the phone on silent
          gets silence and no explanation, which reads as a broken app. Say the
          one thing that can actually fix it.
        */}
        {mode !== 'manual' && isAppleMobile() ? (
          <p class="session__sound-hint">No sound? Check the Ring/Silent switch on the side of the phone.</p>
        ) : null}
      </div>
    </section>
  );
}
