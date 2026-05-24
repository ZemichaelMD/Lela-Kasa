# Lela Kasa Owner App — Build & Publish Guide

## Prerequisites

- Node.js 18+ installed
- pnpm or npm installed
- Expo CLI (`npx expo`)
- EAS CLI (`npm install -g eas-cli`)
- Apple Developer account (for iOS)
- Google Play Console account (for Android)

## Environment Setup

1. Copy `.env.example` to `.env` and set your API URL:
   ```bash
   cp .env.example .env
   # Edit .env and set EXPO_PUBLIC_API_URL=https://api.kasa.app
   ```

2. Install dependencies:
   ```bash
   cd my-kasa/mobile/kasa-owner-app
   npm install
   ```

3. Verify the app runs locally:
   ```bash
   npx expo start
   ```
   Scan the QR code with Expo Go on your phone.

## Configuration

### app.json

Update `app.json` with your app details:

```json
{
  "expo": {
    "name": "Lela Kasa Owner",
    "slug": "kasa-owner-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#0ea5e9"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.kasa.owner",
      "buildNumber": "1"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0ea5e9"
      },
      "package": "com.kasa.owner",
      "versionCode": 1
    },
    "extra": {
      "apiUrl": "https://api.kasa.app"
    },
    "plugins": ["expo-secure-store"]
  }
}
```

### Assets

Replace the default assets in `assets/`:
- `icon.png` — 1024×1024 app icon
- `splash-icon.png` — splash screen image
- `adaptive-icon.png` — Android adaptive icon foreground (1024×1024)
- `favicon.png` — web favicon

## EAS Setup

1. Login to EAS:
   ```bash
   eas login
   ```

2. Configure the project:
   ```bash
   eas build:configure
   ```
   This creates `eas.json` with build profiles.

3. Update `eas.json` for your needs:
   ```json
   {
     "cli": {
       "version": ">= 5.0.0",
       "appVersionSource": "remote"
     },
     "build": {
       "development": {
         "developmentClient": true,
         "distribution": "internal",
         "ios": { "simulator": true }
       },
       "preview": {
         "distribution": "internal",
         "android": { "buildType": "apk" },
         "env": {
           "EXPO_PUBLIC_API_URL": "https://staging-api.kasa.app"
         }
       },
       "production": {
         "android": { "buildType": "aab" },
         "env": {
           "EXPO_PUBLIC_API_URL": "https://api.kasa.app"
         }
       }
     },
     "submit": {
       "production": {
         "ios": { "appleId": "your@apple.id" },
         "android": { "serviceAccountKeyPath": "./google-service-account.json" }
       }
     }
   }
   ```

## Building

### Development Build (for testing on device)

```bash
# iOS simulator
eas build --platform ios --profile development

# Android device
eas build --platform android --profile development
```

### Preview Build (internal distribution)

```bash
# Android APK
eas build --platform android --profile preview

# iOS IPA (requires Apple Developer account)
eas build --platform ios --profile preview
```

### Production Build

```bash
# Android AAB (for Google Play)
eas build --platform android --profile production

# iOS (for App Store)
eas build --platform ios --profile production
```

## Submitting to Stores

### Google Play (Android)

1. Create a Google Play Console account and app entry
2. Generate a service account JSON key (Google Cloud Console → IAM → Service Accounts)
3. Place the key at `./google-service-account.json`
4. Submit:
   ```bash
   eas submit --platform android --profile production
   ```

### App Store (iOS)

1. Create an Apple Developer account and app entry in App Store Connect
2. Create an App Store Connect API key
3. Submit:
   ```bash
   eas submit --platform ios --profile production
   ```

## Version Bumping

Before each release, update the version:

```bash
# Update version in app.json
# Then build with the new version
eas build --platform android --profile production
eas build --platform ios --profile production
```

Or use EAS automatic versioning:
```bash
eas build --platform android --profile production --auto
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | `https://api.kasa.app` |

Set in `.env` for local dev, or in `eas.json` build profiles for cloud builds.

## Troubleshooting

### "window.addEventListener is not a function"
This was fixed by replacing browser APIs with a cross-platform event emitter. If you see this again, ensure you're not using `window` anywhere in the codebase.

### Build fails with "No matching provisioning profile"
- Ensure your Apple Developer account has the correct bundle identifier registered
- Run `eas build:configure` to set up signing

### APK/AAB won't install
- Check that the `package` name in `app.json` matches your Play Console app
- For Android 14+, ensure `edgeToEdgeEnabled` and `predictiveBackGestureEnabled` are set correctly

### Language not persisting
Language is stored in `AsyncStorage`. If it resets, check that `@react-native-async-storage/async-storage` is properly linked (it should be auto-linked in Expo).

## Quick Reference Commands

```bash
# Start dev server
npx expo start

# Build for Android (APK)
eas build --platform android --profile preview

# Build for Android (AAB for Play Store)
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production

# Submit to Play Store
eas submit --platform android

# Submit to App Store
eas submit --platform ios

# Check build status
eas build:list

# Clear build cache
eas build --clear-cache --platform android
```
