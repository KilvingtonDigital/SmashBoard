# SmashBoard Mobile App Setup

SmashBoard now supports native iOS and Android apps using Capacitor! This allows you to distribute your app through the App Store and Google Play Store, with access to native device features like camera, file system, and more.

## Prerequisites

### For iOS Development (Mac only)
- macOS with Xcode 14 or later
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (for App Store distribution)

### For Android Development (Any OS)
- Android Studio
- Java Development Kit (JDK) 17 or later
- Android SDK

## Quick Start

### 1. Build the Web App
```bash
npm run build
```

### 2. Generate Native Projects (First Time Only)
If the `ios/` and `android/` directories don't exist, regenerate them:

```bash
npm run mobile:add-ios      # Generate iOS project
npm run mobile:add-android  # Generate Android project
```

### 3. Sync Web Assets to Native Projects
After any code changes, sync the updated web assets:

```bash
npm run mobile:sync
```

Or build and sync in one command:

```bash
npm run mobile:build
```

### 4. Open in Native IDE

**For iOS:**
```bash
npm run mobile:ios
```
This opens Xcode. Then:
- Select a simulator or connected device
- Click the "Play" button to run the app

**For Android:**
```bash
npm run mobile:android
```
This opens Android Studio. Then:
- Select an emulator or connected device
- Click the "Run" button to launch the app

## Development Workflow

1. Make changes to your React code in `src/`
2. Test in the browser: `npm start`
3. Build and sync to mobile: `npm run mobile:build`
4. Open in native IDE and run: `npm run mobile:ios` or `npm run mobile:android`

## Available Native Features

The app includes the following Capacitor plugins:

- **@capacitor/app** - App lifecycle events, deep linking
- **@capacitor/camera** - Take photos or select from gallery
- **@capacitor/filesystem** - Read/write files on device
- **@capacitor/share** - Native share dialog
- **@capacitor/splash-screen** - Customizable splash screen

### Example: Using the Camera

```javascript
import { Camera, CameraResultType } from '@capacitor/camera';

const takePicture = async () => {
  const image = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri
  });

  // Use image.webPath to display the photo
  console.log('Photo URI:', image.webPath);
};
```

### Example: Sharing Results

```javascript
import { Share } from '@capacitor/share';

const shareResults = async () => {
  await Share.share({
    title: 'Tournament Results',
    text: 'Check out these tournament results!',
    url: 'https://yourapp.com/results',
    dialogTitle: 'Share Results'
  });
};
```

## App Configuration

Edit `capacitor.config.ts` to customize:

```typescript
const config: CapacitorConfig = {
  appId: 'com.smashboard.app',        // Change for your app
  appName: 'SmashBoard',              // Change app display name
  webDir: 'build',
  server: {
    androidScheme: 'https'            // Use HTTPS on Android
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,       // Show splash for 2 seconds
      backgroundColor: '#000000',      // Black background
      showSpinner: false
    }
  }
};
```

## Building for Production

### iOS

1. Open Xcode: `npm run mobile:ios`
2. In Xcode:
   - Select "Any iOS Device" as the target
   - Go to Product > Archive
   - Use the Organizer to upload to App Store Connect
3. Submit for review in App Store Connect

### Android

1. Open Android Studio: `npm run mobile:android`
2. Generate a signed APK/Bundle:
   - Go to Build > Generate Signed Bundle / APK
   - Follow the wizard to create a keystore (first time) or use existing
   - Select "Release" build type
   - Upload the generated `.aab` file to Google Play Console
3. Submit for review in Google Play Console

## Updating Native Projects

The `ios/` and `android/` directories are gitignored because they can be regenerated. If you need to recreate them:

```bash
# Delete the directories (if they exist)
rm -rf ios android

# Regenerate
npm run mobile:add-ios
npm run mobile:add-android

# Sync your web assets
npm run mobile:sync
```

## Troubleshooting

### iOS Won't Build
- Ensure CocoaPods is installed: `sudo gem install cocoapods`
- Run `pod install` in the `ios/App` directory
- Clean build folder in Xcode: Product > Clean Build Folder

### Android Build Errors
- Ensure you have the correct Android SDK installed
- In Android Studio, go to Tools > SDK Manager and install required components
- Try: File > Invalidate Caches / Restart

### Changes Not Showing
- Always run `npm run mobile:build` after making code changes
- Make sure your web app builds successfully first with `npm run build`

## Useful Commands

| Command | Description |
|---------|-------------|
| `npm run mobile:build` | Build web app and sync to mobile |
| `npm run mobile:sync` | Sync web assets without rebuilding |
| `npm run mobile:ios` | Open iOS project in Xcode |
| `npm run mobile:android` | Open Android project in Android Studio |
| `npm run mobile:add-ios` | Regenerate iOS project |
| `npm run mobile:add-android` | Regenerate Android project |

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [iOS App Distribution Guide](https://developer.apple.com/app-store/submitting/)
- [Android App Publishing Guide](https://developer.android.com/studio/publish)

## Next Steps

Consider adding:
- Push notifications with [@capacitor/push-notifications](https://capacitorjs.com/docs/apis/push-notifications)
- Geolocation with [@capacitor/geolocation](https://capacitorjs.com/docs/apis/geolocation)
- Haptic feedback with [@capacitor/haptics](https://capacitorjs.com/docs/apis/haptics)
- Network status with [@capacitor/network](https://capacitorjs.com/docs/apis/network)
