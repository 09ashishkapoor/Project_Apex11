# MANTRINI · design brief + six direction candidates

Inputs: `docs/ux-audit.md`, the existing theme (`lib/theme/app_theme.dart`), the four bundled
deity photographs, and two reference boards I captured and looked at
(`design-demos/refs/ref-headspace.png`, `ref-endel.png`).

Wheel seed for the style draw: `S = 47`.
App section, 12 styles → `47 % 12 + 1 = 12` → **编辑式阅读 Editorial Reader**.
East section, 12 styles → `47 % 12 + 1 = 12` → **japan-magazine-dense 日本杂志密集排版**.

---

## Phase 2 · What I understand the job to be

**Audience** — one person. A devotee of Maa Adya Mahakali who sits at a home altar, holds
the phone in one hand, and counts a mantra 108 times. Not a community, not a leaderboard,
not a wellness brand. The app is an instrument and a record, and it is offline on purpose.

**Scene** — dim room, early morning or late night, 10–45 minutes, one hand free, attention
mostly inward. Sight is intermittent. The screen must be legible at a glance and quiet
enough to ignore.

**Unspoken expectation** — *"don't make me feel like I'm using an app."* A mala is a
physical object that has been counted for centuries; the phone is a substitute for the
beads, and every piece of interface chrome that reminds the user they are holding a phone
is a small failure. The best compliment this app can get is that it disappears.

**Emotional register** — reverence without solemnity; warmth without cheerfulness. No
streaks, no confetti, no badges, no "Great job!". Completion should feel like a quiet
bowing, not a high score.

**Constraints** — Flutter, Android-first, offline, four modes must all remain reachable.
Keep the dedication. Keep the maroon-gold devotional temperature somewhere. The mantra in
Devanagari is the single most important piece of type in the product.

---

## Phase 3 · Spec (shared input to all three directions)

**Format** — Android phone, 412 × 892 dp, shown inside `android_frame.jsx`. Five screens
per direction, every one interactive: **Today · Altar · Session · Blessing · Ledger**.

**Screens and required content**

1. **Today** (new — the answer to "nothing on open")
   date · today's chant count + malas · the last deity used, with a one-tap resume ·
   primary action "Begin japa" · a way to the ledger.
2. **Altar** (replaces the thin "choose deity" gallery)
   the four deities, each with its real name, real Devanagari mantra and real invocation
   line · a mode chooser in plain language · a target/mala control · start.
3. **Session** (the product)
   current count, always glanceable · position in the 108-bead mala · the mantra ·
   elapsed · one large thumb-reachable primary action · pause · an undo · finish.
4. **Blessing** (replaces the completion `AlertDialog`)
   the count and malas just completed · a line of gratitude · back to Today, or another mala.
5. **Ledger** (replaces "Sadhana Tracker")
   today · lifetime · malas · a seven-day strip · per-deity totals with progress to the
   next mala · recent sessions · backup/restore tucked away, not in the main reading path.

**Mode names, plain language** (all four must stay)
- *Tap each mantra* — thumb counting, audio optional.
- *Chant with audio* — audio plays once per count.
- *Sit for a set time* — timer, chant loops.
- *Auto-count malas* — the chant loops and malas count themselves.

**Real content (use verbatim, no lorem)**

| Deity | Mantra | Invocation | Image |
|---|---|---|---|
| Adya Mahakali | ॐ आद्यायै नमः | At the lotus feet of the primordial Mother. | `assets/maha1.jpg` |
| Batuk Bhairav | ॐ बटुक भैरवाय नमः | Guardian of swift grace and fearless protection. | `assets/batuk1.jpg` |
| Swarnaakarshana Bhairav | ॐ श्री स्वर्णाकर्षण भैरवाय नमः | For radiance, dignified prosperity, and clear intent. | `assets/swarna.jpg` |
| Skanda Bhairav | ॐ सर्वान्भवाय नमः | For disciplined courage and focused tapas. | `assets/skanda.jpg` |

Sample session state for prototypes: **Adya Mahakali · 47 of 108 · 9:12 elapsed · manual**.
Sample ledger state: today 47; lifetime 4,212; 39 malas;
week `[21, 108, 0, 54, 108, 47, 0]`;
per-deity 2,180 / 1,296 / 528 / 208;
recent — 108 Manual 9m41s today; 54 Timed 5m00s yesterday; 108 Audio 11m12s Nov 5; 27 Manual 3m08s Nov 4.

