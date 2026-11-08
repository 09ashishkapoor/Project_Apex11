import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android wrapper around the same web build.
 *
 * The APK is not a second app: `npm run build` produces `dist/`, Capacitor
 * copies it into the native shell, and the WebView loads it from disk so the
 * app is fully offline with no server.
 */
const config: CapacitorConfig = {
  appId: 'org.mantrini.japa',
  appName: 'MANTRINI',
  webDir: 'dist',
  android: {
    backgroundColor: '#0D0506',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
