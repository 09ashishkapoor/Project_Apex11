# MANTRINI · UX audit

Repo: `Project_Apex11` — Flutter, Android-first, offline Japa (mantra repetition) app.
Version audited: `main` @ 2156535 · `flutter analyze`: clean (0 issues) · 83 files, 14 Dart sources.

---

## What the app is

A user opens it at a home altar — one hand free, half-lit room, 10–45 minutes — and
counts a mantra 108 times (one mala). Four deity/mantra paths, four ways to count,
everything stored locally in Drift/SQLite. No account, no cloud, no ads.

That context sets the bar: **the counting surface is the product.** Everything else is
support. Today the counting surface is a 112px button at the bottom of a scrolling page.

---

## Blocking defects

| # | Severity | Where | What |
|---|---|---|---|
| B1 | **High** | `sadhana_session_screen.dart:482-504` | The mode selector is a `SegmentedButton` with **4** segments inside a horizontal `SingleChildScrollView`. On a 412dp phone it renders `Manual · Audio-guided · Timed auto` and clips `Count auto` entirely off-screen with no scroll hint. Verified against `docs/screenshots/screen-05.jpg`. One of four session modes is undiscoverable. |
| B2 | **High** | `main.dart:46`, `dedication_splash_screen.dart` | Every cold start is gated behind a **2.8 s** non-skippable dedication screen. For an app opened daily this is permanent friction. |
| B3 | **High** | `sadhana_session_screen.dart` `initState` | Sessions left `active` by a crash/kill are never reaped. `_buildStats` only counts `completed` rows, so orphans are invisible but accumulate in the DB forever. |
| B4 | **Medium** | `sadhana_session_screen.dart:329` | No feedback on tap. No haptic, no audio tick, no optical confirmation beyond a numeral changing. Japa is done with a thumb and a half-closed eye; sight-free confirmation matters. |
| B5 | **Medium** | `sadhana_tracker_screen.dart:218-222` | A bare `Icons.refresh_rounded` `IconButton` in each deity row **deletes that deity's entire history** after one dialog. Destructive action behind an unlabeled refresh glyph. |
| B6 | **Medium** | `sadhana_session_screen.dart` | No undo. A double-tap or mis-tap can only be corrected by resetting the session. |
| B7 | **Medium** | `sadhana_session_screen.dart:525` | No exit guard. Back during an active session silently cancels and discards it. |
| B8 | **Low** | `sadhana_session_screen.dart:414` | `showDialog` completion is a plain `AlertDialog` of `Text` rows — `Deity: … / Mode: … / Completed chants: …`. The emotional peak of the loop is rendered as a receipt. |
| B9 | **Low** | `sadhana_session_screen.dart:692-705` | A permanently `onPressed: null` `FilledButton` is used as a *status readout* ("Auto Chanting…"). Disabled-button styling as an indicator. |

---

## UX and information-architecture problems

1. **Four modes, jargon names.** "Manual / Audio-guided / Timed auto / Count auto" describe
   *mechanism*, not *intent*. A user thinks "I want to chant for five minutes", not
   "timed auto". No mode explains what it does; the only help text is `helperText` under a
   number field.
2. **The welcome screen is a brochure, not a door.** It ships install instructions
   ("use Install app or Add to Home Screen from your browser menu") to a user who already
   installed the APK, plus three paragraphs of boilerplate, before a 4/5-aspect hero image.
3. **Nothing on open.** There is no "today". Opening the app tells you nothing about your
   practice — you must navigate to the tracker to see whether you already sat today.
4. **Cards everywhere, hierarchy nowhere.** `AltarPanel` is applied to every region: image,
   metric, mantra, mode block, each stat. Nine bordered boxes on one screen means the eye
   finds no entry point.
5. **The linear progress bar is the wrong metaphor.** A mala is a *loop of 108 beads*. A
   linear 0→1 bar throws away the one structure the subject actually has: where you are in
   the mala, and how many malas deep you are.
