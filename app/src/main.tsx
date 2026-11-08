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
import { watchInstallability } from './lib/install';

const audio = new ChantAudio();
store.attachAudio(audio);

// Before the first render: the browser can fire beforeinstallprompt as soon as
// the app qualifies, which may be earlier than any component mounting.
watchInstallability();

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app root element');

render(<App />, root);
void store.boot();

if ('serviceWorker' in navigator) {
  void import('virtual:pwa-register').then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}
