import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import type { View } from '../state/store';

const NAV_ITEMS: ReadonlyArray<{ view: View; label: string }> = [
  { view: 'today', label: 'Today' },
  { view: 'altar', label: 'Altar' },
  { view: 'ledger', label: 'Ledger' },
];

/** The only chrome in the app: three words in a floating pill. */
export function NavPill({
  view,
  onGo,
  variant = 'default',
}: {
  view: View;
  onGo: (view: View) => void;
  variant?: 'default' | 'session';
}) {
  return (
    <nav class={`navpill${variant === 'session' ? ' navpill--session' : ''}`} aria-label="Sections">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.view}
          type="button"
          class={`navpill__btn${view === item.view ? ' on' : ''}`}
          aria-current={view === item.view ? 'page' : undefined}
          onClick={() => onGo(item.view)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

/**
 * A bottom sheet. Used for backup/restore and for destructive confirmation, so
 * that no irreversible action happens on a single unlabelled tap.
 */
export function Sheet({
  title,
  children,
  onDismiss,
  labelledBy = 'sheet-title',
}: {
  title: string;
  children: ComponentChildren;
  onDismiss: () => void;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKey);
    ref.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div class="sheet-scrim" role="presentation" onClick={onDismiss}>
      <div
        class="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        ref={ref}
        onClick={(event: JSX.TargetedMouseEvent<HTMLDivElement>) => event.stopPropagation()}
      >
        <h2 id={labelledBy}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div class="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}
