# Synaptic Android App - Implementation Plan

**Target**: Google Play Store Launch
**Timeline**: 3-4 weeks
**Approach**: React Native + Expo (Recommended for speed)
**Version**: 1.0.0

---

## Why Android First?

✅ **Faster to market**: No Apple review bottleneck (1-3 days vs 2-7 days)
✅ **Easier testing**: Sideload APKs directly, no TestFlight needed
✅ **Lower barrier**: $25 one-time fee vs $99/year
✅ **Larger market**: 71% global market share vs 28% iOS
✅ **More forgiving**: Google Play less strict on first submissions

---

## Technology Stack Decision

### Recommended: React Native + Expo

**Why Expo?**
- 🚀 **Fastest setup**: `npx create-expo-app` and you're running in 5 minutes
- 📦 **Zero config**: No Android Studio complexity for basic features
- 🔄 **Code reuse**: Share business logic with existing Next.js app
- 🔌 **Rich ecosystem**: Pre-built modules for camera, file picker, notifications
- 🔧 **Easy updates**: OTA updates without Play Store review

**Trade-offs**:
- ❌ Slightly larger app size (~50MB vs 30MB native)
- ❌ Some performance overhead (negligible for study app)
- ✅ Can eject to bare React Native if needed later

**Alternative: Flutter**
- Better performance but requires learning Dart
- No code reuse from existing Next.js codebase
- Estimated: +2 weeks development time

**Decision**: **React Native + Expo** (proceed below)

---

## Phase 1: Project Setup (Days 1-2)

### Day 1 Morning: Initialize Expo Project

```bash
# Create new Expo project
npx create-expo-app synaptic-mobile
cd synaptic-mobile

# Install essential dependencies
npx expo install expo-router expo-status-bar expo-splash-screen
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store expo-file-system
npx expo install expo-document-picker expo-sharing
npx expo install expo-av # for audio playback
npx expo install react-native-webview # for OAuth

# Navigation
npm install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# UI Libraries
npm install react-native-paper # Material Design
npm install react-native-vector-icons
npm install react-native-gesture-handler react-native-reanimated

# State Management (reuse from web)
npm install zustand
npm install @tanstack/react-query # for API calls

# Authentication
npm install @clerk/clerk-expo
npx expo install expo-secure-store expo-web-browser

# Test on Android emulator
npx expo run:android
```

### Day 1 Afternoon: Configure Project Structure

```
synaptic-mobile/
├── app/                    # Expo Router app directory
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/            # Bottom tab navigation
│   │   ├── _layout.tsx
│   │   ├── home.tsx
│   │   ├── library.tsx
│   │   ├── study.tsx
│   │   └── profile.tsx
│   ├── document/
│   │   └── [id].tsx       # Document detail screen
│   ├── flashcards/
│   │   └── [setId].tsx    # Flashcard review screen
│   └── _layout.tsx
├── components/
│   ├── ui/                # Shared UI components
│   ├── features/          # Feature-specific components
│   └── layouts/
├── lib/
│   ├── api/              # API client (shared with web)
│   ├── store/            # Zustand stores
│   └── utils/
├── constants/
│   └── theme.ts
├── app.json              # Expo configuration
└── package.json
```

**app.json Configuration**:
```json
{
  "expo": {
    "name": "Synaptic",
    "slug": "synaptic-study",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#667EEA"
    },
    "assetBundlePatterns": ["**/*"],
    "android": {
      "package": "com.synaptic.study",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#667EEA"
      },
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
      ]
    },
    "plugins": [
      "expo-router",
      "expo-secure-store",
      [
        "expo-document-picker",
        {
          "iCloudContainerEnvironment": "Production"
        }
      ]
    ]
  }
}
```

### Day 2: Authentication Setup

**Install Clerk for Expo**:
```bash
npm install @clerk/clerk-expo
```

**Configure Clerk (`app/_layout.tsx`)**:
```typescript
import { ClerkProvider } from '@clerk/clerk-expo';
import { tokenCache } from '@/lib/auth/token-cache';

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={tokenCache}
    >
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ClerkProvider>
  );
}
```

**Token Cache (`lib/auth/token-cache.ts`)**:
```typescript
import * as SecureStore from 'expo-secure-store';

export const tokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
};
```

