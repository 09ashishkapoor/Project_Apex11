import { useMemo, useState } from 'preact/hooks';
import { deityById } from '../data/deities';
import { CHANTS_PER_MALA } from '../data/types';
import {
  WEEKDAY_INITIALS,
  durationShort,
  groupDigits,
  longDate,
  malaWord,
  mondayFirstIndex,
  relativeDay,
} from '../lib/format';
import type { AppState, View } from '../state/store';
import { store } from '../state/store';
import { NavPill, Sheet } from '../components/ui';
import { InstallHint } from '../components/InstallHint';

type Dialog = 'export' | 'import' | 'reset' | null;

/**
 * LEDGER — the record, no cards.
 *
 * Replaces "Sadhana Tracker" and its stack of bordered panels. Reads as one
 * column of numbers and hairline rules. Destructive actions live at the very
 * bottom behind a confirmation, not on an unlabelled refresh glyph inside each
 * deity row (audit defect B5).
 */
export function LedgerScreen({ state, onGo }: { state: AppState; onGo: (view: View) => void }) {
  const { stats } = state;
  const [dialog, setDialog] = useState<Dialog>(null);
  const [exported, setExported] = useState('');
  const [importText, setImportText] = useState('');
  const [busy, setBusy] = useState(false);

  const deity = deityById(state.deityId);
  const week = stats.week;
  // Scale to a full mala so the chart reads "how close to one mala was each
  // day", but never below a day's worth of context or a fresh ledger looks
  // broken with invisible two-pixel bars.
  const scale = Math.max(36, ...week);

  const days = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const offset = 6 - i; // i = 6 is today
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset);
      return {
        initial: WEEKDAY_INITIALS[mondayFirstIndex(date)] ?? '',
        isToday: offset === 0,
        value: week[i] ?? 0,
      };
    });
  }, [week]);

  const openExport = async () => {
    setBusy(true);
    try {
      setExported(await store.exportBackup());
      setDialog('export');
    } finally {
      setBusy(false);
    }
  };

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exported);
      setDialog(null);
      store.notify('Backup copied.');
    } catch {
      store.notify('The browser blocked the clipboard — select the text and copy it.');
    }
  };

  const runImport = async (mode: 'merge' | 'replace') => {
    setBusy(true);
    try {
      const count = await store.importBackup(importText, mode);
      setDialog(null);
      setImportText('');
      store.notify(`Restored ${count} ${count === 1 ? 'sitting' : 'sittings'}.`);
    } catch (error) {
      store.notify(
        `Could not restore: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section class="view ledger on" aria-label="Ledger">
      <div class="ledger__hero">
        <div class="ledger__hero-photo">
          <img src={deity.image} alt="" />
          <span class="ledger__scrim" />
        </div>
        <div class="ledger__hero-inner">
          <NavPill view={state.view} onGo={onGo} />
          <h1 class="page-head" style={{ marginTop: '12px' }}>
            The <em>ledger</em>
          </h1>
          <div class="ledger__date">{longDate()}</div>
          <div class="ledger__stats">
            <div class="ledger__stat">
              <b>{groupDigits(stats.todayTotal)}</b>
              <span>today</span>
            </div>
            <div class="ledger__stat">
              <b>{groupDigits(stats.lifetimeTotal)}</b>
              <span>lifetime</span>
            </div>
            <div class="ledger__stat">
              <b>{groupDigits(stats.completedMalas)}</b>
              <span>malas</span>
            </div>
          </div>
        </div>
      </div>

      <div class="ledger__body">
        <section class="week" aria-label="This week">
          <div class="week__head">
            <b>THIS WEEK</b>
            <i>chants a day · {CHANTS_PER_MALA} is one mala</i>
          </div>
          <div class="week__bars">
            {days.map((day, index) => (
              <div
                key={index}
                class={`week__col${day.isToday ? ' week__col--today' : ''}`}
                aria-label={`${day.initial}: ${day.value} chants`}
              >
                <span class="week__value">{day.value}</span>
                <span
                  class="week__bar"
                  style={{ height: `${Math.max(3, Math.round((day.value / scale) * 100))}%` }}
                />
              </div>
            ))}
          </div>
          <div class="week__days" aria-hidden="true">
            {days.map((day, index) => (
              <span key={index} class={`week__day${day.isToday ? ' week__day--today' : ''}`}>
                {day.initial}
              </span>
            ))}
          </div>
        </section>

        <section class="deity-list" aria-label="By deity">
          <div class="section-label">BY DEITY</div>
          {stats.perDeity.map((row) => (
            <div class="deity-row" key={row.deity.id}>
              <div class="deity-row__top">
                <span class="deity-row__name">{row.deity.displayName}</span>
                <span class="deity-row__total">{groupDigits(row.totalCount)}</span>
              </div>
              <div class="deity-row__track">
                <span
                  class="deity-row__fill"
                  style={{ width: `${Math.round((row.cycleCount / CHANTS_PER_MALA) * 100)}%` }}
                />
              </div>
              <div class="deity-row__foot">
                <span>
                  {row.completedMalas} {malaWord(row.completedMalas)}
                </span>
                <span>{row.toNextMala} to the next mala</span>
              </div>
            </div>
          ))}
        </section>

        <section class="recent" aria-label="Recent sittings">
          <div class="section-label">RECENT SITTINGS</div>
          {stats.recent.length === 0 ? (
            <p class="recent__empty">
              No sittings yet. Finish a session and it will be kept here — on this device only.
            </p>
          ) : (
            stats.recent.map((row) => (
              <div class="recent__row" key={row.id}>
                <span class="recent__left">
                  {row.completedCount} <i>· {row.deity.displayName}</i>
                </span>
                <span class="recent__right">
                  <b>{durationShort(row.durationSeconds)}</b> ·{' '}
                  {relativeDay(row.endedAt ?? row.startedAt)}
                </span>
              </div>
            ))
          )}
        </section>

        <div class="ledger__colophon">
          {/* The same closing words the Parampara site uses, so the app reads as
              part of the site it is linked from. */}
          <p class="ledger__blessing">Om Shri Gurubhyo Namaha | Jai Khyapa Parampara</p>
          <p class="ledger__message">May every Japa bring you closer to Ma Adya Mahakali.</p>
          {/* The Ledger is where someone goes looking for install, so this card
              is offered regardless of whether a sitting has been completed. */}
          <InstallHint lifetimeChants={state.stats.lifetimeTotal} requireSitting={false} />
          {state.persisted !== 'granted' ? (
            <p class="storage-note">
              This browser has not promised to keep the ledger. <b>Take a backup now and then</b> —
              the button below copies the whole record as text you can keep anywhere.
            </p>
          ) : null}
          <div class="ledger__tools">
            <button type="button" class="ledger__tool" onClick={() => void openExport()} disabled={busy}>
              Backup
            </button>
            <button type="button" class="ledger__tool" onClick={() => setDialog('import')}>
              Restore
            </button>
            <button type="button" class="ledger__tool ledger__tool--danger" onClick={() => setDialog('reset')}>
              Clear the ledger
            </button>
          </div>
        </div>
      </div>

      {dialog === 'export' ? (
        <Sheet title="Backup" onDismiss={() => setDialog(null)}>
          <p>
            Copy this and keep it somewhere safe. It restores into this app, and it is the same format
            the Android app exports.
          </p>
          <textarea readOnly value={exported} aria-label="Backup JSON" onFocus={(e) => (e.target as HTMLTextAreaElement).select()} />
          <div class="sheet__actions">
            <button type="button" class="btn btn--ghost" onClick={() => setDialog(null)}>
              Close
            </button>
            <button type="button" class="btn btn--primary" onClick={() => void copyExport()}>
              Copy
            </button>
          </div>
        </Sheet>
      ) : null}

      {dialog === 'import' ? (
        <Sheet title="Restore" onDismiss={() => setDialog(null)}>
          <p>Paste a backup. Merging keeps what is here; replacing clears the ledger first.</p>
          <textarea
            value={importText}
            placeholder="Paste backup JSON…"
            aria-label="Backup JSON to restore"
            onInput={(e) => setImportText((e.target as HTMLTextAreaElement).value)}
          />
          <div class="sheet__actions">
            <button type="button" class="btn btn--ghost" onClick={() => setDialog(null)}>
              Cancel
            </button>
            <button
              type="button"
              class="btn btn--danger"
              disabled={busy || importText.trim().length === 0}
              onClick={() => void runImport('replace')}
            >
              Replace
            </button>
            <button
              type="button"
              class="btn btn--primary"
              disabled={busy || importText.trim().length === 0}
              onClick={() => void runImport('merge')}
            >
              Merge
            </button>
          </div>
        </Sheet>
      ) : null}

      {dialog === 'reset' ? (
        <Sheet title="Clear all history?" onDismiss={() => setDialog(null)}>
          <p>
            This deletes every recorded session for every deity. It cannot be undone. If you have not
            taken a backup, do that first.
          </p>
          <div class="sheet__actions">
            <button type="button" class="btn btn--ghost" onClick={() => setDialog(null)}>
              Keep my history
            </button>
            <button
              type="button"
              class="btn btn--danger"
              onClick={() => {
                void store.resetAll();
                setDialog(null);
              }}
            >
              Delete everything
            </button>
          </div>
        </Sheet>
      ) : null}
    </section>
  );
}
