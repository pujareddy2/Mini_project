# Verimark Attendance App (Mini Project)

A beginner-friendly React Native + Expo app for student attendance verification.

This project simulates a modern attendance process:
1. Student opens dashboard
2. Student scans or enters a QR token
3. App validates and processes attendance
4. App shows result (success, suspicious, or rejected)
5. If something fails, app shows guided recovery actions

The app supports mobile and web demo mode.

---

## 1) Project Purpose

This application is designed to demonstrate a complete attendance flow with:
- QR-based verification entry
- Processing and result screens
- Error handling and retry flow
- Dashboard, attendance, period-wise, and timetable navigation
- User-friendly UI with clear feedback

Even if you are not from a software background, think of it as a digital attendance assistant with clear screens and guided next steps.

---

## 2) Technology Used

### Frontend Framework
- React Native
- Expo SDK 54
- React 19

### Navigation
- `@react-navigation/native`
- `@react-navigation/native-stack`

### Device & Platform Features
- `expo-camera` (QR scanning / camera flow)
- `expo-network`
- `expo-location`
- `expo-notifications`
- `expo-device`
- `@react-native-async-storage/async-storage`

### UI & Utilities
- `expo-linear-gradient`
- Custom reusable components (`AppButton`, `Card`, `ScreenLayout`, etc.)

### Code Quality
- ESLint
- Prettier

---

## 3) Project Structure

```text
Mini_project/
  App.js
  app.json
  package.json
  index.js
  assets/
  src/
    components/
    context/
    navigation/
    screens/
    services/
    theme/
    utils/
```

### Key Folders Explained
- `src/screens/`: Full pages shown to users (Home, Scan, Processing, Result, Error, etc.)
- `src/components/`: Reusable UI building blocks
- `src/services/`: Business logic and API/mock service functions
- `src/navigation/`: Route constants and screen stack setup
- `src/theme/`: Colors, spacing, typography constants
- `src/utils/`: Utility helpers and constants

---

## 4) App Screens (Simple Explanation)

- **Splash**: First screen while app starts
- **Login**: User login flow
- **Home**: Student dashboard with attendance summary and shortcuts
- **Attendance / Period-wise / Timetable**: Informational screens
- **Scan**: QR scan/manual QR token entry screen
- **Processing**: Safe loader screen that prepares attendance result
- **Result**: Final status screen with confidence and validation details
- **Error**: Guided recovery screen with retry and settings options
- **Success**: Detailed success receipt
- **Alerts**: Notification center

---

## 5) Current Attendance Flow

### Happy Path
1. Open app and go to scanner
2. Enter QR token (or scan QR on mobile)
3. Tap **Continue to Verification**
4. App navigates to Processing
5. Processing shows loader
6. App redirects to Result with validated summary

### Failure Path
If data is invalid or a runtime issue occurs:
- user sees fallback UI (not white screen)
- user can retry
- or go back and scan again

---

## 6) Important Functional Behavior (Current)

### QR Input Behavior
- Any **non-empty** QR token is accepted for demo/testing
- Empty token is blocked with validation message
- Strict hard-coded token dependency has been removed

### Processing Safety
- Route params are read safely
- Invalid session shows fallback card
- Unexpected issues show error card with Retry/Go Back
- Processing route is wrapped with an Error Boundary as a final safety net

### Web Demo Mode
- Web has fallback/manual token input support
- Processing screen clearly indicates **Web demo mode**

---

## 7) User-Facing Labels and Messages (Text Tags)

These are important visible texts used across the attendance flow:

### Scanner
- `Continue to Verification`
- `Validating...`
- `Enter QR token manually`
- `Please enter a valid QR code`
- `QR scanning is not supported on web`

### Processing
- `Processing attendance...`
- `Attendance verification`
- `Invalid session. Please scan again`
- `Something went wrong`
- `Retry`
- `Go Back`

### Result
- `Attendance Marked Successfully`
- `Attendance Marked (Under Review)`
- `Attendance Rejected`
- `Retry Attendance`
- `Go to Dashboard`