6. **Deity selection is a 1.28:1-aspect single-column gallery.** `childAspectRatio: 0.78`
   means one and a bit cards per screen; comparing four deities costs a long scroll. The
   deity image is full-bleed behind the text, so the *text* fights the *content*.
7. **Metric labels are decorative.** "Practice Ledger", "Today at the altar" — literary
   where a plain "Today" would be faster to read. Meanwhile the numbers themselves have no
   comparison, no trend, no context.
8. **First-run vs. returning user are the same path.** A devotee's fifth open of the day is
   identical to their first: splash → welcome brochure → choose deity.

---

## Visual and accessibility problems

1. **Contrast.** `AppTheme.parchmentText` at `alpha: 0.72–0.76` for body and label text on
   `cardBurgundy #180A0F` lands around **3.2:1** — below the 4.5:1 body floor. Visible in
   `screen-12.jpg` (tracker subtitle and per-deity helper lines are barely legible).
2. **One typeface does everything.** `Cinzel` (an all-caps Roman inscriptional face) is used
   for `headlineMedium`, `headlineSmall`, `titleLarge`, *and* `metric`. Numerals and prose
   share one voice, so scale is the only hierarchy available.
3. **No text-scaling accommodation.** `fontSize` is hard-coded throughout; `metric: 42` and
   the 56px tracker numeral will overflow at 1.3× accessibility text scale.
4. **No semantics.** The count button, the mala progress and the tracker metrics carry no
   `Semantics` labels, so screen readers announce a stack of unlabelled numbers.
5. **Dark only.** No light theme. A morning practice happens in daylight.

---

## Keep

- **The dedication.** "GuruShreshta Maa Adya Mahakali · My Guru Shri Praveen RadhaKrishnan"
  is the reason the app exists. It should stay — as a quiet, permanent presence rather than
  a timed gate.
- **The maroon/gold devotional palette.** It is correct for the subject. Direction work
  should evolve it, not discard it.
- **The Devanagari mantra set in `NotoSansDevanagari`.** Already the best-looking thing in
  the app (`textTheme.mantra`, 23px / 1.55).
- **Everything local.** No network calls, no telemetry — keep it that way.
- **The four modes themselves.** The mechanics are right; only the presentation is wrong.

---

## Status after the rebuild

Everything above is fixed in `app/` (the Direction 02 rebuild). Where the fix
landed:

| Item | Where |
|---|---|
| B1 mode selector hid "Count auto" | `app/src/screens/AltarScreen.tsx` — four plain-language tiles: Tap / Audio / Timer / Auto |
| B2 2.8 s unskippable splash | `app/src/components/Splash.tsx` — branded opening that *is* the boot state, 1.15 s minimum, tap to skip, 4 s hard cap; keeps the dedication |
| B3 orphaned sessions | `app/src/data/repo.ts` → `reapOrphanedSessions()` on boot |
| B4 no tap feedback | `app/src/lib/haptics.ts` — light per count, medium per mala, heavy on completion |
| B5 destructive refresh icon | `app/src/screens/LedgerScreen.tsx` — "Clear history" in the colophon behind a confirm |
| B6 no undo | Session → "Undo last", with a loop-mode offset |
| B7 no exit guard | Session has no nav; `beforeunload` guard in `app/src/app.tsx` |
| B8 receipt-style completion | `app/src/screens/BlessingScreen.tsx` |
| B9 disabled button as readout | `session__status` strip for auto modes |
| Contrast floors | `tools/a11y.mjs` — 7 screen states, 0 failures |
| Week-chart DST bug (found during the rebuild, not in this audit) | `app/src/data/stats.ts` — local day boundaries |
| Manual mode ignored the mala stepper (found during the rebuild) | `app/src/state/session.ts` — `targetCountFor()` |

Verification commands and results are in `app/README.md`.

