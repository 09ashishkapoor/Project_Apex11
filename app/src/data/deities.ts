import type { Deity, SessionMode } from './types';

/**
 * The four bundled deity/mantra paths. Text is used verbatim from the app's
 * existing content — no invented mantras or invocations.
 *
 * `chantMs` is the measured length of each bundled clip and is the counting
 * cadence used when the audio cannot report its own duration. Keep it in step
 * with `public/audio/`; `tools/reencode-audio.py` prints the values.
 */
export const DEITIES: readonly Deity[] = [
  {
    id: 'adya-mahakaali',
    mantraId: 'adya-mahakaali-japa',
    displayName: 'Adya Mahakali',
    mantra: 'ॐ आद्यायै नमः',
    invocation: 'At the lotus feet of the primordial Mother.',
    image: 'img/adya-mahakali.jpg',
    audio: 'audio/adya-mahakali.mp3',
    chantMs: 2470,
    plate: '#6E1A22',
    plateY: '16%',
    plateBrightness: 0.97,
    defaultTargetCount: 108,
  },
  {
    id: 'batuk-bhairav',
    mantraId: 'batuk-bhairav-japa',
    displayName: 'Batuk Bhairav',
    mantra: 'ॐ बटुक भैरवाय नमः',
    invocation: 'Guardian of swift grace and fearless protection.',
    image: 'img/batuk-bhairav.jpg',
    audio: 'audio/batuk-bhairav.mp3',
    chantMs: 1059,
    plate: '#1D2E44',
    plateY: '9%',
    plateBrightness: 0.92,
    defaultTargetCount: 108,
  },
  {
    id: 'swarnaakarshana-bhairav',
    mantraId: 'swarnaakarshana-bhairav-japa',
    displayName: 'Swarnaakarshana Bhairav',
    mantra: 'ॐ श्री स्वर्णाकर्षण भैरवाय नमः',
    invocation: 'For radiance, dignified prosperity, and clear intent.',
    image: 'img/swarnaakarshana-bhairav.jpg',
    audio: 'audio/swarnaakarshana-bhairav.mp3',
    chantMs: 3697,
    plate: '#5A3E12',
    plateY: '28%',
    plateBrightness: 0.9,
    defaultTargetCount: 108,
  },
  {
    id: 'skanda-bhairav',
    mantraId: 'skanda-bhairav-japa',
    displayName: 'Skanda Bhairav',
    mantra: 'ॐ सर्वान्भवाय नमः',
    invocation: 'For disciplined courage and focused tapas.',
    image: 'img/skanda-bhairav.jpg',
    audio: 'audio/skanda-bhairav.mp3',
    chantMs: 1921,
    plate: '#3A2A18',
    plateY: '12%',
    plateBrightness: 0.98,
    defaultTargetCount: 108,
  },
] as const;

export const DEITIES_BY_ID: ReadonlyMap<string, Deity> = new Map(
  DEITIES.map((deity) => [deity.id, deity]),
);

export const FALLBACK_DEITY: Deity = DEITIES[0] as Deity;

export function deityById(id: string): Deity {
  return DEITIES_BY_ID.get(id) ?? FALLBACK_DEITY;
}

export interface ModeOption {
  mode: SessionMode;
  /** Two to six characters, used on the mode strip. */
  short: string;
  /** Plain-language name. */
  full: string;
  /** One line explaining what it does. */
  description: string;
}

/**
 * Mode names describe intent, not mechanism. The original app labelled these
 * "Manual / Audio-guided / Timed auto / Count auto", which told the user
 * nothing about what would happen when they pressed start.
 */
export const MODE_OPTIONS: readonly ModeOption[] = [
  {
    mode: 'manual',
    short: 'Tap',
    full: 'Tap each mantra',
    description: 'Tap each mantra — count with your thumb; the chant stays silent.',
  },
  {
    mode: 'audio',
    short: 'Audio',
    full: 'Chant with audio',
    description: 'Chant with audio — the mantra sounds once for every count.',
  },
  {
    mode: 'timed',
    short: 'Timer',
    full: 'Sit for a set time',
    description: 'Sit for a set time — a timer keeps the sitting; the chant loops.',
  },
  {
    mode: 'count',
    short: 'Auto',
    full: 'Auto-count malas',
    description: 'Auto-count malas — the chant loops and the malas count themselves.',
  },
] as const;

export function modeOption(mode: SessionMode): ModeOption {
  return MODE_OPTIONS.find((option) => option.mode === mode) ?? MODE_OPTIONS[0]!;
}

export const DEDICATION = [
  'GuruShreshta Maa Adya Mahakali',
  'My Guru Shri Praveen RadhaKrishnan',
] as const;
