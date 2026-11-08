import { render } from 'preact';
import './styles/fonts.css';
import './styles/base.css';
import './styles/screens.css';
import './styles/session-extra.css';
import './styles/notices.css';
import './styles/splash.css';
import './styles/offering.css';
import { App } from './app';
import { store } from './state/store';
import { ChantAudio } from './lib/audio';

/** True inside the Capacitor Android shell (assets are already local there). */
function isNativeShell(): boolean {
  const bridge = (window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(bridge?.isNativePlatform?.());
}

const audio = new ChantAudio();
store.attachAudio(audio);

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');

render(<App />, root);
void store.boot();

// Offline caching only matters for the browser build; the native shell serves
// from disk and a service worker there would just be a stale-cache hazard.
if (!isNativeShell() && 'serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
