# Reliable latest-version update flow

## Goal
Make every Update button verify the version actually published for WestMed, both before sign-in and after sign-in.

## Changes
1. **Publish a release manifest with every build**
   - Generate `build-info.json` automatically from the same version, release number, timestamp, and commit embedded in the app.
   - Ensure the four-part version remains visible, for example `1.1.0.01`.

2. **Create one shared update checker**
   - Fetch the published release manifest with cache bypassing.
   - Compare both the four-part version and build identity against the version currently running.
   - Also request a service-worker update, while preserving notification workers.
   - Return clear states: checking, current, update available, offline/error.

3. **Use the same logic everywhere**
   - Connect the desktop header, mobile header, doctor dashboard, and sign-in screen to the shared checker.
   - Show the running and published version when an update is available.
   - Remove the current false-success behavior when no release record exists.

4. **Apply updates safely**
   - Clear only application caches, activate a waiting service worker when present, and reload with a cache-busting URL.
   - Keep the native-app download path available when a valid active download record exists.
   - Prevent reload loops and preserve the existing automatic new-build refresh protection.

5. **Verify the complete flow**
   - Check signed-out and signed-in screens on desktop and mobile widths.
   - Verify current-version, newer-version, unavailable/offline, and native-download states.
   - Confirm the displayed version uses the two-digit fourth segment and the project builds successfully.

## Technical note
The database currently has no `app_downloads` rows, and the published `/build-info.json` endpoint is not available. The web update check will therefore use a build-generated release manifest as its authoritative source; `app_downloads` remains supplemental for native download files and forced-update settings.