### Error Recovery
- `How to fix this`
- `Retry Attendance`
- `Go to Dashboard`
- `Open Settings` (when required)

---

## 8) Recent Stability and UI Improvements Completed

This README includes the major improvements implemented in the latest development cycle:

1. Fixed white-screen/crash scenarios in the verification flow
2. Added safer navigation payload handling (`qrToken`, `sessionData`)
3. Rebuilt `ProcessingScreen` to use stable loading + fallback states
4. Added processing route error boundary (`ScreenErrorBoundary`)
5. Removed strict hard-coded token checks for demo flow
6. Added button flow control (`Validating...`, disable while processing)
7. Added web-safe verification behavior and fallback UX
8. Added UI spacing improvement: 16px gap above `Go to Dashboard` under retry buttons

---

## 9) Setup Instructions (Beginner Friendly)

### Prerequisites
Install these first:
- Node.js (LTS recommended)
- npm (comes with Node.js)
- Expo CLI is optional globally because scripts use local Expo package

### Install Dependencies
From project root:

```bash
npm install
```

### Start the App

```bash
npm start
```

This opens Expo dev tools where you can run:
- Android emulator/device
- iOS simulator/device (macOS)
- Web browser

### Run Directly for Web

```bash
npm run web
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

---

## 10) Code Quality Commands

### Lint

```bash
npm run lint
```

### Format

```bash
npm run format
```

### Check Formatting

```bash
npm run format:check
```

---

## 11) Configuration Notes

### Expo App Config
Main app metadata is in `app.json`:
- App name and slug
- Splash and icons
- Android adaptive icon setup
- Web favicon
- Plugin list

### Permissions and Platform Behavior
- Camera permissions are requested in scanner/capture flows
- Location/network services are used in extended validation screens
- Some features are simulated in web mode for demos

---

## 12) Important Files to Know

- `App.js`: app bootstrapping, providers, navigation container
- `src/navigation/AppNavigator.js`: all route screen wiring
- `src/navigation/routes.js`: central route name constants
- `src/screens/ScanScreen.js`: QR input and scanner logic
- `src/screens/ProcessingScreen.js`: loading/validation bridge and safe redirect
- `src/screens/ResultScreen.js`: final status + confidence details
- `src/screens/ErrorScreen.js`: retry and guided fixes
- `src/components/ScreenErrorBoundary.js`: runtime fallback safety
- `src/services/qrService.js`: QR verification service (demo-permissive behavior)

---

## 13) Non-Technical Explanation of the Full Flow

Imagine this as a receptionist process:
1. You show a QR pass
2. System checks if your pass is present and readable
3. System processes attendance in the background
4. You see a clear final result
5. If there is any issue, system tells you exactly what to do next

That is exactly what this app does through separate screens.

---

## 14) Known Demo Assumptions

- QR verification is currently demo-friendly (any non-empty token)
- Some deep verification details are mocked/simulated
- Web mode is intended for UI and flow demonstration

---

## 15) Future Enhancements (Suggested)

1. Connect QR service to real backend API
2. Add authenticated role-based access (student/faculty/admin)
3. Add offline queue and later sync for attendance submissions
4. Add automated tests (unit/integration/e2e)
5. Add analytics and audit trail for attendance events

---

## 16) Troubleshooting

### App does not start
- Run `npm install` again
- Delete `node_modules` and reinstall
- Ensure Node version is modern (LTS)

### Scanner not working on browser
- Expected behavior: web uses manual token fallback

### White screen appears
- Latest build includes fallback and error boundary protection
- Run `npm run lint` to ensure no syntax issues
- Restart Expo server if hot reload cache is stale

---

## 17) Quick Command Reference

```bash
npm install
npm start
npm run web
npm run android
npm run ios
npm run lint
npm run format
npm run format:check
```

---

## 18) Project Status

Current status: **Stable demo flow**
- No known lint errors
- Crash-safe processing path added
- Beginner-friendly UI feedback in place

---

If you are new to coding, start by running `npm start`, open the web version, go to scanner, enter any text as QR token, and observe the complete attendance flow from scan to result.
