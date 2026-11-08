import { deityById } from '../data/deities';
import { CHANTS_PER_MALA } from '../data/types';
import { longDate, groupDigits, malaWord } from '../lib/format';
import type { AppState, View } from '../state/store';
import { store } from '../state/store';
import { NavPill } from '../components/ui';
import { InstallHint } from '../components/InstallHint';

function todayWords(today: number): string {
  if (today <= 0) return `no mala yet · ${CHANTS_PER_MALA} to begin`;
  const malas = Math.floor(today / CHANTS_PER_MALA);
  const cycle = today % CHANTS_PER_MALA;
  if (cycle === 0) return `${malas} ${malaWord(malas)} complete`;
  return `${malas > 0 ? `${malas} ${malaWord(malas)} · ` : 'no mala yet · '}${CHANTS_PER_MALA - cycle} to the next`;
}

/**
 * TODAY — arriving, not a dashboard.
 *
 * The first thing the app shows when opened: where the practice stands today,
 * the altar it was last left at, and one way back in.
 */
export function TodayScreen({ state, onGo }: { state: AppState; onGo: (view: View) => void }) {
  const deity = deityById(state.deityId);
  const today = state.stats.todayTotal;
  const lifetime = state.stats.lifetimeTotal;
  const malas = state.stats.completedMalas;
  const cycle = today % CHANTS_PER_MALA;
  const firstRun = lifetime === 0 && state.stats.recent.length === 0;

  const begin = () => {
    if (firstRun) {
      onGo('altar');
      return;
    }
    void store.start();
  };

  return (
    <section class="view today on" aria-label="Today">
      <div class="today__head">
        <NavPill view={state.view} onGo={onGo} />
        <div class="today__date">{longDate()}</div>
        <h1 class="page-head today__title">
          The lamp is <em>lit</em>.
        </h1>
      </div>

      <button
        type="button"
        class="today__photo"
        onClick={begin}
        aria-label={firstRun ? 'Choose a deity to begin' : `Begin japa with ${deity.displayName}`}
      >
        <img src={deity.image} alt="" />
        <span class="today__photo-fade" />
      </button>

      <div class="today__body">
        <InstallHint />
        <div class="today__count">
          <div class="today__big">{groupDigits(today)}</div>
          <div class="today__words">
            <b>chants today</b>
            <span>{todayWords(today)}</span>
          </div>
        </div>

        <button type="button" class="today__resume" onClick={begin}>
          <span class="today__resume-left">
            <span class="today__resume-kicker">
              Continue with <b>{deity.displayName}</b>
            </span>
            <span class="today__resume-invocation">{deity.invocation}</span>
          </span>
          <span class="today__resume-frac">
            {cycle} / {CHANTS_PER_MALA}
          </span>
        </button>

        <button type="button" class="today__ledger" onClick={() => onGo('ledger')}>
          <span>The ledger</span>
          <em>
            {malas} {malaWord(malas)} · {groupDigits(lifetime)} chants
          </em>
        </button>
      </div>

      <div class="today__foot">
        <button type="button" class="pill" onClick={begin}>
          {firstRun ? 'Choose a path' : 'Begin japa'}
        </button>
      </div>
    </section>
  );
}
