# Automated Android Build Setup

This project includes automated Android builds via GitHub Actions.

## Overview

The GitHub Actions workflow automatically builds your Android app whenever you push changes to the `main` branch or manually trigger a build.

## Build Types

### Debug Build (APK)
- **Purpose**: Testing and development
- **Format**: APK file
- **Signing**: Debug keystore (auto-generated)
- **Use case**: Install directly on devices for testing

### Release Build (AAB)
- **Purpose**: Production deployment to Play Store
- **Format**: Android App Bundle (AAB)
- **Signing**: Requires release keystore
- **Use case**: Submit to Google Play Console

## Setup Instructions

### 1. Initial Setup (One-time)

After exporting your project to GitHub:

```bash
# Clone your repository
git clone <your-repo-url>
cd <project-directory>

# Install dependencies
npm install

# Add Android platform
npx cap add android

# Commit the Android files
git add android/
git commit -m "Add Android platform"
git push origin main
```

### 2. Configure Release Signing (For Production Builds)

To build release versions, you need to set up signing:

#### Generate a Keystore

```bash
keytool -genkey -v -keystore westmed-release.keystore \
  -alias westmed-hospital \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**IMPORTANT**: Keep your keystore file safe and never commit it to Git!

#### Configure Signing in Android

1. Copy your keystore to a secure location (NOT in the project folder)
2. Create `android/key.properties` with:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=westmed-hospital
storeFile=/path/to/westmed-release.keystore
```

3. Update `android/app/build.gradle` to use the keystore:

```gradle
android {
    // ... existing config ...
    
    signingConfigs {
        release {
            if (project.hasProperty('storeFile')) {
                storeFile file(project.property('storeFile'))
                storePassword project.property('storePassword')
                keyAlias project.property('keyAlias')
                keyPassword project.property('keyPassword')
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:
- `KEYSTORE_PASSWORD`: Your keystore password
- `KEY_ALIAS`: Your key alias (e.g., westmed-hospital)
- `KEY_PASSWORD`: Your key password
- `KEYSTORE_BASE64`: Your keystore file encoded in base64

To encode your keystore:
```bash
base64 -i westmed-release.keystore | pbcopy  # macOS
base64 westmed-release.keystore | xclip      # Linux
```

### 3. Triggering Builds

#### Automatic Builds
Builds trigger automatically when you push changes to:
- `src/**` (source code)
- `android/**` (native Android code)
- `capacitor.config.ts` (Capacitor configuration)

#### Manual Builds
1. Go to GitHub → Actions tab
2. Select "Build Android App" workflow
3. Click "Run workflow"
4. Choose build type (debug or release)
5. Click "Run workflow"

### 4. Downloading Build Artifacts

After a successful build:

1. Go to the Actions tab in your GitHub repository
2. Click on the completed workflow run
3. Scroll down to "Artifacts" section
4. Download the APK (debug) or AAB (release)

#### Debug APK
- Named: `westmed-hospital-debug-<commit-sha>`
- Can be installed directly on Android devices
- Valid for 30 days

#### Release AAB
- Named: `westmed-hospital-release-<commit-sha>`
- Ready for upload to Google Play Console
- Valid for 90 days
- Also creates a draft GitHub Release

## App Configuration

Current app details (from `capacitor.config.ts`):
- **App ID**: `app.lovable.e77a21f11fd24c69b43dd3af7c8a046d`
- **App Name**: `westmed-hospitaladmin`

### Customizing for Production

Before releasing to Play Store, update these values in `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.westmed.hospital',  // Your own package name
  appName: 'WestMed Hospital',     // Public-facing app name
  webDir: 'dist',
  // Remove or comment out the server config for production
  // server: { ... }
};
```

Also update in `android/app/build.gradle`:
- `applicationId`: Match your `appId`
- `versionCode`: Increment for each release
- `versionName`: Your version number (e.g., "1.0.0")

## Troubleshooting

### Build Fails: "Android platform not found"
- Make sure you've run `npx cap add android` locally and committed the `android/` folder

### Signing Errors in Release Build
- Verify all keystore secrets are correctly set in GitHub
- Check that keystore password and key alias match

### Gradle Build Fails
- Check the build logs in GitHub Actions
- Common issues: Memory limits, dependency conflicts
- Try running the build locally first

### APK/AAB Not Generated
- Check that the workflow completed successfully (green checkmark)
- Look for error messages in the workflow logs
- Verify file paths in the workflow match your project structure

## Local Testing

Before relying on GitHub Actions, test locally:

```bash
# Build web app
npm run build

# Sync with Android
npx cap sync android

# Open in Android Studio
npx cap open android

# Or build from command line
cd android
./gradlew assembleDebug        # Debug APK
./gradlew bundleRelease        # Release AAB
```

## Publishing to Play Store

Once you have a release AAB:

1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app (or open existing)
3. Navigate to Release → Production
4. Click "Create new release"
5. Upload your AAB file
6. Fill in release notes
7. Review and roll out

## Security Best Practices

- ✅ Never commit keystores to Git
- ✅ Use GitHub Secrets for sensitive data
- ✅ Rotate keystores if compromised
- ✅ Keep keystore backups in secure location
- ✅ Use different keystores for debug/release
- ✅ Limit access to GitHub repository secrets

## Additional Resources

- [Capacitor Android Documentation](https://capacitorjs.com/docs/android)
- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
