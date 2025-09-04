# WestMed Hospital - Mobile App Deployment Guide

## Google Play Store Deployment Instructions

### Prerequisites
- Android Studio installed on your development machine
- Google Play Console account
- Java Development Kit (JDK 11 or higher)

### Step 1: Export and Setup Project
1. Click the "Export to Github" button in Lovable to transfer the project to your GitHub repository
2. Clone the repository to your local machine:
   ```bash
   git clone <your-repository-url>
   cd <project-directory>
   ```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Add Android Platform
```bash
npx cap add android
```

### Step 4: Update Native Dependencies
```bash
npx cap update android
```

### Step 5: Build the Web App
```bash
npm run build
```

### Step 6: Sync with Native Platform
```bash
npx cap sync
```

### Step 7: Configure Android App
1. Open Android Studio:
   ```bash
   npx cap open android
   ```

2. In Android Studio, configure:
   - App icon (replace in `android/app/src/main/res/mipmap-*` folders)
   - App name in `android/app/src/main/res/values/strings.xml`
   - Package name in `android/app/build.gradle`
   - Version code and version name in `android/app/build.gradle`

### Step 8: Generate Signed APK/AAB
1. In Android Studio, go to `Build` > `Generate Signed Bundle / APK`
2. Create a new keystore or use an existing one
3. Generate the AAB (Android App Bundle) for Play Store upload

### Step 9: Upload to Google Play Console
1. Create a new app in Google Play Console
2. Fill in the app information:
   - App name: "WestMed Hospital - Doctor Payment Management"
   - Category: Medical
   - Target audience: Healthcare professionals
3. Upload the AAB file
4. Complete the store listing with screenshots and descriptions
5. Set up pricing (free/paid)
6. Submit for review

### Key Features for Store Listing:
- **Secure Doctor Authentication**: Each doctor has individual login credentials
- **Role-based Access**: Doctors see only their own visits and payments
- **Visit Management**: Record patient visits with counts and notes
- **Payment Tracking**: Automatic calculation based on visit rates
- **Multi-level Approval**: Manager and admin approval workflow
- **Indian Currency Support**: Proper INR formatting throughout
- **Offline Ready**: Works even with limited connectivity

### Security Features:
- Row Level Security (RLS) ensures data isolation
- Encrypted authentication tokens
- Secure API communication with Supabase
- Role-based permissions (Doctor/Manager/Admin)

### Testing Before Release:
1. Test on multiple Android devices/emulators
2. Verify all authentication flows work properly
3. Test role-based access controls
4. Ensure payment calculations are accurate
5. Test offline/online synchronization

### Production Configuration:
Make sure to update the Supabase URL configuration in Authentication settings:
- Site URL: Your production domain
- Redirect URLs: Include your production domain and any deep links

### Ongoing Updates:
After making changes in Lovable:
1. Git pull the latest changes
2. Run `npm run build`
3. Run `npx cap sync`
4. Generate new signed bundle and upload to Play Store