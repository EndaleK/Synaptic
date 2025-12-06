# React Native & Expo Reference

## Project Structure

### Expo Router Project
```
my-app/
├── app/
│   ├── _layout.tsx          # Root layout (providers, navigation)
│   ├── index.tsx            # Home screen (/)
│   ├── (tabs)/              # Tab group
│   │   ├── _layout.tsx      # Tab navigator config
│   │   ├── home.tsx         # /home tab
│   │   └── profile.tsx      # /profile tab
│   ├── (auth)/              # Auth flow group
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── [id].tsx             # Dynamic route
├── components/
│   ├── ui/                  # Reusable UI components
│   └── features/            # Feature-specific components
├── hooks/                   # Custom hooks
├── lib/                     # Utilities, API clients
├── stores/                  # State management
├── constants/               # Theme, config values
└── assets/                  # Images, fonts
```

### React Native CLI Project
```
MyApp/
├── src/
│   ├── screens/
│   ├── components/
│   ├── navigation/
│   ├── services/
│   ├── hooks/
│   └── utils/
├── ios/
├── android/
├── index.js
└── App.tsx
```

## Navigation Patterns

### Stack Navigation with Types
```typescript
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Details: { itemId: number; title: string };
  Profile: { userId: string };
};

type HomeProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type DetailsProps = NativeStackScreenProps<RootStackParamList, 'Details'>;

function DetailsScreen({ route, navigation }: DetailsProps) {
  const { itemId, title } = route.params;
  return (
    <View>
      <Text>{title}</Text>
      <Button onPress={() => navigation.goBack()} title="Go Back" />
    </View>
  );
}
```

### Tab Navigation
```typescript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconName = route.name === 'Home'
            ? (focused ? 'home' : 'home-outline')
            : (focused ? 'settings' : 'settings-outline');
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
```

### Deep Linking
```typescript
// app.json for Expo
{
  "expo": {
    "scheme": "myapp",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "myapp" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

## Component Patterns

### Functional Component with TypeScript
```typescript
interface CardProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  children: React.ReactNode;
}

export function Card({ title, subtitle, onPress, children }: CardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </Pressable>
  );
}
```

### Custom Hook Pattern
```typescript
function useApi<T>(endpoint: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(endpoint);
        const json = await response.json();
        setData(json);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [endpoint]);

  return { data, loading, error };
}
```

## Styling Approaches

### StyleSheet (Recommended)
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});
```

### NativeWind (Tailwind for RN)
```bash
npm install nativewind tailwindcss
npx tailwindcss init
```
```typescript
// tailwind.config.js
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
};

// Usage
<View className="flex-1 p-4 bg-white">
  <Text className="text-lg font-semibold text-gray-900">Hello</Text>
</View>
```

## API Integration

### Fetch with Error Handling
```typescript
async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}
```

### TanStack Query Setup
```typescript
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  });
}
```

## Native Modules

### Expo Config Plugins
```javascript
// app.config.js
export default {
  expo: {
    plugins: [
      ["expo-camera", { cameraPermission: "Allow access to camera" }],
      ["expo-location", { locationWhenInUsePermission: "Allow location access" }],
    ],
  },
};
```

### React Native Linking (for native features)
```typescript
import { Linking } from 'react-native';

// Open URL
Linking.openURL('https://example.com');

// Open phone
Linking.openURL('tel:+1234567890');

// Open maps
const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
Linking.openURL(`${scheme}${address}`);
```

## Performance Optimization

### List Optimization
```typescript
<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={(item) => item.id}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  removeClippedSubviews={true}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Memoization
```typescript
const MemoizedComponent = React.memo(ExpensiveComponent);

const memoizedValue = useMemo(() => computeExpensive(a, b), [a, b]);

const memoizedCallback = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

## Common Expo Packages

```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context

# Storage
npx expo install @react-native-async-storage/async-storage
npx expo install expo-secure-store

# Media
npx expo install expo-camera expo-image-picker expo-av

# Location
npx expo install expo-location

# Notifications
npx expo install expo-notifications

# Auth
npx expo install expo-auth-session expo-web-browser
```
