# Native iOS & Android Reference

## iOS Development (Swift/SwiftUI)

### Project Structure
```
MyApp/
├── MyApp/
│   ├── App/
│   │   ├── MyAppApp.swift      # Entry point
│   │   └── ContentView.swift
│   ├── Features/
│   │   ├── Auth/
│   │   │   ├── Views/
│   │   │   ├── ViewModels/
│   │   │   └── Models/
│   │   └── Home/
│   ├── Core/
│   │   ├── Network/
│   │   ├── Storage/
│   │   └── Extensions/
│   ├── Resources/
│   │   └── Assets.xcassets
│   └── Info.plist
├── MyAppTests/
└── MyApp.xcodeproj
```

### SwiftUI View Pattern
```swift
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()
    @State private var showSettings = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                AsyncImage(url: viewModel.avatarURL) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    ProgressView()
                }
                .frame(width: 100, height: 100)
                .clipShape(Circle())

                Text(viewModel.name)
                    .font(.title2)
                    .fontWeight(.semibold)

                Button("Edit Profile") {
                    showSettings = true
                }
                .buttonStyle(.borderedProminent)
            }
            .navigationTitle("Profile")
            .sheet(isPresented: $showSettings) {
                SettingsView()
            }
        }
        .task {
            await viewModel.loadProfile()
        }
    }
}
```

### ViewModel Pattern
```swift
@MainActor
class ProfileViewModel: ObservableObject {
    @Published var name: String = ""
    @Published var avatarURL: URL?
    @Published var isLoading = false
    @Published var error: Error?

    private let userService: UserServiceProtocol

    init(userService: UserServiceProtocol = UserService()) {
        self.userService = userService
    }

    func loadProfile() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let user = try await userService.getCurrentUser()
            name = user.name
            avatarURL = user.avatarURL
        } catch {
            self.error = error
        }
    }
}
```

### Networking
```swift
protocol APIClient {
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}

class URLSessionAPIClient: APIClient {
    private let session: URLSession
    private let decoder: JSONDecoder

    init(session: URLSession = .shared) {
        self.session = session
        self.decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
    }

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let (data, response) = try await session.data(for: endpoint.urlRequest)

        guard let httpResponse = response as? HTTPURLResponse,
              200...299 ~= httpResponse.statusCode else {
            throw APIError.invalidResponse
        }

        return try decoder.decode(T.self, from: data)
    }
}
```

### Common iOS Commands
```bash
# Pod install
cd ios && pod install --repo-update

# Clean build
xcodebuild clean -workspace MyApp.xcworkspace -scheme MyApp

# Build for simulator
xcodebuild -workspace MyApp.xcworkspace -scheme MyApp -sdk iphonesimulator

# Archive for release
xcodebuild archive -workspace MyApp.xcworkspace -scheme MyApp -archivePath build/MyApp.xcarchive
```

---

## Android Development (Kotlin/Jetpack Compose)

### Project Structure
```
app/
├── src/main/
│   ├── java/com/example/myapp/
│   │   ├── MyApplication.kt
│   │   ├── MainActivity.kt
│   │   ├── ui/
│   │   │   ├── theme/
│   │   │   ├── screens/
│   │   │   └── components/
│   │   ├── data/
│   │   │   ├── repository/
│   │   │   ├── remote/
│   │   │   └── local/
│   │   ├── domain/
│   │   │   ├── model/
│   │   │   └── usecase/
│   │   └── di/
│   ├── res/
│   │   ├── values/
│   │   └── drawable/
│   └── AndroidManifest.xml
├── build.gradle.kts
└── proguard-rules.pro
```

### Compose Screen Pattern
```kotlin
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel = hiltViewModel(),
    onNavigateToSettings: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    LaunchedEffect(Unit) {
        viewModel.loadProfile()
    }

    Scaffold(
        topBar = {
            TopAppBar(title = { Text("Profile") })
        }
    ) { padding ->
        when (val state = uiState) {
            is ProfileUiState.Loading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }
            is ProfileUiState.Success -> {
                ProfileContent(
                    user = state.user,
                    onEditClick = onNavigateToSettings,
                    modifier = Modifier.padding(padding)
                )
            }
            is ProfileUiState.Error -> {
                ErrorMessage(message = state.message)
            }
        }
    }
}

@Composable
private fun ProfileContent(
    user: User,
    onEditClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier.fillMaxSize().padding(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        AsyncImage(
            model = user.avatarUrl,
            contentDescription = null,
            modifier = Modifier.size(100.dp).clip(CircleShape)
        )
        Spacer(Modifier.height(16.dp))
        Text(user.name, style = MaterialTheme.typography.titleLarge)
        Spacer(Modifier.height(24.dp))
        Button(onClick = onEditClick) {
            Text("Edit Profile")
        }
    }
}
```

### ViewModel Pattern
```kotlin
@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val getUserUseCase: GetUserUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow<ProfileUiState>(ProfileUiState.Loading)
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = ProfileUiState.Loading
            getUserUseCase()
                .onSuccess { user ->
                    _uiState.value = ProfileUiState.Success(user)
                }
                .onFailure { error ->
                    _uiState.value = ProfileUiState.Error(error.message ?: "Unknown error")
                }
        }
    }
}

sealed interface ProfileUiState {
    data object Loading : ProfileUiState
    data class Success(val user: User) : ProfileUiState
    data class Error(val message: String) : ProfileUiState
}
```

### Hilt Dependency Injection
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .build()
    }

    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
}
```

### Navigation (Compose)
```kotlin
@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            HomeScreen(
                onNavigateToDetails = { id ->
                    navController.navigate("details/$id")
                }
            )
        }
        composable(
            route = "details/{id}",
            arguments = listOf(navArgument("id") { type = NavType.StringType })
        ) { backStackEntry ->
            val id = backStackEntry.arguments?.getString("id") ?: return@composable
            DetailsScreen(id = id)
        }
    }
}
```

### Common Android Commands
```bash
# Clean build
./gradlew clean

# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease

# Run tests
./gradlew test

# Install on device
./gradlew installDebug

# Bundle for Play Store
./gradlew bundleRelease
```

### Gradle Dependencies (build.gradle.kts)
```kotlin
dependencies {
    // Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.7")

    // Hilt
    implementation("com.google.dagger:hilt-android:2.50")
    kapt("com.google.dagger:hilt-compiler:2.50")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Image loading
    implementation("io.coil-kt:coil-compose:2.5.0")
}
```
