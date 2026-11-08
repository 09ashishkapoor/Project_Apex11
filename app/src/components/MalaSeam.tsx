import { CHANTS_PER_MALA } from '../data/types';

/**
 * The mala seam: 108 beads riding the curved lower edge of the darshan
 * photograph. Lit beads are chants already offered; the bright bead is where
 * the thumb is now.
 *
 * Geometry is the approved prototype's: beads run across 96% of the width and
 * follow `463 + 216·t(1−t) − 9` in a 517-tall photograph, which is exactly the
 * curve the photo is clipped along. Expressed as fractions so it holds at any
 * photograph height.
 */
const PHOTO_H = 517;

function beadPosition(index: number, total: number): { x: number; y: number } {
  const t = total <= 1 ? 0 : index / (total - 1);
  const leftPx = 8 + 396 * t;
  const topPx = 463 + 216 * t * (1 - t) - 9;
  return { x: leftPx / 412, y: topPx / PHOTO_H };
}

export interface MalaSeamProps {
  completed: number;
}

export function MalaSeam({ completed }: MalaSeamProps) {
  const local = Math.min(CHANTS_PER_MALA, completed % CHANTS_PER_MALA || (completed > 0 ? CHANTS_PER_MALA : 0));
  const beads = [];
  for (let i = 0; i < CHANTS_PER_MALA; i += 1) {
    const { x, y } = beadPosition(i, CHANTS_PER_MALA);
    const isDone = i < local;
    const isCurrent = i === local - 1;
    beads.push(
      <i
        key={i}
        class={`bead${isDone ? ' done' : ''}${isCurrent ? ' cur' : ''}`}
        style={{ left: `${(x * 100).toFixed(3)}%`, top: `${(y * 100).toFixed(3)}%` }}
      />,
    );
  }
  return (
    <div class="mala-seam" aria-hidden="true">
      {beads}
    </div>
  );
}

/** The clip path that turns the photograph's lower edge into the bead arc. */
export function MalaSeamClip() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
      <defs>
        <clipPath id="mala-seam-clip" clipPathUnits="objectBoundingBox">
          <path d="M 0 0 L 1 0 L 1 0.895551 Q 0.5 1.104449 0 0.895551 Z" />
        </clipPath>
      </defs>
    </svg>
  );
}