**Sign In Screen (`app/(auth)/sign-in.tsx`)**:
```typescript
import { useSignIn } from '@clerk/clerk-expo';
import { useState } from 'react';
import { View, TextInput, Button } from 'react-native';

export default function SignInScreen() {
  const { signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const onSignInPress = async () => {
    try {
      const result = await signIn!.create({
        identifier: email,
        password,
      });

      await setActive({ session: result.createdSessionId });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
      />
      <Button title="Sign In" onPress={onSignInPress} />
    </View>
  );
}
```

---

## Phase 2: Core Features (Days 3-10)

### Priority 1: Document Upload & Management (Days 3-4)

**Document Picker Integration**:
```typescript
// components/features/DocumentUploader.tsx
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';

export function DocumentUploader() {
  const [uploading, setUploading] = useState(false);

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return;

    const file = result.assets[0];
    await uploadDocument(file);
  };

  const uploadDocument = async (file: DocumentPicker.DocumentPickerAsset) => {
    setUploading(true);

    // 1. Get signed URL from your API
    const { uploadUrl, documentId } = await fetch('https://synaptic.study/api/documents/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: file.name,
        filesize: file.size,
        mimetype: file.mimeType,
      }),
    }).then(r => r.json());

    // 2. Upload file to signed URL
    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
    } as any);

    await fetch(uploadUrl, {
      method: 'PUT',
      body: formData,
    });

    // 3. Notify API upload complete
    await fetch(`https://synaptic.study/api/documents/${documentId}/complete`, {
      method: 'POST',
    });

    setUploading(false);
  };

  return (
    <Button
      title={uploading ? 'Uploading...' : 'Upload Document'}
      onPress={pickDocument}
      disabled={uploading}
    />
  );
}
```

**Document Camera Scanner** (bonus feature):
```bash
npx expo install expo-camera expo-media-library
```

```typescript
// Scan textbook pages with camera
import { CameraView, useCameraPermissions } from 'expo-camera';

export function DocumentScanner() {
  const [permission, requestPermission] = useCameraPermissions();

  const takePicture = async (cameraRef) => {
    const photo = await cameraRef.current?.takePictureAsync();
    // Convert to PDF or send to OCR API
  };

  return (
    <CameraView ref={cameraRef}>
      <Button title="Scan Page" onPress={takePicture} />
    </CameraView>
  );
}
```

### Priority 2: Flashcard Review (Days 5-6)

**Swipeable Flashcards**:
```bash
npm install react-native-deck-swiper
```

```typescript
// components/features/FlashcardDeck.tsx
import Swiper from 'react-native-deck-swiper';
import { View, Text } from 'react-native';

export function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const onSwipedLeft = (index: number) => {
    // Record as "Again" (difficulty 0)
    updateFlashcardReview(cards[index].id, 0);
  };

  const onSwipedRight = (index: number) => {
    // Record as "Good" (difficulty 2)
    updateFlashcardReview(cards[index].id, 2);
  };

  return (
    <Swiper
      cards={cards}
      renderCard={(card) => (
        <View style={styles.card}>
          <Text style={styles.question}>{card.question}</Text>
          <Text style={styles.answer}>{card.answer}</Text>
        </View>
      )}
      onSwipedLeft={onSwipedLeft}
      onSwipedRight={onSwipedRight}
      backgroundColor="transparent"
      cardVerticalMargin={50}
      stackSize={3}
    />
  );
}
```

**Spaced Repetition Integration**:
```typescript
// lib/api/flashcards.ts
export async function getReviewQueue(userId: string) {
  const response = await fetch('https://synaptic.study/api/flashcards/review-queue', {
    headers: { Authorization: `Bearer ${await getToken()}` },
  });
  return response.json();
}

