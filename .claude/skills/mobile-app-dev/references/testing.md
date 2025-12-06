# Mobile App Testing Reference

## Testing Pyramid

```
        /\
       /  \        E2E Tests (Detox, Maestro)
      /----\       - Critical user journeys
     /      \      - Slow, expensive
    /--------\
   /          \    Integration Tests
  /------------\   - Component interactions
 /              \  - API mocking
/----------------\ Unit Tests
                   - Business logic
                   - Fast, isolated
```

## React Native Testing

### Unit Testing (Jest)
```typescript
// utils.test.ts
import { formatCurrency, validateEmail } from '../utils';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(1234.56, 'USD')).toBe('$1,234.56');
  });

  it('handles zero', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});

describe('validateEmail', () => {
  it.each([
    ['test@example.com', true],
    ['invalid-email', false],
    ['', false],
  ])('validates %s as %s', (email, expected) => {
    expect(validateEmail(email)).toBe(expected);
  });
});
```

### Component Testing (React Native Testing Library)
```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../LoginScreen';

describe('LoginScreen', () => {
  const mockOnLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders email and password inputs', () => {
    const { getByPlaceholderText } = render(
      <LoginScreen onLogin={mockOnLogin} />
    );

    expect(getByPlaceholderText('Email')).toBeTruthy();
    expect(getByPlaceholderText('Password')).toBeTruthy();
  });

  it('calls onLogin with credentials when form is submitted', async () => {
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen onLogin={mockOnLogin} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockOnLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows error message for invalid email', async () => {
    const { getByPlaceholderText, getByText, findByText } = render(
      <LoginScreen onLogin={mockOnLogin} />
    );

    fireEvent.changeText(getByPlaceholderText('Email'), 'invalid');
    fireEvent.press(getByText('Sign In'));

    expect(await findByText('Please enter a valid email')).toBeTruthy();
  });
});
```

### Hook Testing
```typescript
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  it('starts in logged out state', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('logs in user successfully', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isLoggedIn).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
  });
});
```

### Mocking APIs (MSW)
```typescript
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer(
  http.get('/api/user', () => {
    return HttpResponse.json({ id: '1', name: 'John Doe' });
  }),
  http.post('/api/login', async ({ request }) => {
    const body = await request.json();
    if (body.email === 'test@example.com') {
      return HttpResponse.json({ token: 'fake-token' });
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### E2E Testing (Detox)
```typescript
// e2e/login.test.ts
describe('Login Flow', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should login successfully with valid credentials', async () => {
    await element(by.id('email-input')).typeText('test@example.com');
    await element(by.id('password-input')).typeText('password123');
    await element(by.id('login-button')).tap();

    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should show error for invalid credentials', async () => {
    await element(by.id('email-input')).typeText('wrong@example.com');
    await element(by.id('password-input')).typeText('wrongpassword');
    await element(by.id('login-button')).tap();

    await expect(element(by.text('Invalid credentials'))).toBeVisible();
  });
});
```

---

## Flutter Testing

### Unit Tests
```dart
// test/utils_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/utils/validators.dart';

void main() {
  group('Email Validator', () {
    test('returns true for valid email', () {
      expect(isValidEmail('test@example.com'), true);
    });

    test('returns false for invalid email', () {
      expect(isValidEmail('invalid-email'), false);
      expect(isValidEmail(''), false);
    });
  });

  group('formatCurrency', () {
    test('formats USD correctly', () {
      expect(formatCurrency(1234.56, 'USD'), '\$1,234.56');
    });
  });
}
```

### Widget Tests
```dart
// test/widgets/login_screen_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:my_app/screens/login_screen.dart';

class MockAuthService extends Mock implements AuthService {}

void main() {
  late MockAuthService mockAuthService;

  setUp(() {
    mockAuthService = MockAuthService();
  });

  testWidgets('renders email and password fields', (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: mockAuthService)),
    );

    expect(find.byType(TextField), findsNWidgets(2));
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
  });

  testWidgets('calls login when form is submitted', (tester) async {
    when(() => mockAuthService.login(any(), any()))
        .thenAnswer((_) async => User(id: '1', email: 'test@example.com'));

    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: mockAuthService)),
    );

    await tester.enterText(find.byKey(Key('email-field')), 'test@example.com');
    await tester.enterText(find.byKey(Key('password-field')), 'password123');
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();

    verify(() => mockAuthService.login('test@example.com', 'password123')).called(1);
  });

  testWidgets('shows loading indicator during login', (tester) async {
    when(() => mockAuthService.login(any(), any()))
        .thenAnswer((_) async {
          await Future.delayed(Duration(seconds: 2));
          return User(id: '1', email: 'test@example.com');
        });

    await tester.pumpWidget(
      MaterialApp(home: LoginScreen(authService: mockAuthService)),
    );

    await tester.enterText(find.byKey(Key('email-field')), 'test@example.com');
    await tester.enterText(find.byKey(Key('password-field')), 'password123');
    await tester.tap(find.byType(ElevatedButton));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
```

### Integration Tests
```dart
// integration_test/app_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('end-to-end test', () {
    testWidgets('login and view profile', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Login
      await tester.enterText(find.byKey(Key('email-field')), 'test@example.com');
      await tester.enterText(find.byKey(Key('password-field')), 'password123');
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      // Verify home screen
      expect(find.text('Welcome'), findsOneWidget);

      // Navigate to profile
      await tester.tap(find.byIcon(Icons.person));
      await tester.pumpAndSettle();

      expect(find.text('Profile'), findsOneWidget);
    });
  });
}
```

### Running Tests
```bash
# Flutter
flutter test                           # All unit/widget tests
flutter test test/widgets/             # Specific directory
flutter test --coverage                # With coverage
flutter drive --target=integration_test/app_test.dart  # Integration

# React Native
npm test                               # Jest tests
npm test -- --coverage                 # With coverage
npx detox test -c ios.sim.debug       # E2E tests
```

---

## E2E Testing with Maestro

### Installation
```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

### Test Flow (YAML)
```yaml
# .maestro/login-flow.yaml
appId: com.example.myapp
---
- launchApp
- tapOn: "Sign In"
- tapOn:
    id: "email-input"
- inputText: "test@example.com"
- tapOn:
    id: "password-input"
- inputText: "password123"
- tapOn: "Submit"
- assertVisible: "Welcome"
```

### Run Maestro Tests
```bash
maestro test .maestro/login-flow.yaml
maestro test .maestro/  # Run all flows
maestro studio          # Interactive mode
```

## Test Configuration Files

### Jest (jest.config.js)
```javascript
module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation)/)',
  ],
  moduleNameMapper: {
    '^@/(.*): '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
};
```

### Detox (.detoxrc.js)
```javascript
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/MyApp.app',
      build: 'xcodebuild -workspace ios/MyApp.xcworkspace -scheme MyApp -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: { type: 'iPhone 15' },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
  },
};
```
