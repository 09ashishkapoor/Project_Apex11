# Sadhana for a Khyapa

A local-first Flutter app for mantra japa and sadhana tracking, built for Android-first sideload distribution and devotional daily practice.

## What it does

- Presents the current four bundled deity/mantra paths.
- Supports manual counting, audio-guided counting, and timed automatic chanting.
- Stores session history locally in Drift/SQLite.
- Computes today totals, lifetime totals, malas of 108, per-deity totals, and recent session history from local data.
- Exports and imports session backups as JSON text.

## What it does not do

- No backend
- No login or accounts
- No payments or subscriptions
- No ads
- No analytics or telemetry
- No cloud sync
- No social features

## Development

Open the repository root in Android Studio or VS Code:

- [E:\projects\Project_Apex11](E:/projects/Project_Apex11)

Do not open only the `android/` subfolder for Flutter development.

### Required validation commands

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
dart format lib test
flutter analyze
flutter test
flutter build apk --debug
```

### Running on an Android emulator or device

After starting an emulator or connecting a device:

```bash
flutter run
```

If Drift tables or database models change, rerun code generation before `flutter run`:

```bash
dart run build_runner build --delete-conflicting-outputs
```

### Web and desktop targets

- The app is maintained as Android-first.
- Chrome/web may not reflect Android behavior because the app relies on mobile/local database plugins.
- Windows desktop requires its own toolchain and is not the primary validation target for this project.

### Current asset setup

- Android launcher icon uses adaptive icon resources derived from `assets/images/1111.png`.
- Android launcher images currently include:
  - `assets/images/batuk1.jpg`
  - `assets/images/maha1.jpg`

## Android release build

Release signing is loaded from `android/key.properties`.

Expected keys:

- `storeFile`
- `storePassword`
- `keyAlias`
- `keyPassword`

If `key.properties` is missing, debug builds still work, but a release build fails fast instead of falling back to the debug keystore.

After configuring signing:

```bash
flutter build apk --release
```

See `RELEASE.md` for sideload guidance, keystore setup, and trusted distribution notes.