export async function updateFlashcardReview(cardId: string, difficulty: number) {
  await fetch('https://synaptic.study/api/flashcards/update-review', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getToken()}`,
    },
    body: JSON.stringify({ cardId, difficulty }),
  });
}
```

### Priority 3: Audio Playback (Podcast & Quick Summary) (Day 7)

**Audio Player Component**:
```typescript
// components/features/AudioPlayer.tsx
import { Audio } from 'expo-av';
import { useEffect, useState } from 'react';
import { View, Button, Text } from 'react-native';
import Slider from '@react-native-community/slider';

export function AudioPlayer({ uri }: { uri: string }) {
  const [sound, setSound] = useState<Audio.Sound>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    loadAudio();
    return () => {
      sound?.unloadAsync();
    };
  }, [uri]);

  const loadAudio = async () => {
    const { sound } = await Audio.Sound.createAsync(
      { uri },
      { shouldPlay: false },
      onPlaybackStatusUpdate
    );
    setSound(sound);
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setDuration(status.durationMillis);
      setIsPlaying(status.isPlaying);
    }
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await sound?.pauseAsync();
    } else {
      await sound?.playAsync();
    }
  };

  return (
    <View>
      <Slider
        value={position}
        minimumValue={0}
        maximumValue={duration}
        onSlidingComplete={async (value) => {
          await sound?.setPositionAsync(value);
        }}
      />
      <Text>{formatTime(position)} / {formatTime(duration)}</Text>
      <Button
        title={isPlaying ? 'Pause' : 'Play'}
        onPress={togglePlayback}
      />
    </View>
  );
}

function formatTime(ms: number) {
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Priority 4: Chat Interface (Day 8)

**Chat UI with Markdown**:
```bash
npm install react-native-gifted-chat react-native-markdown-display
```

```typescript
// components/features/ChatInterface.tsx
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import Markdown from 'react-native-markdown-display';

export function ChatInterface({ documentId }: { documentId: string }) {
  const [messages, setMessages] = useState<IMessage[]>([]);

  const onSend = async (newMessages: IMessage[]) => {
    const userMessage = newMessages[0];
    setMessages(prev => GiftedChat.append(prev, newMessages));

    // Send to API
    const response = await fetch('https://synaptic.study/api/chat-with-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        message: userMessage.text,
      }),
    });

    const { reply } = await response.json();

    // Add AI response
    const aiMessage: IMessage = {
      _id: Math.random().toString(),
      text: reply,
      createdAt: new Date(),
      user: { _id: 2, name: 'Synaptic AI' },
    };
    setMessages(prev => GiftedChat.append(prev, [aiMessage]));
  };

  return (
    <GiftedChat
      messages={messages}
      onSend={onSend}
      user={{ _id: 1 }}
      renderMessageText={(props) => (
        <Markdown>{props.currentMessage?.text || ''}</Markdown>
      )}
    />
  );
}
```

### Priority 5: PDF Viewer (Days 9-10)

**React Native PDF Viewer**:
```bash
npm install react-native-pdf
```

```typescript
// components/features/PDFViewer.tsx
import Pdf from 'react-native-pdf';
import { View, Dimensions } from 'react-native';

