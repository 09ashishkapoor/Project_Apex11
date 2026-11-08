import { CHANTS_PER_MALA } from '../data/types';

/**
 * The blessing ring: a full circle of 108 beads around the number just
 * completed. When a whole mala closed, the ring is full and gold; when the
 * devotee finished early, only the beads they actually reached are lit.
 *
 * When `offering` is set, each bead is given a target offset toward a point
 * above the ring and a staggered delay, so the mala unthreads upward into her
 * image. The travel is computed here in pixels because CSS cannot know where a
 * bead sits relative to the centre of its own ring.
 */
const RING_PX = 176;

export function BlessingRing({ completed, full }: { completed: number; full: boolean }) {
  const reached = completed % CHANTS_PER_MALA || (full ? CHANTS_PER_MALA : 0);
  const dots = [];

  for (let i = 0; i < CHANTS_PER_MALA; i += 1) {
    const angle = (i / CHANTS_PER_MALA) * Math.PI * 2 - Math.PI / 2;
    const x = 0.5 + Math.cos(angle) * 0.477273;
    const y = 0.5 + Math.sin(angle) * 0.477273;
    const done = !full && i < reached;

    // Travel to the focus point 240 px above the ring's centre.
    const fx = ((0.5 - x) * RING_PX).toFixed(2);
    const fy = (-64 - y * RING_PX).toFixed(2);
    // Unthread in order, over roughly a third of a second.
    const delay = Math.round((i / CHANTS_PER_MALA) * 300);

    dots.push(
      <i
        key={i}
        class={`bdot${done ? ' done' : ''}`}
        style={`left:${(x * 100).toFixed(3)}%;top:${(y * 100).toFixed(3)}%;--fx:${fx}px;--fy:${fy}px;--od:${delay}ms`}
      />,
    );
  }

  return (
    <div
      class={`blessing__ringwrap ${full ? 'blessing__ring blessing__ring--full' : 'blessing__ring blessing__ring--part'}`}
      aria-hidden="true"
    >
      <div class="blessing__bloom" />
      {dots}
      <div class="blessing__core">
        <div class="blessing__num">{completed}</div>
        <div class="blessing__unit">chants</div>
      </div>
    </div>
  );
}
