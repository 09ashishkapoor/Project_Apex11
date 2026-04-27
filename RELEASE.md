# Android release guide

## Trusted distribution

Users should only download release APKs from official Jai Khyapa Parampara or GitHub release sources that you control. Do not redistribute APKs through unverified mirrors.

## Generate a keystore

Example:

```bash
keytool -genkeypair -v \
  -keystore sadhana-release.jks \
  -alias sadhana \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Keep the keystore file private and never commit it.

## Configure `android/key.properties`

Create `android/key.properties` with:

```properties
storeFile=../path/to/sadhana-release.jks
storePassword=your-store-password
keyAlias=sadhana
keyPassword=your-key-password
```

`android/.gitignore` already ignores `key.properties`, `*.jks`, and `*.keystore`.

## Build the release APK

```bash
flutter pub get
dart run build_runner build --delete-conflicting-outputs
flutter build apk --release
```

## Sideloading

1. Transfer the generated APK to the Android device.
2. Enable installation from the trusted file source if Android prompts for permission.
3. Install the APK.
4. Open the app and confirm the launcher name is `Sadhana for a Khyapa`.

## Pre-release checks

- Verify manual, audio-guided, and timed sessions all persist correctly.
- Verify tracker totals and recent history update after completing sessions.
- Verify export/import backup JSON works before publishing.
- Verify the app was built from the intended tagged commit or release branch.
