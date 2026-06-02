# Verimark Attendance App (Mini Project)

A beginner-friendly React Native + Expo app for student attendance verification.

> **In simple terms:** This is a digital attendance assistant. A student scans a QR code, the app checks if everything is valid, and shows a clear result — pass, review, or rejected. If something goes wrong, it tells the student exactly what to do next.

---

## Table of Contents

1. [What This App Does](#1-what-this-app-does)
2. [Prerequisites](#2-prerequisites)
3. [Setup and Installation](#3-setup-and-installation)
4. [Running the App](#4-running-the-app)
5. [How to Use the App (Step by Step)](#5-how-to-use-the-app-step-by-step)
6. [App Screens](#6-app-screens)
7. [Technology Used](#7-technology-used)
8. [Project Structure](#8-project-structure)
9. [Important Files to Know](#9-important-files-to-know)
10. [How the Attendance Flow Works Internally](#10-how-the-attendance-flow-works-internally)
11. [Functional Behavior and Safety Features](#11-functional-behavior-and-safety-features)
12. [User-Facing Labels and Messages](#12-user-facing-labels-and-messages)
13. [Configuration Notes](#13-configuration-notes)
14. [Code Quality Commands](#14-code-quality-commands)
15. [Troubleshooting](#15-troubleshooting)
16. [Recent Stability and UI Improvements](#16-recent-stability-and-ui-improvements)
17. [Known Demo Assumptions](#17-known-demo-assumptions)
18. [Future Enhancements](#18-future-enhancements)
19. [Quick Command Reference](#19-quick-command-reference)
20. [Project Status](#20-project-status)

---

## 1) What This App Does

This application demonstrates a complete attendance verification flow:

1. Student opens the app and sees a dashboard
2. Student scans a QR code or enters a QR token manually
3. App validates and processes the attendance in the background
4. App shows the result — success, suspicious (under review), or rejected
5. If something fails, app shows guided recovery actions with clear next steps

The app supports both **mobile** (Android/iOS) and **web demo** mode.

### Purpose

- QR-based verification entry
- Processing and result screens with real-time feedback
- Error handling and retry flow
- Dashboard with attendance summary, period-wise breakdown, and timetable navigation
- User-friendly UI with clear messages at every step

---

## 2) Prerequisites

Before you begin, install the following on your computer:

| Requirement | Details |
|---|---|
| **Node.js** | LTS version recommended — download from [nodejs.org](https://nodejs.org) |
| **npm** | Comes bundled with Node.js (no separate install needed) |
| **Expo CLI** | Optional globally — the project uses the local Expo package via npm scripts |

To check if you have Node.js and npm installed:

```bash
node --version
npm --version
```

---

## 3) Setup and Installation

### Step 1: Navigate to the project folder

```bash
cd Mini_project
```

### Step 2: Install all dependencies

```bash
npm install
```

This reads `package.json` and downloads all required libraries into a `node_modules` folder.

### Step 3: Verify installation

If the install completes without errors, you are ready to run the app.

> **Tip:** If you see errors, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.

---

## 4) Running the App

### Start the development server

```bash
npm start
```

This opens Expo dev tools in your terminal. From here you can run the app on:

- **Web browser** — Press `w`
- **Android emulator or device** — Press `a`
- **iOS simulator** (macOS only) — Press `i`

### Run directly for a specific platform

```bash
# Web browser
npm run web

# Android
npm run android

# iOS (macOS only)
npm run ios
```

The app will open automatically in your chosen platform.

---

## 5) How to Use the App (Step by Step)

### Happy Path (Everything Works)

1. **Launch the app** — You see the Splash screen briefly, then the Login screen
2. **Log in** — Enter your credentials on the Login screen
3. **Dashboard** — You land on the Home screen showing attendance summary and shortcuts
4. **Go to Scanner** — Tap the scan/attendance button to open the QR scanner
5. **Enter QR token** — Scan a QR code on mobile, or type a token manually (any non-empty text works for demo)
6. **Tap "Continue to Verification"** — The button starts the validation process
7. **Processing screen** — A loader appears while the app validates your attendance
8. **Result screen** — You see the final status:
   - ✅ **Attendance Marked Successfully** — confidence score shown with all checks passed
   - ⚠️ **Attendance Marked (Under Review)** — some checks flagged as suspicious
   - ❌ **Attendance Rejected** — validation failed
9. **Return to Dashboard** — Tap "Go to Dashboard" to go back

### Failure Path (Something Goes Wrong)

If data is invalid or a runtime issue occurs:

- You see a fallback UI (never a white/blank screen)
- You can tap **Retry** to try again
- You can tap **Go Back** to return to the scanner and scan again
- If a device setting is needed, you see an **Open Settings** option

---

## 6) App Screens

Each screen serves a specific step in the attendance flow:

| Screen | Purpose |
|---|---|
| **Splash** | First screen shown while the app loads |
| **Login** | User authentication flow |
| **Home** | Student dashboard with attendance summary and quick shortcuts |
| **Attendance** | Detailed attendance records view |
| **Period-wise** | Attendance breakdown by class period |
| **Semester** | Semester-level attendance view |
| **Timetable** | Class schedule display |
| **Scan** | QR code scanner (mobile) or manual token entry (web) |
| **Camera Capture** | Photo capture for context verification |
| **Processing** | Loading/validation bridge — processes attendance and redirects |
| **Result** | Final status screen with confidence score and validation details |
| **Success** | Detailed success receipt with full breakdown |
| **Error** | Guided recovery screen with retry options and fix suggestions |
| **Alerts** | Notification center for attendance-related alerts |

---

## 7) Technology Used

### Frontend Framework

| Technology | Version | Purpose |
|---|---|---|
| React Native | 0.81.5 | Cross-platform mobile framework |
| Expo SDK | 54 | Development toolkit and build system |
| React | 19.1.0 | UI component library |

### Navigation

| Package | Purpose |
|---|---|
| `@react-navigation/native` | Core navigation framework |
| `@react-navigation/native-stack` | Stack-based screen navigation |

### Device and Platform Features

| Package | Purpose |
|---|---|
| `expo-camera` | QR scanning and camera access |
| `expo-barcode-scanner` | Barcode/QR code detection |
| `expo-network` | Network connectivity checks |
| `expo-location` | GPS location access |
| `expo-notifications` | Push notification support |
| `expo-device` | Device information retrieval |
| `expo-image-picker` | Image selection from gallery |
| `@react-native-async-storage/async-storage` | Local data persistence |

### UI and Utilities

| Package | Purpose |
|---|---|
| `expo-linear-gradient` | Gradient backgrounds |
| `react-native-qrcode-svg` | QR code rendering |
| `react-native-svg` | SVG graphics support |
| `react-native-safe-area-context` | Safe area handling for notched devices |
| `react-native-screens` | Native screen optimization |
| Custom components | `AppButton`, `Card`, `ScreenLayout`, `StatusBox`, `ValidationItem`, etc. |

### Code Quality

| Tool | Purpose |
|---|---|
| ESLint | JavaScript linting and error detection |
| Prettier | Code formatting |

---

## 8) Project Structure

```text
Mini_project/
├── App.js                          # App entry point, providers, navigation container
├── index.js                        # Expo/React Native bootstrap
├── app.json                        # Expo app configuration
├── package.json                    # Dependencies and npm scripts
├── assets/                         # Icons, splash images, and static assets
└── src/
    ├── config.js                   # App-level configuration
    ├── components/                 # Reusable UI building blocks
    │   ├── AppBackground.js        #   Gradient background wrapper
    │   ├── AppButton.js            #   Styled button component
    │   ├── AppHeader.js            #   Screen header bar
    │   ├── AppWrapper.js           #   Top-level app wrapper
    │   ├── Card.js                 #   Card container component
    │   ├── ProgressBar.js          #   Progress indicator bar
    │   ├── ScreenErrorBoundary.js  #   Runtime error fallback wrapper
    │   ├── ScreenLayout.js         #   Common screen layout template
    │   ├── SegmentTabs.js          #   Tab selector component
    │   ├── StatusBox.js            #   Status display box
    │   └── ValidationItem.js       #   Validation check row item
    ├── context/                    # React Context providers
    │   └── AlertsContext.js        #   Alerts state management
    ├── navigation/                 # Route setup and constants
    │   ├── AppNavigator.js         #   Stack navigator with all screens
    │   └── routes.js               #   Central route name constants
    ├── screens/                    # Full-page screens
    │   ├── SplashScreen.js         #   App loading splash
    │   ├── LoginScreen.js          #   User authentication
    │   ├── HomeScreen.js           #   Student dashboard
    │   ├── AttendanceScreen.js     #   Attendance records
    │   ├── PeriodWiseScreen.js     #   Period-wise breakdown
    │   ├── SemesterScreen.js       #   Semester attendance view
    │   ├── TimetableScreen.js      #   Class schedule
    │   ├── ScanScreen.js           #   QR scanner / manual entry
    │   ├── CameraCaptureScreen.js  #   Photo capture screen
    │   ├── ProcessingScreen.js     #   Validation processing bridge
    │   ├── ResultScreen.js         #   Final attendance status
    │   ├── SuccessScreen.js        #   Detailed success receipt
    │   ├── ErrorScreen.js          #   Error recovery with guided fixes
    │   └── AlertsScreen.js         #   Notifications center
    ├── services/                   # Business logic and API functions
    │   ├── index.js                #   Service exports
    │   ├── authService.js          #   Authentication logic
    │   ├── qrService.js            #   QR verification (demo-permissive)
    │   ├── attendanceService.js    #   Attendance submission logic
    │   ├── attendanceDataService.js#   Attendance data retrieval
    │   ├── dashboardService.js     #   Dashboard data service
    │   ├── alertService.js         #   Alert/notification service
    │   ├── cameraService.js        #   Camera interaction logic
    │   ├── facultyService.js       #   Faculty-related operations
    │   ├── networkService.js       #   Network connectivity checks
    │   └── validationService.js    #   Input validation helpers
    ├── theme/                      # Design system constants
    │   ├── index.js                #   Theme exports
    │   ├── colors.js               #   Color palette
    │   ├── spacing.js              #   Spacing scale
    │   ├── typography.js           #   Font sizes and weights
    │   └── radius.js               #   Border radius values
    └── utils/                      # Utility helpers
        ├── index.js                #   Utils exports
        ├── deviceInfo.js           #   Device information utilities
        ├── errorHandler.js         #   Centralized error handling
        └── storageKeys.js          #   AsyncStorage key constants
```

### Key Folders Explained

| Folder | What It Contains |
|---|---|
| `src/screens/` | Full pages shown to users — each file is one screen |
| `src/components/` | Reusable UI building blocks used across multiple screens |
| `src/services/` | Business logic, API calls, and mock service functions |
| `src/navigation/` | Route name constants and the screen stack navigator |
| `src/theme/` | Design tokens — colors, spacing, typography, border radius |
| `src/context/` | React Context providers for shared app state |
| `src/utils/` | Utility helpers for device info, error handling, and storage keys |

---

## 9) Important Files to Know

If you want to understand the core of the app, start with these files:

| File | What It Does |
|---|---|
| `App.js` | App bootstrapping — sets up providers and navigation container |
| `src/navigation/AppNavigator.js` | Wires all screen routes into a navigation stack |
| `src/navigation/routes.js` | Central list of all route name constants |
| `src/screens/ScanScreen.js` | QR input screen — camera scanning or manual token entry |
| `src/screens/ProcessingScreen.js` | Loading/validation bridge — processes data and redirects safely |
| `src/screens/ResultScreen.js` | Final status display with confidence score and check details |
| `src/screens/ErrorScreen.js` | Error recovery screen with retry options and guided fixes |
| `src/components/ScreenErrorBoundary.js` | Runtime error boundary — prevents white screens |
| `src/services/qrService.js` | QR token verification logic (currently demo-permissive) |

---

## 10) How the Attendance Flow Works Internally

### Architecture Overview

```
┌─────────────────┐
│   SplashScreen   │ ──► App loads, then navigates to Login
└────────┬────────┘
         ▼
┌─────────────────┐
│   LoginScreen    │ ──► User authenticates
└────────┬────────┘
         ▼
┌─────────────────┐
│   HomeScreen     │ ──► Dashboard with attendance summary
│   (Dashboard)    │     User taps "Scan" to mark attendance
└────────┬────────┘
         ▼
┌─────────────────┐
│   ScanScreen     │ ──► Mobile: camera scans QR code
│                  │     Web: manual token text input
│                  │     Tap "Continue to Verification"
└────────┬────────┘
         ▼
┌─────────────────┐
│ ProcessingScreen │ ──► Shows loading indicator
│                  │     Calls qrService to validate token
│                  │     Handles errors with fallback cards
└────────┬────────┘
         ▼
   ┌─────┴──────┐
   ▼             ▼
┌────────┐  ┌──────────┐
│ Result │  │  Error    │
│ Screen │  │  Screen   │
│        │  │           │
│ Valid  │  │ Retry     │
│ Review │  │ Go Back   │
│ Reject │  │ Settings  │
└────────┘  └──────────┘
```

### Validation Pipeline (What Happens in Processing)

1. **Read route params** — Safely extract `qrToken` and `sessionData` from navigation
2. **Validate QR token** — Call `qrService.js` to check the token
3. **Check session window** — Verify the attendance session is still active
4. **Verify device** — Check device binding if available
5. **Validate GPS** — Compare student location with classroom coordinates
6. **Validate WiFi** — Match WiFi SSID against expected network
7. **Calculate confidence score** — Aggregate all check results into a 0–100 score
8. **Determine status** — Valid (≥80), Suspicious (60–79), or Rejected (<60)
9. **Navigate to result** — Pass all data to ResultScreen for display

If any step fails unexpectedly:
- The Processing screen shows a fallback error card
- The `ScreenErrorBoundary` catches runtime crashes as a final safety net
- The user always sees actionable buttons, never a white screen

---

## 11) Functional Behavior and Safety Features

### QR Input Behavior
- Any **non-empty** QR token is accepted for demo/testing purposes
- Empty token is blocked with a validation message: `"Please enter a valid QR code"`
- Strict hard-coded token dependency has been removed for flexibility

### Processing Safety
- Route params are read safely with fallback defaults
- Invalid session shows a fallback card with "Invalid session. Please scan again"
- Unexpected issues show an error card with **Retry** and **Go Back** buttons
- The entire Processing route is wrapped with `ScreenErrorBoundary` as a final safety net

### Web Demo Mode
- Web uses manual token text input (camera not available in browser)
- Processing screen clearly indicates **"Web demo mode"**
- All flows work identically, just with manual input instead of camera scan

### Button Flow Control
- After tapping "Continue to Verification", the button text changes to `"Validating..."` and becomes disabled
- Prevents double-tap or accidental re-submission

---

## 12) User-Facing Labels and Messages

These are the key texts shown to users at each step:

### Scanner Screen
| Label | When It Appears |
|---|---|
| `Continue to Verification` | Main action button |
| `Validating...` | Button text while processing |
| `Enter QR token manually` | Web fallback input label |
| `Please enter a valid QR code` | Empty token validation error |
| `QR scanning is not supported on web` | Web platform notice |

### Processing Screen
| Label | When It Appears |
|---|---|
| `Processing attendance...` | Loading state |
| `Attendance verification` | Screen title |
| `Invalid session. Please scan again` | Bad/missing session data |
| `Something went wrong` | Unexpected error |
| `Retry` | Retry button on error |
| `Go Back` | Return to scanner on error |

### Result Screen
| Label | When It Appears |
|---|---|
| `Attendance Marked Successfully` | Score ≥ 80 (valid) |
| `Attendance Marked (Under Review)` | Score 60–79 (suspicious) |
| `Attendance Rejected` | Score < 60 (rejected) |
| `Retry Attendance` | Try again button |
| `Go to Dashboard` | Return to home button |

### Error Recovery Screen
| Label | When It Appears |
|---|---|
| `How to fix this` | Section header with suggestions |
| `Retry Attendance` | Retry button |
| `Go to Dashboard` | Return home button |
| `Open Settings` | When a device permission is needed |

---

## 13) Configuration Notes

### Expo App Config (`app.json`)

| Setting | Value |
|---|---|
| App name | `Mini_project` |
| Orientation | Portrait |
| Splash background | White (`#ffffff`) |
| New Architecture | Enabled |
| iOS | Supports tablet |
| Android | Edge-to-edge enabled, adaptive icon |
| Web | Custom favicon |
| Plugins | `expo-barcode-scanner` |

### Permissions and Platform Behavior
- **Camera permissions** are requested when opening the scanner/capture screens
- **Location/network services** are used in extended validation flows
- Some features are **simulated in web mode** for demo purposes (no real camera, GPS mocked)

---

## 14) Code Quality Commands

### Lint (find code issues)

```bash
npm run lint
```

### Format (auto-fix code style)

```bash
npm run format
```

### Check formatting (without changing files)

```bash
npm run format:check
```

---

## 15) Troubleshooting

### App does not start

1. Run `npm install` again to ensure all dependencies are present
2. Delete `node_modules` and `package-lock.json`, then run `npm install`
3. Ensure your Node.js version is modern (LTS recommended)
4. Try clearing Expo cache: `npx expo start --clear`

### Scanner not working in browser

- **This is expected.** Web browsers cannot access the device camera the same way mobile apps can.
- The web version provides a manual token input field as a fallback.

### White screen appears

- The latest build includes fallback UI and error boundary protection, so this should not happen.
- Run `npm run lint` to check for syntax issues.
- Restart the Expo server if hot reload cache is stale: `npx expo start --clear`

### Navigation errors

- Ensure all route names match between `routes.js` and `AppNavigator.js`
- Check that required route params are being passed correctly

---

## 16) Recent Stability and UI Improvements

The following improvements have been implemented in the latest development cycle:

1. ✅ Fixed white-screen/crash scenarios in the verification flow
2. ✅ Added safer navigation payload handling (`qrToken`, `sessionData`)
3. ✅ Rebuilt `ProcessingScreen` to use stable loading + fallback states
4. ✅ Added processing route error boundary (`ScreenErrorBoundary`)
5. ✅ Removed strict hard-coded token checks for demo flow flexibility
6. ✅ Added button flow control (`Validating...` text, disable while processing)
7. ✅ Added web-safe verification behavior and fallback UX
8. ✅ Added UI spacing improvement: 16px gap above "Go to Dashboard" under retry buttons

---

## 17) Known Demo Assumptions

- QR verification is currently **demo-friendly** — any non-empty token is accepted
- Some deep verification details (GPS, WiFi, device binding) are **mocked/simulated**
- Web mode is intended for **UI and flow demonstration**, not production use
- The app does not currently connect to a live backend API

---

## 18) Future Enhancements

1. Connect QR service to real backend API (e.g., SAAIS FastAPI backend)
2. Add authenticated role-based access (student / faculty / admin)
3. Add offline queue and later sync for attendance submissions
4. Add automated tests (unit / integration / end-to-end)
5. Add analytics and audit trail for attendance events
6. Add biometric verification as an additional factor

---

## 19) Quick Command Reference

```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on specific platforms
npm run web
npm run android
npm run ios

# Code quality
npm run lint
npm run format
npm run format:check
```

---

## 20) Project Status

**Current status: ✅ Stable demo flow**

- No known lint errors
- Crash-safe processing path with error boundaries
- Beginner-friendly UI feedback at every step
- Mobile and web modes both functional

---

> **Getting started?** Run `npm start`, open the web version (press `w`), navigate to the scanner, enter any text as a QR token, and follow the complete attendance flow from scan → processing → result.
