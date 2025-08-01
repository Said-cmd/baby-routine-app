# Baby Routine App

A mobile app for tracking and predicting a baby’s daily routine, including sleep, feeding, and activity patterns.

## Features

- Track daily baby care events (sleep, feed, diaper, activity)
- Get reminder notifications for key routines
- Visualise trends with charts
- Multi-user support with role-based access
- Local + cloud data storage

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Notifications**: Expo Notifications
- **Charts**: react-native-chart-kit
- **Storage**: Firebase (cloud) & AsyncStorage (local)
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js (v18 or newer recommended)
- npm
- Expo CLI (`npm install -g expo-cli`)

### Installation

```
git clone https://github.com/Said-cmd/baby-routine-app.git
cd baby-routine-app
npm install
```

### Run the App

```
npm run dev
```

This will open the Expo Dev Tools in your browser. You can launch the app on an emulator, a physical device, or the web.

## Folder Structure

```
app/              # Navigation and screen routes
assets/images/    # Icons and image assets
components/       # Reusable UI components
data/             # Static data (e.g. NHS guidance)
hooks/            # Custom React hooks
services/         # Backend and notification logic
types/            # TypeScript interfaces and types
```

## License

This project is for educational and demonstrational purposes only.
