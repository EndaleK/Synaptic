---
name: mobile-app-dev
description: Comprehensive mobile app development skill for React Native, Expo, Flutter, and native iOS/Android development. Use when Claude needs to build, debug, test, or deploy mobile applications, set up mobile development environments, implement navigation/state management, integrate native modules, troubleshoot build errors, or work with platform-specific code. Covers cross-platform and native development workflows.
---

# Mobile App Development

## Quick Framework Selection

| Need | Recommendation |
|------|----------------|
| Fastest prototyping | Expo (managed) |
| Production cross-platform | React Native CLI or Flutter |
| Maximum native control | Native Swift/Kotlin |
| Web + Mobile code sharing | Expo with Expo Router |

## Project Initialization

### Expo (Recommended for most cases)
```bash
npx create-expo-app@latest my-app --template blank-typescript
cd my-app && npx expo start
```

### React Native CLI
```bash
npx @react-native-community/cli init MyApp --template react-native-template-typescript
cd MyApp
npx react-native run-ios  # or run-android
```

### Flutter
```bash
flutter create --org com.example my_app -t app --platforms ios,android
cd my_app && flutter run
```

## Core Development Workflows

### Build & Run Commands

**Expo:**
```bash
npx expo start                    # Dev server
npx expo start --ios              # iOS simulator
npx expo start --android          # Android emulator
npx expo run:ios --device         # Physical device
eas build --platform ios          # Production build
```

**React Native:**
```bash
npx react-native start            # Metro bundler
npx react-native run-ios          # iOS
npx react-native run-android      # Android
cd ios && pod install             # After adding native deps
```

**Flutter:**
```bash
flutter run                       # Debug mode
flutter run --release             # Release mode
flutter build ios                 # iOS archive
flutter build appbundle           # Android AAB
```

### Debug Workflow

1. Check terminal for build errors first
2. Use `npx react-native log-ios` or `adb logcat` for runtime logs
3. Enable Hot Reload for fast iteration
4. Use React DevTools or Flutter DevTools for component inspection

## Architecture Patterns

### Navigation Setup

**React Native (React Navigation):**
```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Details" component={DetailsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Expo Router (File-based):**
```
app/
├── _layout.tsx      # Root layout
├── index.tsx        # Home (/)
├── settings.tsx     # /settings
└── [id].tsx         # Dynamic route /[id]
```

### State Management

For complex state, prefer:
- **React Native**: Zustand (simple), Redux Toolkit (complex), or TanStack Query (server state)
- **Flutter**: Riverpod or Bloc

```typescript
// Zustand store example
import { create } from 'zustand';

interface AppState {
  user: User | null;
  setUser: (user: User) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
```

## Platform-Specific Code

### React Native Platform Detection
```typescript
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    ...Platform.select({
      ios: { shadowColor: '#000' },
      android: { elevation: 4 },
    }),
  },
});
```

### File-based Platform Code
```
Button.tsx          # Shared
Button.ios.tsx      # iOS-specific
Button.android.tsx  # Android-specific
```

## Common Issues & Solutions

### iOS Build Failures
```bash
cd ios && rm -rf Pods Podfile.lock build
pod install --repo-update
cd .. && npx react-native run-ios
```

### Android Build Failures
```bash
cd android && ./gradlew clean
cd .. && npx react-native run-android
```

### Metro Bundler Issues
```bash
npx react-native start --reset-cache
# or for Expo
npx expo start -c
```

### Dependency Conflicts
```bash
npx react-native doctor
# or
npx expo-doctor
```

## Reference Guides

For detailed framework-specific patterns:
- **React Native/Expo**: See [references/react-native.md](references/react-native.md)
- **Flutter**: See [references/flutter.md](references/flutter.md)
- **Native iOS/Android**: See [references/native.md](references/native.md)
- **Testing strategies**: See [references/testing.md](references/testing.md)

## Deployment Checklist

### Pre-release
- [ ] App icons for all sizes
- [ ] Splash screen configured
- [ ] Environment variables secured
- [ ] Performance profiling completed
- [ ] Offline behavior tested

### iOS App Store
1. Configure signing in Xcode or EAS
2. Create App Store Connect listing
3. Submit for review with screenshots

### Google Play
1. Generate signed AAB
2. Create Play Console listing
3. Upload AAB and submit for review