**Dedication line (must appear)** — *GuruShreshta Maa Adya Mahakali · My Guru Shri Praveen RadhaKrishnan*

**Hard floors** — body ≥ 14px, labels ≥ 12px, body contrast ≥ 4.5:1, tap targets ≥ 48dp,
no gamification, no fake data beyond the sample state above, no emoji icons.

---

## Phase 3.5 · Materials

T0 — the four real deity photographs are the only required imagery and they are already in
the repo (`design-demos/assets/`, 560px wide, downscaled). Everything else must be
programmatic: SVG bead rings, hairline rules, CSS gradients, real Devanagari type. No stock
photography, no decorative flowers, no AI-generated deities.

---

## Phase 4 · Six candidates

### 1 · ☐ "The Mala" — instrument
**Logic** 最佳设计师 · **Teenage Engineering** (Jesper Kouthoofd / OP-1, EP-133). A mala is
already a precision counting instrument; make the software one too.
**Borrowed rules** near-black field with exactly one signal accent reserved for "current
position"; tabular/dot-matrix numerals for the count; key-press depth via inset shadow on
tap; small tracked-out uppercase print labels; a thin chronograph strip of sub-readouts.
**Lead material** programmatic — a 108-tick SVG ring plus dot-matrix numerals.
**Skeleton** ring-centric: 108 beads form the frame, count sits at its centre, one full-width
key at the bottom, thin readout strip between.
**Boldness** the ring physically fills bead-by-bead and the 108th bead lands the accent.
**form from content** only japa has exactly 108 beads; the ring is not a progress bar, it *is* the mala.

### 2 · ☐ "The Lamp" — the room
**Logic** 现实参照 ×2, both seen. **Headspace** (Apple Design Award 2023, Social Impact —
verified [apple.com newsroom](https://www.apple.com/newsroom/2023/06/apple-announces-winners-of-the-2023-apple-design-awards/)):
warm saturated field, two-tone headline where one word carries the accent, big flat colour
tiles as choosers, generous padding, bottom-anchored pill action.
**Endel** ([endel.io](https://endel.io/)): pure black canvas, **no cards at all**, status
carried by a living line-art graphic and one circular glyph.
**Borrowed rules** full-bleed photograph + warm scrim instead of panels; one accent drawn
from the photograph itself; text sits directly on the image, no boxes.
**Lead material** the real deity photographs — content, not decoration.
**Skeleton** image-centric: portrait fills 58%, the bottom 42% is a warm dark zone holding
the mantra, count and the tap surface; mala progress is an arc of 108 dots tracing the
photo edge.
**Boldness** on the 108th bead the whole scrim brightens as if a lamp were raised.
**form from content** the deity is not a thumbnail in a card — you are chanting *to* someone.

### 3 · ☐ "The Ledger" — the record
**Logic** 秒数轮盘 · app **#12 Editorial Reader** + east **#12 japan-magazine-dense** +
Kenya Hara's 空 (emptiness) for the air around the block.
**Borrowed rules** one reading column, hairline rules instead of cards, oversized display
serif for numerals, dense small-caps label rows for the ledger (magazine density), and a
large amount of unclaimed margin (Hara).
**Lead material** typography — serif + Devanagari + hairlines.
**Skeleton** type-centric: a light paper page. Session is mantra, thin ring, giant thin
numeral, tap anywhere below. Ledger is a printed sadhana page, not a stack of cards.
**Boldness** the ledger reads as one typeset document — rules and folios, no component boxes.
**form from content** japa is a counted record kept daily; the app is the ledger page.

### Alternates (thumbnails only)
### 4 · ☐ "The Still Point" — 最佳设计师 · Kenya Hara, 空
Near-white, almost nothing: hairline ring, one Devanagari line, one number. Everything is
margin. Risk: reads as a meditation timer, loses the deity entirely.

### 5 · ☐ "The Almanac" — 秒数轮盘 · east #12 japan-magazine-dense, pushed harder
Dense typographic grid: 108 beads as a 12×9 typeset matrix, marginalia, tiny folios.
Genuinely different structure, but density fights the dim-room use case.

### 6 · ☐ "The Talisman" — 现实参照 · (Not Boring) Habits, ADA 2022
Warm velvet field, thick 3D key with a real bottom edge, playful physicality. Excellent
craft, wrong temperature — japa is reverence, not play.

**Pick for full builds:** 1, 2, 3 — different temperatures (precise / warm / quiet), different
skeletons (ring / image / type), different lead materials (programmatic / photograph /
typography). 4–6 stay as thumbnails.