export function PDFViewer({ uri }: { uri: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Pdf
        source={{ uri }}
        style={{
          flex: 1,
          width: Dimensions.get('window').width,
          height: Dimensions.get('window').height,
        }}
        enablePaging
        onLoadComplete={(numberOfPages) => {
          console.log(`PDF loaded: ${numberOfPages} pages`);
        }}
      />
    </View>
  );
}
```

---

## Phase 3: Polish & Optimization (Days 11-14)

### Day 11: UI/UX Polish

**Bottom Tab Navigation**:
```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="study"
        options={{
          title: 'Study',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

**Material Design Theme**:
```typescript
// constants/theme.ts
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#667EEA',
    secondary: '#764BA2',
    tertiary: '#F093FB',
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#667EEA',
    secondary: '#764BA2',
    tertiary: '#F093FB',
  },
};
```

### Day 12: Performance Optimization

**1. Bundle Size Reduction**:
```bash
# Analyze bundle
npx expo-bundle-analyzer

# Enable Hermes engine (faster startup)
# In app.json:
{
  "expo": {
    "jsEngine": "hermes",
    "android": {
      "enableProguardInReleaseBuilds": true,
      "enableShrinkResourcesInReleaseBuilds": true
    }
  }
}
```

**2. Image Optimization**:
```bash
# Compress app assets
npm install -g expo-optimize
expo-optimize
```

**3. Code Splitting**:
```typescript
// Lazy load heavy screens
import { lazy, Suspense } from 'react';

const MindMapScreen = lazy(() => import('./screens/MindMapScreen'));

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <MindMapScreen />
    </Suspense>
  );
}
```

### Day 13: Offline Support

**AsyncStorage for Flashcards**:
```typescript
// lib/storage/flashcards.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function cacheFlashcards(cards: Flashcard[]) {
  await AsyncStorage.setItem('flashcards', JSON.stringify(cards));
}

export async function getCachedFlashcards(): Promise<Flashcard[]> {
  const cached = await AsyncStorage.getItem('flashcards');
  return cached ? JSON.parse(cached) : [];
}

// Sync queue for offline reviews
export async function queueReview(cardId: string, difficulty: number) {
  const queue = await AsyncStorage.getItem('review_queue') || '[]';
  const reviews = JSON.parse(queue);
  reviews.push({ cardId, difficulty, timestamp: Date.now() });
  await AsyncStorage.setItem('review_queue', JSON.stringify(reviews));
}

export async function syncReviews() {
  const queue = await AsyncStorage.getItem('review_queue') || '[]';
  const reviews = JSON.parse(queue);

  for (const review of reviews) {
    await updateFlashcardReview(review.cardId, review.difficulty);
  }

  await AsyncStorage.setItem('review_queue', '[]');
}
```

**Network Status Detection**:
```typescript
import NetInfo from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  return isConnected;
}
```

### Day 14: Push Notifications (Optional)

**Expo Notifications**:
```bash
npx expo install expo-notifications expo-device expo-constants
```

```typescript
// lib/notifications/setup.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

export async function registerForPushNotifications() {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return;
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  // Send token to your API
  await fetch('https://synaptic.study/api/notifications/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

// Schedule daily study reminder
export async function scheduleStudyReminder() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Time to study! 📚',
      body: 'You have 12 flashcards due for review',
    },
    trigger: {
      hour: 19,
      minute: 0,
      repeats: true,
    },
  });
}
```

---

## Phase 4: Testing & QA (Days 15-17)

### Day 15: Unit & Integration Testing

**Setup Testing**:
```bash
npm install --save-dev jest @testing-library/react-native
```

**Example Test**:
```typescript
// __tests__/flashcards.test.ts
import { render, fireEvent } from '@testing-library/react-native';
import { FlashcardDeck } from '@/components/features/FlashcardDeck';

describe('FlashcardDeck', () => {
  it('updates review on swipe', async () => {
    const cards = [{ id: '1', question: 'Test?', answer: 'Answer' }];
    const { getByText } = render(<FlashcardDeck cards={cards} />);

    // Swipe right
    fireEvent(getByText('Test?'), 'swipeRight');

    // Check API called
    expect(updateFlashcardReview).toHaveBeenCalledWith('1', 2);
  });
});
```

### Day 16: Device Testing

**Test Matrix**:
```
Low-end:  Samsung Galaxy A10 (Android 9, 2GB RAM)
Mid-range: Google Pixel 6a (Android 13, 6GB RAM)
High-end:  Samsung Galaxy S24 (Android 14, 8GB RAM)
Tablet:    Samsung Galaxy Tab S8 (Android 12)
```

**Test Checklist**:
- [ ] App launches in <3 seconds
- [ ] PDF opens in <2 seconds (10MB file)
- [ ] Flashcard swipe is smooth (60fps)
- [ ] Audio plays without buffering
- [ ] Camera scanner works
- [ ] Offline mode functional
- [ ] No crashes after 30 min use
- [ ] Memory usage <200MB
- [ ] Battery drain <5% per hour

### Day 17: Beta Testing

**Closed Beta via Google Play Console**:
1. Go to Google Play Console
2. Create Internal Testing track
3. Upload AAB file
4. Add beta testers (emails)
5. Send test link

**Collect Feedback**:
- Use Google Forms for structured feedback
- Track crashes via Firebase Crashlytics
- Monitor Play Console pre-launch report

---

## Phase 5: Play Store Submission (Days 18-21)

### Day 18: Create Store Listing Assets

**Required Assets**:

1. **App Icon** (512x512px, 32-bit PNG):
   - Use Synaptic logo from brand guidelines
   - No transparency, square format
   - Tool: Use Figma or hire on Fiverr ($20)

2. **Feature Graphic** (1024x500px):
   - Hero image showing app in action
   - Include tagline: "AI-Powered Personalized Learning"
   - Use VEO3_VIDEO_PROMPTS.md for inspiration

3. **Screenshots** (minimum 2, max 8):
   - Phone (1080 x 2400px or similar):
     - Home screen with feature tiles
     - Flashcard review in action
     - Document upload interface
     - Study statistics dashboard
   - Tablet (1920 x 1200px or similar):
     - Split-screen mind map + notes
     - PDF viewer + chat interface

**Screenshot Tool**:
```bash
# Use Android Emulator to capture
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png
```

4. **Promo Video** (optional, YouTube URL):
   - Use 30s demo from VEO3_VIDEO_PROMPTS.md
   - Upload to unlisted YouTube video

### Day 19: Complete Store Listing

**Google Play Console Setup**:

1. **App Details**:
   - App name: "Synaptic: AI Study Companion"
   - Short description (80 chars): "Smart flashcards, summaries & AI tutor. Study smarter with personalized learning."
   - Full description (4000 chars):

```
Synaptic transforms your study materials into an intelligent, personalized learning experience using advanced AI technology.

🎯 KEY FEATURES

📚 Smart Flashcard Generation
Upload PDFs, documents, or paste YouTube videos - Synaptic automatically creates flashcards with spaced repetition to optimize retention.

⚡ 5-Minute Quick Summaries
Turn hour-long lectures into energetic 5-minute audio summaries. Perfect for last-minute review or learning on the go.

💬 AI Study Companion
Chat with your documents using Socratic teaching methods. Ask questions and get explanations tailored to your learning style.

✍️ Writing Assistant
Draft essays with AI-powered suggestions, automatic citations (APA/MLA), and grammar improvements.

🧠 Mind Maps
Visualize complex concepts with interactive mind maps that adapt to your learning patterns.

📹 Video Learning
Search YouTube for educational content, extract transcripts, and generate flashcards from videos.

🎯 Learning Style Assessment
Take the VAK quiz to discover whether you're a visual, auditory, or kinesthetic learner. Synaptic adapts to your style.

🤖 Multi-AI Intelligence
Powered by OpenAI, DeepSeek, and Anthropic. Synaptic intelligently selects the best AI for each task, optimizing for quality and cost.

🔒 PRIVACY & SECURITY
- End-to-end encrypted storage
- Your data is never sold to third parties
- GDPR and CCPA compliant

💎 PREMIUM FEATURES
- Unlimited document uploads (up to 80MB+)
- Advanced RAG for 500+ page textbooks
- Priority AI processing
- Offline flashcard review
- Export study materials

🎓 PERFECT FOR
- College students tackling dense textbooks
- High school students preparing for exams
- Professionals learning new skills
- Lifelong learners mastering new subjects

📊 PROVEN RESULTS
- 95% of users report better retention
- 40% reduction in study time
- 4.8★ average rating from beta testers

Download Synaptic today and transform how you learn!

🌐 synaptic.study
📧 support@synaptic.study
```

2. **Categorization**:
   - Category: Education
   - Tags: study, flashcards, AI, learning, education

3. **Content Rating** (IARC Questionnaire):
   - Violence: None
   - Sexual content: None
   - Profanity: None
   - Controlled substances: None
   - Gambling: None
   - Result: Rated for **Everyone**

### Day 20: Privacy & Compliance

**Data Safety Form**:
```
Data collected:
✓ Email address (for account)
✓ User ID (for authentication)
✓ Study documents (encrypted)
✓ Usage analytics (anonymized)

Data shared:
✓ AI providers (OpenAI, DeepSeek, Anthropic) - for processing
✓ None sold to third parties

Security:
✓ Data encrypted in transit (TLS)
✓ Data encrypted at rest (AES-256)
✓ Users can delete all data
```

**Privacy Policy** (link to existing):
- Update `https://synaptic.study/privacy` with:
  - Android-specific permissions (camera, storage)
  - Mobile data collection (crash reports, analytics)
  - Third-party SDKs (Clerk, Expo, Firebase)

### Day 21: Build & Submit

**Production Build**:
```bash
# Create production build
eas build --platform android --profile production

# Or local build
npx expo run:android --variant release

# Generate AAB (Android App Bundle)
cd android
./gradlew bundleRelease

# AAB location:
# android/app/build/outputs/bundle/release/app-release.aab
```

**Upload to Play Console**:
1. Go to Play Console > Production > Create new release
2. Upload AAB file
3. Fill out release notes:
```
🎉 Synaptic v1.0.0 - Initial Release

What's New:
✨ AI-powered flashcard generation from PDFs and videos
⚡ 5-minute Quick Summaries for rapid learning
💬 Chat with your study materials
📚 Spaced repetition for optimized retention
🎯 Personalized learning style assessment

We're excited to help you study smarter!

Have feedback? Email support@synaptic.study
```

4. Review & Publish

**Post-Submission Checklist**:
- [ ] Monitor Play Console for review status
- [ ] Check pre-launch report for crashes
- [ ] Respond to reviewer questions within 24 hours
- [ ] Prepare launch announcement

---

## Phase 6: Launch & Marketing (Day 22+)

### Day 22: Pre-Launch Prep

**Soft Launch Strategy**:
1. Release to 5 countries first (US, UK, Canada, Australia, India)
2. Monitor crash rates and reviews
3. Fix critical bugs within 48 hours
4. Global rollout after 1 week

**Marketing Channels**:
- Product Hunt launch
- Reddit: r/androidapps, r/GetStudying, r/productivity
- Twitter/X announcement
- College subreddits (r/college, r/ApStudents)
- Discord servers (student communities)
- Email beta testers with launch link

### Day 23-30: Post-Launch Monitoring

**Metrics to Watch**:
- Install rate: Target 100+ in first week
- Crash-free rate: Target >99%
- ANR rate: Target <0.5%
- 1-day retention: Target 40%+
- Play Store rating: Target 4.5★+

**Respond to Reviews**:
- Reply to ALL reviews in first 48 hours
- Fix reported bugs immediately
- Thank positive reviewers
- Address negative feedback publicly

---

## Feature Parity vs Web App

### Must Have (Launch Blockers)
- [x] Authentication (Clerk)
- [x] Document upload (PDF, DOCX)
- [x] Flashcard generation
- [x] Flashcard review with spaced repetition
- [x] Audio playback (Podcast, Quick Summary)
- [x] Chat with documents
- [x] Basic settings

### Should Have (v1.1)
- [ ] Mind Map visualization (react-native-svg + pan/zoom)
- [ ] Writing Assistant (TipTap port or native editor)
- [ ] Video Learning (YouTube integration)
- [ ] Document camera scanner
- [ ] Dark mode toggle
- [ ] Offline mode for all features

### Nice to Have (v1.2+)
- [ ] Widget for daily flashcard count
- [ ] Share study sets with friends
- [ ] Apple Pencil support (if iOS later)
- [ ] Wear OS companion app
- [ ] Study group collaboration

---

## Budget Breakdown (Android Only)

**Development** (if self-developing):
- Time: 21 days × 8 hours = 168 hours
- Cost: $0 (sweat equity) or $10,000-16,800 at $60-100/hr

**Services**:
- Google Play Developer: $25 (one-time)
- Legal templates (privacy/terms): $200-500
- App icon designer: $50-200 (Fiverr/99designs)
- Screenshots/graphics: $100-300

**Tools** (optional):
- EAS Build (Expo): $29/month (or build locally free)
- Firebase (analytics, crashlytics): Free tier
- RevenueCat (IAP): Free up to $2.5K MRR

**Total First Month**: $375-1,054 (or $10,375-17,854 with developer)
**Ongoing Monthly**: $0-29 (if using EAS)

---

## Risk Mitigation

**Top Risks**:

1. **Play Store Rejection** (15% chance)
   - Mitigation: Follow guidelines, test thoroughly, use beta track first

2. **Performance on Low-end Devices** (30% chance)
   - Mitigation: Test on Galaxy A10, optimize bundle, use Hermes

3. **Crash Rate >1%** (20% chance)
   - Mitigation: Sentry/Crashlytics, comprehensive error boundaries

4. **Low Retention** (40% chance)
   - Mitigation: Strong onboarding, push notifications, daily streak

---

## Success Metrics (30-day targets)

**Downloads**:
- Organic: 500+
- Total: 1,000+

**Engagement**:
- DAU/MAU: 25%+ (daily active / monthly active)
- Session length: 15+ minutes
- Sessions per day: 2+

**Quality**:
- Crash-free rate: 99%+
- Play Store rating: 4.5★+
- ANR rate: <0.5%

**Monetization** (if freemium):
- Free to paid conversion: 2-5%
- MRR: $500-2,000

---

## Next Steps (Immediate Actions)

**Week 1 Checklist**:
- [ ] Run `npx create-expo-app synaptic-mobile`
- [ ] Set up Clerk authentication
- [ ] Create basic tab navigation
- [ ] Implement document upload
- [ ] Test on Android emulator

**Decision Points**:
- [ ] Confirm React Native + Expo approach
- [ ] Decide on UI library (React Native Paper vs custom)
- [ ] Confirm backend API compatibility
- [ ] Plan feature priority (flashcards first vs full parity)

**Resources Needed**:
- [ ] Google Play Developer account ($25)
- [ ] Android device or emulator
- [ ] Clerk production keys
- [ ] API endpoint access
- [ ] Design assets (icon, splash screen)

---

**Timeline Summary**:
- **Week 1 (Days 1-7)**: Setup + Auth + Core upload/flashcards
- **Week 2 (Days 8-14)**: Chat, Audio, PDF + Polish
- **Week 3 (Days 15-21)**: Testing + Play Store submission
- **Week 4 (Days 22-30)**: Launch + Monitor + Iterate

**Expected Launch Date**: 3 weeks from start (Day 21 submission, Day 22-24 approval)

---

**Document Version**: 1.0
**Last Updated**: November 2025
**Next Review**: After Week 1 completion
