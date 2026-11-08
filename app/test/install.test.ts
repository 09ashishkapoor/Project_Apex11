import { describe, expect, it } from 'vitest';
import {
  INSTALL_COOLDOWN_MS,
  shouldOfferInstall,
} from '../src/lib/install';

const NOW = 1_700_000_000_000;

function base(overrides: Partial<Parameters<typeof shouldOfferInstall>[0]> = {}) {
  return {
    installed: false,
    appleMobile: false,
    chromium: true,
    canPrompt: true,
    lifetimeChants: 108,
    dismissedAt: null,
    now: NOW,
    ...overrides,
  };
}

describe('shouldOfferInstall', () => {
  it('offers install once there is a sitting behind them', () => {
    expect(shouldOfferInstall(base())).toBe(true);
  });

  it('never appears on arrival, before any chant is recorded', () => {
    expect(shouldOfferInstall(base({ lifetimeChants: 0 }))).toBe(false);
  });

  it('stays away once the app is installed', () => {
    expect(shouldOfferInstall(base({ installed: true }))).toBe(false);
  });

  it('says nothing on a platform with nothing to offer and nothing to explain', () => {
    // Firefox and desktop Safari: no prompt, not an iPhone, not Chromium.
    expect(shouldOfferInstall(base({ canPrompt: false, chromium: false }))).toBe(false);
  });

  it('still points Chromium at its menu entry before the prompt has fired', () => {
    // Chrome only fires beforeinstallprompt after engagement history. Without
    // this the visitor sees no install control at all.
    expect(shouldOfferInstall(base({ canPrompt: false, chromium: true }))).toBe(true);
  });

  it('ignores the sitting requirement where the devotee went looking for it', () => {
    expect(shouldOfferInstall(base({ lifetimeChants: 0 }))).toBe(false);
    expect(shouldOfferInstall(base({ lifetimeChants: 0, requireSitting: false }))).toBe(true);
  });

  it('still honours "not now" in the Ledger', () => {
    expect(
      shouldOfferInstall(base({ lifetimeChants: 0, requireSitting: false, dismissedAt: NOW - 1000 })),
    ).toBe(false);
  });

  it('still explains the route on iOS, where no prompt exists', () => {
    expect(shouldOfferInstall(base({ canPrompt: false, appleMobile: true }))).toBe(true);
  });

  it('respects a recent "not now"', () => {
    expect(shouldOfferInstall(base({ dismissedAt: NOW - 1000 }))).toBe(false);
    expect(shouldOfferInstall(base({ dismissedAt: NOW - INSTALL_COOLDOWN_MS + 1000 }))).toBe(false);
  });

  it('asks again once the cooldown has passed', () => {
    expect(shouldOfferInstall(base({ dismissedAt: NOW - INSTALL_COOLDOWN_MS }))).toBe(true);
    expect(shouldOfferInstall(base({ dismissedAt: NOW - INSTALL_COOLDOWN_MS - 1 }))).toBe(true);
  });

  it('stays quiet if the clock jumped backwards', () => {
    // A device clock set back must not turn a dismissal into a nag.
    expect(shouldOfferInstall(base({ dismissedAt: NOW + 86_400_000 }))).toBe(false);
  });

  it('prefers the prompt over instructions when both are possible', () => {
    expect(shouldOfferInstall(base({ canPrompt: true, appleMobile: true }))).toBe(true);
  });
});
