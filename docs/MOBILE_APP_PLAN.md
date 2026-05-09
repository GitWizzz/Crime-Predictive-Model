# Crime Predictive Model — Mobile App Planning & Architecture Document
**Bihar Police Crime Intelligence System**
Last updated: 2026-05-09 | Status: Planning / Pre-development

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Mobile App Objectives](#2-mobile-app-objectives)
3. [Tech Stack](#3-tech-stack)
4. [App Architecture](#4-app-architecture)
5. [Backend Integration Flow](#5-backend-integration-flow)
6. [Authentication & Security](#6-authentication--security)
7. [Screens & Modules](#7-screens--modules)
8. [Crime Hotspot Map Integration](#8-crime-hotspot-map-integration)
9. [Real-time Alerts & Notifications](#9-real-time-alerts--notifications)
10. [Role-Based Access Flow](#10-role-based-access-flow)
11. [Folder Structure](#11-folder-structure)
12. [API Handling Strategy](#12-api-handling-strategy)
13. [State Management](#13-state-management)
14. [UI/UX & Design System](#14-uiux--design-system)
15. [Performance Optimization](#15-performance-optimization)
16. [Offline & Cache Handling](#16-offline--cache-handling)
17. [Future Scalability](#17-future-scalability)
18. [Development Phases & Milestones](#18-development-phases--milestones)

---

## 1. Project Overview

The Crime Predictive Model Mobile App is a **field-grade, officer-facing Android/iOS application** that connects to the existing Crime Predictive Hotspot Mapping System backend (Node.js/Express + PostgreSQL/PostGIS + Python ML service). It extends the web dashboard into a portable intelligence tool for police officers on patrol, station-level analysts, and district administrators.

The app provides **read-only map intelligence, FIR intake, patrol route navigation, real-time crime alerts, and risk zone awareness** — all optimized for field use on low-end Android devices and inconsistent Bihar network conditions.

**Reference architecture:** [PlutoApp (S:\Internship\Pluto\PlutoApp)] — Kotlin Multiplatform + Jetpack Compose Multiplatform, CLEAN architecture, Ktor, Koin DI, BaseViewModel MVI, Sealed Route Navigation. Business logic and theme are NOT copied — only architecture patterns.

**Design system:** Inherits the Crime Predictive Model web app's token-based design system (same color palette, typography scale, component vocabulary, dark/light theme support).

---

## 2. Mobile App Objectives

### Primary Objectives
- Give field officers **live hotspot awareness** without needing to open a laptop
- Enable **quick FIR intake** from the field (targeting 90-second submission)
- Show officers their **active patrol route** with crime risk at each stop
- Send **push notifications** for critical crime spikes in an officer's jurisdiction
- Provide analysts with **forecast summaries** and zone risk scores on mobile

### Secondary Objectives
- RBAC-enforced access — the app shows different screens to OFFICER vs ANALYST vs ADMIN
- Offline-capable FIR draft saving for areas with poor connectivity
- Lightweight — target < 30MB APK, < 2s cold start on a mid-range device
- Bilingual — English and Hindi (Devanagari) UI labels

### Non-Goals (for V1)
- Full analytics dashboard replication (belongs to web)
- Patrol route *creation* on mobile (view only in V1, create in V2)
- Video/body cam integration
- Biometric FIR signing

---

## 3. Tech Stack

Follows PlutoApp's multiplatform architecture. Business logic is original; only the engineering patterns and tooling are shared.

### Core Platform
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Language** | Kotlin 2.x | Type-safe, multiplatform |
| **UI** | Jetpack Compose Multiplatform 1.8.x | Shared UI for Android + iOS |
| **Multiplatform** | Kotlin Multiplatform (KMP) | Single codebase, Android + iOS targets |
| **Min SDK** | Android API 24 (Android 7.0) | ~97% device coverage in Bihar |
| **Target SDK** | Android 36 | Latest Play Store requirement |

### Networking
| Layer | Technology |
|-------|-----------|
| HTTP Client | Ktor 3.x (OkHttp on Android, Darwin/URLSession on iOS) |
| Serialization | kotlinx.serialization-json (ignoreUnknownKeys = true) |
| Auth | Bearer token in Authorization header (JWT, HttpOnly not applicable in mobile) |
| SSE / Real-time | Ktor SSE client (streaming events from `/api/v1/events/subscribe`) |

### State & DI
| Layer | Technology |
|-------|-----------|
| Dependency Injection | Koin 4.x (feature modules, multiplatform) |
| State Management | Kotlin Flows + BaseViewModel (MVI pattern from PlutoApp) |
| Global Events | AppEventBus (SharedFlow singleton — same pattern as PlutoApp) |

### Storage
| Layer | Technology |
|-------|-----------|
| Secure Token Storage | DataStore (Protobuf-backed, encrypted on Android via EncryptedSharedPreferences layer) |
| Local Cache / Offline | Room 2.8.x (SQLite) |
| Image Cache | Coil 3.x |

### Maps
| Layer | Technology |
|-------|-----------|
| Map Rendering | Google Maps SDK (Android) / MapKit (iOS via expect/actual) |
| Hotspot Overlay | Custom Compose Canvas layers over the map (DBSCAN polygons, KDE heatmap grid) |
| Location | `moko-permissions` + `moko-geo` for cross-platform GPS |

### Notifications & Analytics
| Layer | Technology |
|-------|-----------|
| Push Notifications | Firebase Cloud Messaging (FCM) via KMPNotifier |
| Analytics | Firebase Analytics |
| Crash Reporting | Firebase Crashlytics |
| Remote Config | Firebase Remote Config (feature flags, force-update) |

### Build & Tooling
| Layer | Technology |
|-------|-----------|
| Build | Gradle + Kotlin DSL, Version Catalog (`libs.versions.toml`) |
| Secrets | BuildKonfig plugin (API keys injected at build time) |
| Navigation | Compose Navigation (Typed, Serializable Routes) |
| Logging | Napier (cross-platform structured logging) |

---

## 4. App Architecture

### Pattern: CLEAN Architecture + MVI (PlutoApp style)

Every feature follows a strict three-layer CLEAN architecture:

```
┌──────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│   @Composable Screens ← StateFlow<STATE> ← ViewModel            │
│   Side effects via SharedFlow<SIDE_EFFECT>                       │
│   Navigation via NavController                                    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ calls UseCases
┌────────────────────────────▼─────────────────────────────────────┐
│                         DOMAIN LAYER                             │
│   UseCases → Repository interfaces → Domain models              │
│   Business rules live here. No Android dependencies.             │
└────────────────────────────┬─────────────────────────────────────┘
                             │ implements Repositories
┌────────────────────────────▼─────────────────────────────────────┐
│                          DATA LAYER                              │
│   Repository implementations → API Services (Ktor) → DTOs       │
│   Room DAOs for local cache → DataStore for preferences          │
│   Mappers: DTO → Domain model                                    │
└──────────────────────────────────────────────────────────────────┘
```

### BaseViewModel Pattern (from PlutoApp)

```kotlin
abstract class BaseViewModel<STATE, SIDE_EFFECT>(
    initialState: STATE
) : ViewModel() {
    protected val _state = MutableStateFlow(initialState)
    val state: StateFlow<STATE> = _state.asStateFlow()

    private val _sideEffect = MutableSharedFlow<SIDE_EFFECT>()
    val sideEffect: SharedFlow<SIDE_EFFECT> = _sideEffect.asSharedFlow()

    protected suspend fun emitState(reducer: STATE.() -> STATE) {
        _state.update { it.reducer() }
    }

    protected suspend fun emitEffect(effect: SIDE_EFFECT) {
        _sideEffect.emit(effect)
    }

    protected fun launchSafe(block: suspend CoroutineScope.() -> Unit) =
        viewModelScope.launch { runCatching { block() }.onFailure { handleError(it) } }
}
```

### BaseRepository Pattern (from PlutoApp)

```kotlin
abstract class BaseRepository {
    protected suspend inline fun <reified T> executeApiCall(
        crossinline call: suspend () -> HttpResponse
    ): Result<T> = runCatching {
        val response = call()
        when (response.status.value) {
            in 200..299 -> response.body<BaseResponseDto<T>>().data
                ?: throw EmptyResponseException()
            401 -> throw UnauthorizedException()
            403 -> throw ForbiddenException()
            404 -> throw NotFoundException()
            422 -> throw ValidationException(response.body<ErrorDto>().message)
            503 -> throw ServiceUnavailableException("ML service unavailable")
            else -> throw UnknownApiException(response.status.value)
        }
    }
}
```

### Global AppEventBus

```kotlin
object AppEventBus {
    private val _events = MutableSharedFlow<AppEvent>(extraBufferCapacity = 8)
    val events: SharedFlow<AppEvent> = _events.asSharedFlow()

    suspend fun emit(event: AppEvent) = _events.emit(event)
}

sealed class AppEvent {
    data object ForceLogout : AppEvent()
    data class CrimeSpikeAlert(val zone: String, val count: Int) : AppEvent()
    data class FIRCreated(val firNo: String) : AppEvent()
    data class NavigateToZone(val zoneName: String) : AppEvent()
    data class NavigateToFIR(val firId: Int) : AppEvent()
    data object RefreshDashboard : AppEvent()
}
```

---

## 5. Backend Integration Flow

The mobile app communicates **exclusively with the existing backend** at `http://localhost:4000/api/v1` (production: the deployed backend URL). The ML service is never called directly — the backend proxies all ML calls.

```
┌─────────────────────────────────────────────┐
│           MOBILE APP (KMP)                   │
│  Ktor HTTP Client (Bearer token in header)   │
└────────────────────┬────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────┐
│        NGINX REVERSE PROXY                   │
│        (SSL termination, rate limiting)      │
└──────────────┬──────────────────────────────┘
               │ /api/v1/*
               ▼
┌─────────────────────────────────────────────┐
│        EXPRESS BACKEND (Node.js 22)          │
│  JWT validation → RBAC → Business logic      │
│  SSE stream: /api/v1/events/subscribe        │
└──────────┬──────────────────┬───────────────┘
           │                  │
    ┌──────▼──────┐    ┌──────▼──────────┐
    │ PostgreSQL  │    │  ML Service      │
    │ + PostGIS   │    │  (FastAPI)       │
    │  (data)     │    │  (hotspots,      │
    └─────────────┘    │   forecasts,     │
                       │   routes)        │
                       └─────────────────┘
```

### Key API Endpoints Used by Mobile

| Module | Endpoint | Mobile Use |
|--------|---------|-----------|
| Auth | `POST /auth/login` | Login with email/password |
| Auth | `POST /auth/refresh` | Token refresh |
| Auth | `POST /auth/logout` | Logout + clear tokens |
| FIRs | `GET /firs` | FIR list (officer's station) |
| FIRs | `POST /firs` | Quick FIR intake |
| Hotspots | `GET /hotspots` | DBSCAN cluster list |
| Hotspots | `POST /hotspots/kde` | KDE heatmap grid |
| Analytics | `GET /analytics/risk` | Zone risk scores |
| Analytics | `GET /analytics/forecast` | 30-day forecast summary |
| Analytics | `GET /analytics/women-safety` | Women safety KDE |
| Patrol | `GET /patrol/routes` | Officer's active patrol routes |
| Patrol | `GET /patrol/schedule` | Today's patrol schedule |
| IRAD | `GET /irad/hotspots` | Accident cluster overlays |
| Events | `GET /events/subscribe` | SSE live alert stream |
| Health | `GET /health` | Connection check / offline detection |
| Zones | `GET /zones` | District/station GeoJSON boundaries |

### HTTP Client Setup (Ktor)

```kotlin
fun createHttpClient(
    tokenProvider: TokenProvider,
    baseUrl: String = BuildKonfig.BACKEND_BASE_URL
): HttpClient = HttpClient(engineFactory) {
    defaultRequest {
        url(baseUrl)
        contentType(ContentType.Application.Json)
        bearerAuth(tokenProvider.accessToken())
        header("X-App-Version", BuildKonfig.APP_VERSION)
        header("X-Platform", getPlatform().name)
    }
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true; isLenient = true })
    }
    install(Auth) {
        bearer {
            loadTokens { BearerTokens(tokenProvider.accessToken(), tokenProvider.refreshToken()) }
            refreshTokens { tokenProvider.refresh() }
            sendWithoutRequest { true }
        }
    }
    install(HttpTimeout) {
        requestTimeoutMillis = 20_000
        connectTimeoutMillis = 10_000
        socketTimeoutMillis = 20_000
    }
    install(Logging) {
        level = if (BuildKonfig.DEBUG) LogLevel.BODY else LogLevel.INFO
        logger = object : Logger { override fun log(msg: String) = Napier.d(msg) }
    }
}
```

---

## 6. Authentication & Security

### Auth Flow

```
App launch
    │
    ├─ Token exists in DataStore? ──No──► Login Screen
    │
   Yes
    │
    ├─ Validate token (GET /health with auth header)
    │       │
    │    Valid ──────────────────────────────► Home Screen (role-gated)
    │       │
    │    401/Expired ──► POST /auth/refresh
    │                          │
    │                       Success ──► Update tokens in DataStore ──► Home
    │                          │
    │                       Failure ──► Clear tokens ──► Login Screen
```

### Token Storage (DataStore + Protobuf)

Tokens are stored using **DataStore with Protobuf serialization**. On Android, the DataStore file is stored in the app's private directory (no root access). For additional security, the access token is not persisted between cold starts — only the refresh token is stored long-term.

```protobuf
// pref_data.proto
syntax = "proto3";

message PreferenceData {
    string refresh_token   = 1;
    string user_id         = 2;
    string user_name       = 3;
    string user_role       = 4;   // ADMIN | OFFICER | ANALYST
    string station_zone    = 5;   // Officer's assigned station
    string district_name   = 6;
    string fcm_token       = 7;
    bool   dark_mode       = 8;   // User's theme preference
    string language        = 9;   // "en" | "hi"
    string last_synced_at  = 10;
}
```

### Security Practices

| Concern | Approach |
|---------|----------|
| Token persistence | Only refresh token in DataStore; access token in-memory |
| Network security | HTTPS enforced (NSAppTransportSecurity + network_security_config.xml) |
| Certificate pinning | SHA-256 pin for production backend certificate |
| Root/jailbreak detection | Basic check — read-only mode if rooted |
| Screen capture | `FLAG_SECURE` on all screens in production builds |
| Logout | Clear all DataStore fields + in-memory tokens + navigate to Login |
| Session expiry | 401 anywhere → refresh → if refresh fails → ForceLogout event |
| API key protection | BuildKonfig (not in source) + ProGuard obfuscation |

### Logout Event Handling

```kotlin
// In AppViewModel, collecting AppEventBus
AppEventBus.events.collectLatest { event ->
    when (event) {
        is AppEvent.ForceLogout -> {
            dataStore.clearAll()
            tokenProvider.clear()
            emitEffect(AppRootSideEffect.NavigateToLogin)
        }
        else -> { /* handled per feature */ }
    }
}
```

---

## 7. Screens & Modules

### Navigation Structure

```
App Root
├── Auth Graph
│   ├── LoginScreen              (email + password)
│   └── ForgotPasswordScreen
│
└── Main Graph (requires auth)
    ├── BottomNav Tabs
    │   ├── Tab: Dashboard       (HomeTab)
    │   ├── Tab: Map             (HotspotsTab)
    │   ├── Tab: FIRs            (FIRsTab)
    │   └── Tab: Profile         (ProfileTab)
    │
    └── Overlay Screens (push onto stack from any tab)
        ├── FIRDetailScreen      (/firs/:id)
        ├── CreateFIRScreen      (/firs/new)
        ├── PatrolRouteScreen    (/patrol/:routeId)
        ├── ZoneDetailScreen     (/zones/:id)
        ├── AlertDetailScreen    (/alerts/:id)
        ├── ForecastScreen       (/analytics/forecast)
        └── SettingsScreen       (/settings)
```

### Screen Inventory

#### Auth Screens

| Screen | Route | Purpose |
|--------|-------|---------|
| `LoginScreen` | `Auth.Login` | Email + password login; no OTP in V1 |
| `ForgotPasswordScreen` | `Auth.ForgotPassword` | Request password reset email |

#### Dashboard Tab (HomeTab)

| Screen | Route | Role | Key Content |
|--------|-------|------|-------------|
| `DashboardScreen` | `Main.Dashboard` | All | Today's KPIs: active hotspots, open FIRs, top risk zone, officer's next patrol; Crime spike alert banner if SSE fires; Quick actions: Register FIR, View Map, View Patrol |

#### Map Tab (HotspotsTab)

| Screen | Route | Role | Key Content |
|--------|-------|------|-------------|
| `HotspotMapScreen` | `Main.Map` | All | Full-screen interactive map; DBSCAN cluster overlays; Mode toggle: DBSCAN / KDE heatmap; Women Safety layer toggle; IRAD accident layer toggle; Tap cluster → ClusterDetailSheet (bottom sheet) |
| `ClusterDetailSheet` | (bottom sheet) | All | Cluster stats: crime count, top crime type, risk level, date range |

#### FIRs Tab (FIRsTab)

| Screen | Route | Role | Key Content |
|--------|-------|------|-------------|
| `FIRListScreen` | `Main.FIRs` | OFFICER, ANALYST, ADMIN | Paginated FIR list; Search bar; Quick filters: status chips (Open, Closed, Pending); Pull-to-refresh |
| `FIRDetailScreen` | `Main.FIRDetail(id)` | All | Full FIR details (crime type, location, section, victim, officer, status) |
| `CreateFIRScreen` | `Main.CreateFIR` | OFFICER, ADMIN | 3-step form: Incident → Location (map picker) → Victim details; Autosave draft to Room; Submit to `POST /firs` |

#### Profile Tab (ProfileTab)

| Screen | Route | Role | Key Content |
|--------|-------|------|-------------|
| `ProfileScreen` | `Main.Profile` | All | Name, role, station, district; Theme toggle (light/dark); Language toggle (EN/HI); Logout; App version |
| `SettingsScreen` | `Main.Settings` | All | Notification preferences; Offline sync settings |

#### Overlay / Stack Screens

| Screen | Route | Role | Key Content |
|--------|-------|------|-------------|
| `PatrolRouteScreen` | `Main.PatrolRoute(id)` | OFFICER | Map with route stops, stop order, risk score per stop, "Mark complete" action (V2) |
| `ZoneDetailScreen` | `Main.ZoneDetail(id)` | All | Zone name, risk score, SHAP factor breakdown, 7-day trend sparkline, recent FIRs in zone |
| `ForecastScreen` | `Main.Forecast` | ANALYST, ADMIN | 30-day Prophet forecast chart, confidence band, trend summary sentence |
| `AlertDetailScreen` | `Main.AlertDetail(id)` | All | Spike alert: zone, crime type, count vs baseline, timestamp, deep-link to hotspot map |

---

## 8. Crime Hotspot Map Integration

### Map Architecture

The hotspot map is the **centrepiece screen** of the app. It wraps Google Maps SDK (Android) / MapKit (iOS) via a KMP `expect/actual` pattern, and renders crime intelligence overlays in Compose.

```
HotspotMapScreen
├── GoogleMapView (expect/actual KMP bridge)
│   ├── Bihar district GeoJSON boundary polygons
│   ├── DBSCAN cluster overlays (polygons + centroid markers)
│   ├── KDE heatmap grid (CircleOverlay per grid cell, opacity ∝ intensity)
│   ├── IRAD accident layer (orange diamond markers)
│   └── Women safety KDE layer (purple heat cells)
│
├── MapControlsBar (top overlay, Compose)
│   ├── Mode toggle chip: [DBSCAN] [KDE]
│   └── Layer toggles: [Women Safety] [IRAD]
│
├── ClusterDetailBottomSheet (Compose)
│   ├── Crime count, top type, risk badge
│   └── "View zone details" → ZoneDetailScreen
│
└── FloatingFAB: "Register FIR here" (pre-fills lat/lon from map center)
```

### Data Flow

```
HotspotsViewModel
    ├── On screen enter → GET /hotspots (DBSCAN clusters)
    ├── On mode = KDE → POST /hotspots/kde
    ├── On layer: women safety → GET /analytics/women-safety
    ├── On layer: IRAD → GET /irad/hotspots
    └── All results cached in Room (30-min TTL)

HotspotMapState {
    clusters: List<ClusterDomain>
    heatPoints: List<HeatPoint>
    womenSafetyPoints: List<HeatPoint>
    iradPoints: List<AccidentCluster>
    mode: MapMode  // DBSCAN | KDE
    activeLayers: Set<MapLayer>
    selectedCluster: ClusterDomain?
    isLoading: Boolean
    error: String?
}
```

### Color System (from web app tokens)

The map risk colors map directly to our existing design tokens:

```kotlin
object MapRiskColors {
    val Low      = Color(0xFF16A34A)   // --risk-low
    val Medium   = Color(0xFFD97706)   // --risk-med
    val High     = Color(0xFFDC2626)   // --risk-high
    val Critical = Color(0xFF7F1D1D)   // --risk-crit

    // Dark theme (automatically applied by token system)
    val LowDark      = Color(0xFF22C55E)
    val MediumDark   = Color(0xFFF59E0B)
    val HighDark     = Color(0xFFEF4444)
    val CriticalDark = Color(0xFFB91C1C)

    fun forScore(score: Int, dark: Boolean = false): Color = when {
        score > 75 -> if (dark) CriticalDark else Critical
        score > 50 -> if (dark) HighDark else High
        score > 25 -> if (dark) MediumDark else Medium
        else       -> if (dark) LowDark else Low
    }
}
```

### KDE Heatmap Rendering

KDE grid cells are rendered as semi-transparent `CircleOverlay` elements on the map. Intensity [0, 1] maps to opacity and color:

```kotlin
fun heatPointToOverlayOptions(pt: HeatPoint, dark: Boolean): CircleOptions = CircleOptions(
    center = LatLng(pt.lat, pt.lon),
    radius = 300.0,  // metres
    fillColor = lerp(
        from = if (dark) Color(0xFFF59E0B) else Color(0xFFFBBF24),  // amber
        to   = if (dark) Color(0xFFEF4444) else Color(0xFFDC2626),  // red
        t    = pt.intensity
    ).copy(alpha = (0.15f + pt.intensity * 0.45f)),
    strokeWidth = 0f
)
```

### Performance Constraints
- Maximum 200 markers rendered at once; cluster aggressively at zoom < 10
- KDE grid capped at 30×30 = 900 cells (matches backend grid size)
- GeoJSON boundaries loaded once and cached in Room
- Map tiles cached by Google Maps SDK (standard)

---

## 9. Real-time Alerts & Notifications

### SSE (Server-Sent Events) — In-App Alerts

When the app is **foregrounded**, it maintains an SSE connection to `GET /api/v1/events/subscribe` for live crime spike alerts without polling.

```kotlin
class CrimeAlertSseService(private val httpClient: HttpClient) {
    fun alertStream(): Flow<SseEvent> = flow {
        httpClient.sse("/api/v1/events/subscribe") {
            incoming.collect { event ->
                when (event.event) {
                    "crime_spike_alert" -> emit(SseEvent.CrimeSpike(event.data))
                    "fir_created"       -> emit(SseEvent.FIRCreated(event.data))
                    "geo_fence_alert"   -> emit(SseEvent.GeoFence(event.data))
                }
            }
        }
    }.retryWhen { cause, attempt ->
        // Exponential backoff: 2^attempt seconds, max 60s
        delay(minOf(2.0.pow(attempt).toLong() * 1000L, 60_000L))
        cause is IOException || cause is SocketTimeoutException
    }
}
```

SSE events are published to `AppEventBus`, which any ViewModel can observe.

### Push Notifications (FCM)

When the app is **backgrounded or killed**, FCM delivers notifications via Firebase Cloud Messaging. The backend sends FCM messages whenever `crime_spike_alert` or `geo_fence_alert` events are emitted.

**FCM Token Registration Flow:**
1. App starts → `KMPNotifier` requests FCM token
2. Token saved to DataStore (`pref_data.fcm_token`)
3. Token `PATCH`-ed to backend: `PATCH /api/v1/users/me/fcm-token`
4. Backend stores token per user; sends FCM when anomaly detected

**Notification Payload:**
```json
{
  "type": "CRIME_SPIKE",
  "zone": "Patna Central",
  "crime_type": "Theft",
  "count": 134,
  "baseline": 47,
  "z_score": 4.2,
  "alert_id": "alert-uuid",
  "navigate_to": "alert_detail"
}
```

**KMPNotifier Setup (mirrored from PlutoApp pattern):**
```kotlin
NotifierManager.addListener(object : NotifierManager.Listener {
    override fun onNewToken(token: String) {
        viewModelScope.launch { dataStore.saveFcmToken(token) }
        viewModelScope.launch { userRepository.updateFcmToken(token) }
    }

    override fun onPayloadData(data: Map<String, *>) {
        val type = data["type"] as? String ?: return
        when (type) {
            "CRIME_SPIKE"  -> AppEventBus.emitPending(
                AppEvent.CrimeSpikeAlert(data["zone"] as String, (data["count"] as String).toInt())
            )
            "FIR_CREATED"  -> AppEventBus.emitPending(AppEvent.FIRCreated(data["fir_no"] as String))
            "GEO_FENCE"    -> AppEventBus.emitPending(AppEvent.GeoFenceViolation(data["zone"] as String))
        }
    }

    override fun onNotificationClicked(data: Map<String, *>) {
        // Route to correct screen based on navigate_to
        val navigateTo = data["navigate_to"] as? String ?: return
        val alertId    = data["alert_id"] as? String
        when (navigateTo) {
            "alert_detail"  -> AppEventBus.emitPending(AppEvent.NavigateToAlert(alertId ?: ""))
            "hotspot_map"   -> AppEventBus.emitPending(AppEvent.NavigateToMap(data["zone"] as? String))
            "fir_detail"    -> AppEventBus.emitPending(AppEvent.NavigateToFIR((data["fir_id"] as String).toInt()))
        }
    }
})
```

### Pending Event Storage (cold-start)

Matches PlutoApp's `_pendingEvent: StateFlow<Event?>` pattern. Events arriving before the UI is ready are held and consumed once the first relevant Composable is ready.

---

## 10. Role-Based Access Flow

All role checks are performed **both on the backend (authoritative) and on the client (UI gating)**. The client role is read from the JWT claim stored in DataStore after login.

```
Login → JWT decode → role stored in DataStore.USER_ROLE

Role: OFFICER     → Tab bar: Dashboard, Map, FIRs, Profile
                     Can: View hotspots, create FIR, view own patrol route
                     Cannot: View analytics, reports, forecasts, admin pages

Role: ANALYST     → Tab bar: Dashboard, Map, FIRs, Analytics, Profile
                     Can: View everything, run forecast queries
                     Cannot: Create/edit FIRs, manage users

Role: ADMIN       → Tab bar: All tabs including Analytics + Admin
                     Can: Everything
```

### Navigation Guard

```kotlin
// In AppViewModel, after login
val startDestination: Route = when (userRole) {
    UserRole.OFFICER  -> Route.Main.Dashboard
    UserRole.ANALYST  -> Route.Main.Dashboard
    UserRole.ADMIN    -> Route.Main.Dashboard
}

// In NavHost — role-gated screens
composable<Route.Main.Forecast> {
    if (userRole == UserRole.OFFICER) {
        AccessDeniedScreen()
    } else {
        ForecastScreen(viewModel = koinViewModel())
    }
}
```

### Role-Aware UI Components

```kotlin
@Composable
fun RoleGate(
    requiredRoles: Set<UserRole>,
    userRole: UserRole,
    content: @Composable () -> Unit,
    fallback: @Composable () -> Unit = {}
) {
    if (userRole in requiredRoles) content() else fallback()
}

// Usage:
RoleGate(requiredRoles = setOf(UserRole.ANALYST, UserRole.ADMIN), userRole = currentRole) {
    ForecastCard()
}
```

---

## 11. Folder Structure

```
CrimeIntelligenceApp/
├── composeApp/                          # KMP shared module
│   └── src/
│       ├── commonMain/kotlin/com/bihar/crime/
│       │   ├── App.kt                   # Root NavHost, AppViewModel observer
│       │   ├── app/
│       │   │   └── Route.kt             # Sealed @Serializable Route hierarchy
│       │   │
│       │   ├── core/
│       │   │   ├── data/
│       │   │   │   ├── HttpClientFactory.kt
│       │   │   │   ├── BaseResponseDto.kt
│       │   │   │   ├── AppConstants.kt
│       │   │   │   └── mapper/          # Generic mappers
│       │   │   ├── domain/
│       │   │   │   ├── BaseRepository.kt
│       │   │   │   ├── model/           # Domain exceptions, UserRole, etc.
│       │   │   │   └── UserState.kt
│       │   │   ├── feature/
│       │   │   │   ├── auth/            # TokenProvider, AuthState
│       │   │   │   ├── datastore/       # PreferenceDataStore, proto schema
│       │   │   │   ├── database/        # Room AppDatabase + DAO registry
│       │   │   │   ├── analytics/       # Firebase Analytics wrapper
│       │   │   │   ├── appEventBus/     # AppEventBus + AppEvent sealed class
│       │   │   │   ├── sse/             # CrimeAlertSseService
│       │   │   │   ├── notifications/   # KMPNotifier setup, FCM token mgmt
│       │   │   │   ├── remoteconfig/    # Firebase Remote Config
│       │   │   │   ├── permissions/     # moko-permissions (location, notifications)
│       │   │   │   ├── connectivity/    # Konnectivity wrapper
│       │   │   │   └── inAppUpdate/     # Force update dialog
│       │   │   └── presentation/
│       │   │       ├── AppViewModel.kt
│       │   │       ├── BaseViewModel.kt
│       │   │       └── commonComposables/
│       │   │           ├── CrimeCard.kt
│       │   │           ├── RiskBadge.kt
│       │   │           ├── SurfaceCard.kt
│       │   │           ├── LoadingScreen.kt
│       │   │           ├── ErrorScreen.kt
│       │   │           ├── EmptyState.kt
│       │   │           └── BottomNavBar.kt
│       │   │
│       │   ├── di/
│       │   │   └── Modules.kt           # All Koin modules assembled
│       │   │
│       │   ├── theme/
│       │   │   ├── CrimeAppTheme.kt     # MaterialTheme wrapper, light+dark
│       │   │   ├── AppColors.kt         # Design tokens (matches web CSS vars)
│       │   │   ├── AppTypography.kt     # Typography scale
│       │   │   ├── AppShapes.kt         # Corner radii
│       │   │   └── AppDimensions.kt     # Spacing constants
│       │   │
│       │   └── feature/
│       │       ├── auth/                # Login, forgot password
│       │       │   ├── data/
│       │       │   │   ├── network/AuthService.kt
│       │       │   │   ├── repository/AuthRepositoryImpl.kt
│       │       │   │   └── model/       # AuthRequestDto, AuthResponseDto
│       │       │   ├── domain/
│       │       │   │   ├── repository/AuthRepository.kt
│       │       │   │   ├── usecase/     # LoginUseCase, RefreshTokenUseCase
│       │       │   │   └── model/       # AuthUser, Credentials
│       │       │   └── presentation/
│       │       │       ├── LoginScreen.kt
│       │       │       ├── LoginViewModel.kt
│       │       │       ├── LoginState.kt
│       │       │       └── navigation/authNavGraph.kt
│       │       │
│       │       ├── dashboard/           # HomeTab
│       │       │   ├── data/ domain/ presentation/
│       │       │   └── presentation/
│       │       │       ├── DashboardScreen.kt
│       │       │       ├── DashboardViewModel.kt
│       │       │       ├── DashboardState.kt
│       │       │       └── components/  # KPICard, AlertBanner, QuickActionRow
│       │       │
│       │       ├── hotspotMap/          # HotspotsTab
│       │       │   ├── data/ domain/ presentation/
│       │       │   └── presentation/
│       │       │       ├── HotspotMapScreen.kt
│       │       │       ├── HotspotMapViewModel.kt
│       │       │       ├── HotspotMapState.kt
│       │       │       └── components/  # MapControls, ClusterBottomSheet
│       │       │
│       │       ├── firs/                # FIRsTab
│       │       │   ├── data/ domain/ presentation/
│       │       │   └── presentation/
│       │       │       ├── FIRListScreen.kt
│       │       │       ├── FIRDetailScreen.kt
│       │       │       ├── CreateFIRScreen.kt
│       │       │       ├── FIRViewModel.kt
│       │       │       ├── FIRState.kt
│       │       │       └── components/  # FIRCard, FilterChips, CreateFIRForm
│       │       │
│       │       ├── patrol/              # Patrol routes (overlay screen)
│       │       │   ├── data/ domain/ presentation/
│       │       │   └── presentation/
│       │       │       ├── PatrolRouteScreen.kt
│       │       │       └── PatrolViewModel.kt
│       │       │
│       │       ├── analytics/           # ANALYST/ADMIN only overlay
│       │       │   ├── data/ domain/ presentation/
│       │       │   └── presentation/
│       │       │       ├── ForecastScreen.kt
│       │       │       ├── ZoneRiskScreen.kt
│       │       │       └── AnalyticsViewModel.kt
│       │       │
│       │       ├── zones/               # ZoneDetail overlay
│       │       │   └── presentation/ZoneDetailScreen.kt
│       │       │
│       │       ├── alerts/              # AlertDetail overlay
│       │       │   └── presentation/AlertDetailScreen.kt
│       │       │
│       │       └── profile/             # ProfileTab
│       │           └── presentation/ProfileScreen.kt
│       │
│       ├── androidMain/                 # Android-specific
│       │   └── com/bihar/crime/
│       │       ├── MainActivity.kt
│       │       ├── core/feature/datastore/DataStoreFactory.android.kt
│       │       ├── core/feature/maps/GoogleMapsView.android.kt
│       │       └── core/feature/permissions/PermissionsFactory.android.kt
│       │
│       └── iosMain/                     # iOS-specific
│           └── com/bihar/crime/
│               ├── core/feature/datastore/DataStoreFactory.ios.kt
│               ├── core/feature/maps/MapKitView.ios.kt
│               └── core/feature/permissions/PermissionsFactory.ios.kt
│
├── iosApp/                              # Swift entry point (Xcode)
├── maps/                                # Maps KMP module (expect/actual)
├── gradle/libs.versions.toml
├── build.gradle.kts
├── settings.gradle.kts
└── appkeys.properties                   # NOT in repo — API keys
```

---

## 12. API Handling Strategy

### Centralized Service Pattern

Every feature has exactly one `*Service.kt` in its `data/network/` folder. Services only handle HTTP; they do not parse business logic.

```kotlin
class HotspotService(
    private val httpClient: HttpClient
) {
    suspend fun getClusters(
        zone: String? = null,
        fromDate: String? = null,
        toDate: String? = null
    ): HttpResponse = httpClient.get("/api/v1/hotspots") {
        zone?.let { parameter("zone", it) }
        fromDate?.let { parameter("fromDate", it) }
        toDate?.let { parameter("toDate", it) }
    }

    suspend fun getKdeHeatmap(request: KdeRequestDto): HttpResponse =
        httpClient.post("/api/v1/hotspots/kde") { setBody(request) }
}
```

### Standard Response Wrapper

All our backend responses follow `{ "success": true, "data": { ... } }`. A shared DTO handles unwrapping:

```kotlin
@Serializable
data class BaseResponseDto<T>(
    val success: Boolean,
    val data: T? = null,
    val message: String? = null,
    val errors: List<String>? = null
)
```

### Pagination

Paginated endpoints return a `PaginatedData<T>` wrapper. A `PagingState` sealed class manages page loading:

```kotlin
sealed class PagingState<T> {
    data object Loading : PagingState<Nothing>()
    data class Loaded<T>(val items: List<T>, val hasMore: Boolean, val page: Int) : PagingState<T>()
    data class Error(val message: String) : PagingState<Nothing>()
}
```

### Connectivity Check

Before every API call in `BaseRepository`, check connectivity via `Konnectivity`:

```kotlin
if (!connectivity.isConnected) throw NoInternetException()
```

### Offline Fallback

If `NoInternetException` is thrown and Room cache exists, serve stale data with a `OfflineBanner` shown in the UI. Cache TTL is 30 minutes (matches backend Redis TTL).

---

## 13. State Management

### MVI with BaseViewModel

Every screen has a corresponding ViewModel that holds `STATE` (a data class) and emits `SIDE_EFFECT` (a sealed class for one-time events like navigation or toast). Screens collect state reactively.

```kotlin
// Example: HotspotMapViewModel
data class HotspotMapState(
    val clusters: List<ClusterDomain> = emptyList(),
    val heatPoints: List<HeatPoint> = emptyList(),
    val womenSafetyPoints: List<HeatPoint> = emptyList(),
    val iradPoints: List<AccidentCluster> = emptyList(),
    val mode: MapMode = MapMode.DBSCAN,
    val activeLayers: Set<MapLayer> = setOf(MapLayer.DBSCAN),
    val selectedCluster: ClusterDomain? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

sealed class HotspotMapSideEffect {
    data class ShowToast(val message: String) : HotspotMapSideEffect()
    data class NavigateToZone(val zoneId: Int) : HotspotMapSideEffect()
    data class NavigateToCreateFIR(val lat: Double, val lon: Double) : HotspotMapSideEffect()
}
```

### Cross-Screen Communication

`AppEventBus` (SharedFlow singleton) handles events that need to jump across tab boundaries (e.g., notification tapped while on Profile tab → navigate to Map tab → filter to alert zone).

### UI Pattern in Composables

```kotlin
@Composable
fun HotspotMapScreen(viewModel: HotspotMapViewModel = koinViewModel()) {
    val state by viewModel.state.collectAsState()

    // Side effects (one-time)
    LaunchedEffect(Unit) {
        viewModel.sideEffect.collect { effect ->
            when (effect) {
                is HotspotMapSideEffect.ShowToast -> { /* show toast */ }
                is HotspotMapSideEffect.NavigateToZone -> navController.navigate(Route.Main.ZoneDetail(effect.zoneId))
                is HotspotMapSideEffect.NavigateToCreateFIR -> navController.navigate(Route.Main.CreateFIR(effect.lat, effect.lon))
            }
        }
    }

    // UI renders from state
    HotspotMapContent(
        state = state,
        onModeChange = viewModel::onModeChange,
        onLayerToggle = viewModel::onLayerToggle,
        onClusterTap = viewModel::onClusterSelected
    )
}
```

---

## 14. UI/UX & Design System

### Design Source of Truth

The mobile app uses the **exact same design token system** as the Crime Predictive Model web app. The web's CSS custom properties map to Kotlin color constants with identical hex values.

### Color Tokens

```kotlin
// theme/AppColors.kt
object AppColors {

    // Backgrounds
    val BgBase    = Color(0xFFFBFBFC)   // --bg-base (light)
    val BgSurface = Color(0xFFFFFFFF)   // --bg-surface
    val BgRaised  = Color(0xFFFFFFFF)   // --bg-raised
    val BgSubtle  = Color(0xFFF4F5F7)   // --bg-subtle
    val BgMuted   = Color(0xFFEDEFF2)   // --bg-muted

    // Borders
    val Border      = Color(0xFFE4E7EB) // --border-default
    val BorderStrong= Color(0xFFCBD0D7) // --border-strong
    val BorderFocus = Color(0xFF3B6EFF) // --border-focus

    // Foregrounds (text)
    val FgPrimary   = Color(0xFF0B0D10) // --fg-primary
    val FgSecondary = Color(0xFF4A5159) // --fg-secondary
    val FgTertiary  = Color(0xFF7B838D) // --fg-tertiary

    // Accent (blue)
    val Accent50  = Color(0xFFEFF4FF)   // --accent-50
    val Accent100 = Color(0xFFDBE6FF)   // --accent-100
    val Accent500 = Color(0xFF3B6EFF)   // --accent-500  ← primary
    val Accent600 = Color(0xFF2A55D6)   // --accent-600
    val Accent700 = Color(0xFF1F40A8)   // --accent-700

    // Risk palette
    val RiskLow     = Color(0xFF16A34A) // --risk-low
    val RiskLowBg   = Color(0xFFDCFCE7) // --risk-low-bg
    val RiskMed     = Color(0xFFD97706) // --risk-med
    val RiskMedBg   = Color(0xFFFEF3C7) // --risk-med-bg
    val RiskHigh    = Color(0xFFDC2626) // --risk-high
    val RiskHighBg  = Color(0xFFFEE2E2) // --risk-high-bg
    val RiskCrit    = Color(0xFF7F1D1D) // --risk-crit
    val RiskCritBg  = Color(0xFFFECACA) // --risk-crit-bg

    // Dark theme overrides
    object Dark {
        val BgBase    = Color(0xFF0B0D10)
        val BgSurface = Color(0xFF15181D)
        val BgRaised  = Color(0xFF1B1F25)
        val BgSubtle  = Color(0xFF1F232A)
        val BgMuted   = Color(0xFF272C34)
        val Border      = Color(0xFF272C34)
        val BorderStrong= Color(0xFF3A4049)
        val FgPrimary   = Color(0xFFF4F5F7)
        val FgSecondary = Color(0xFFA6ADB6)
        val FgTertiary  = Color(0xFF7C8591)
        val Accent500 = Color(0xFF5B8AFF)
        val Accent600 = Color(0xFF3B6EFF)
        val RiskLow   = Color(0xFF22C55E)
        val RiskMed   = Color(0xFFF59E0B)
        val RiskHigh  = Color(0xFFEF4444)
        val RiskCrit  = Color(0xFFB91C1C)
    }
}
```

### MaterialTheme Setup

```kotlin
@Composable
fun CrimeAppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colors = if (darkTheme) darkColorScheme(
        primary = AppColors.Dark.Accent500,
        background = AppColors.Dark.BgBase,
        surface = AppColors.Dark.BgSurface,
        onBackground = AppColors.Dark.FgPrimary,
        onSurface = AppColors.Dark.FgPrimary,
        outline = AppColors.Dark.Border,
    ) else lightColorScheme(
        primary = AppColors.Accent500,
        background = AppColors.BgBase,
        surface = AppColors.BgSurface,
        onBackground = AppColors.FgPrimary,
        onSurface = AppColors.FgPrimary,
        outline = AppColors.Border,
    )

    MaterialTheme(
        colorScheme = colors,
        typography = AppTypography,
        shapes = AppShapes,
        content = content
    )
}
```

### Typography Scale

Mirrors the web app's type scale:

```kotlin
val AppTypography = Typography(
    headlineLarge  = TextStyle(fontSize = 30.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.03).em),
    headlineMedium = TextStyle(fontSize = 24.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.02).em),
    headlineSmall  = TextStyle(fontSize = 20.sp, fontWeight = FontWeight.SemiBold, letterSpacing = (-0.01).em),
    titleLarge     = TextStyle(fontSize = 17.sp, fontWeight = FontWeight.Medium),
    titleMedium    = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Medium),
    bodyLarge      = TextStyle(fontSize = 15.sp, fontWeight = FontWeight.Normal, lineHeight = 24.sp),
    bodyMedium     = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Normal, lineHeight = 20.sp),
    bodySmall      = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Normal, letterSpacing = 0.04.em),
    labelSmall     = TextStyle(fontSize = 10.sp, fontWeight = FontWeight.SemiBold, letterSpacing = 0.08.em,
                               textTransform = TextTransform.Uppercase)
)
```

### Shared Composable Components

```kotlin
// SurfaceCard — equivalent to web's .surface-card
@Composable
fun SurfaceCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(16.dp))
            .background(MaterialTheme.colorScheme.surface)
            .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(16.dp))
            .padding(16.dp),
        content = content
    )
}

// RiskBadge — equivalent to web's .risk-badge-*
@Composable
fun RiskBadge(level: RiskLevel, modifier: Modifier = Modifier) {
    val (bg, fg, label) = when (level) {
        RiskLevel.Low      -> Triple(AppColors.RiskLowBg,  AppColors.RiskLow,  "LOW")
        RiskLevel.Medium   -> Triple(AppColors.RiskMedBg,  AppColors.RiskMed,  "MED")
        RiskLevel.High     -> Triple(AppColors.RiskHighBg, AppColors.RiskHigh, "HIGH")
        RiskLevel.Critical -> Triple(AppColors.RiskCritBg, AppColors.RiskCrit, "CRITICAL")
    }
    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 3.dp)
    ) {
        Text(label, style = MaterialTheme.typography.labelSmall, color = fg)
    }
}
```

### UX Principles (inherits web app UX bets)

1. **Map is the home** — Officers think geographically. The map tab is prominent; every crime alert deep-links to the map.
2. **Insight before interface** — Dashboard leads with a plain-English summary sentence: *"3 active hotspots in your district. Highest risk: Patna Central (Score 87/100)."*
3. **Field-grade resilience** — No heavy assets. Skeleton loaders < 200ms. Stale cache shown with an offline banner rather than a blank screen. Works on EDGE connectivity.
4. **90-second FIR** — CreateFIR is a 3-step form with autosave. Step 1 alone is enough to submit a basic record.

---

## 15. Performance Optimization

| Concern | Strategy |
|---------|----------|
| **Cold start** | Minimal DI graph initialization; splash screen while AppViewModel checks token |
| **Map rendering** | Cap markers at 200; cluster aggressively at low zoom; lazy-load district GeoJSON |
| **Large lists (FIRs)** | Paging 3 (KMP-compatible); display 25 rows per page |
| **Image loading** | Coil 3 with 25% heap memory cache; no images in lists (icons only) |
| **Network** | Ktor with 20s timeouts; retry with exponential backoff; no redundant calls |
| **Recomposition** | `remember`, `derivedStateOf`, stable data classes; avoid lambda captures in loops |
| **Background work** | All API calls in `viewModelScope`; SSE connection auto-cancelled on lifecycle |
| **APK size** | R8 + ProGuard; strip unused Compose tooling in release; target < 30MB |
| **Baseline profiles** | Generate Compose baseline profile for 40% faster first-frame render |

---

## 16. Offline & Cache Handling

### Cache-First Strategy

```
Request data
    ├── Connectivity? No → Serve Room cache (if exists) + show OfflineBanner
    │
    └── Connectivity? Yes → Fetch from API
            ├── Success → Update Room cache → Show data
            └── Failure → Serve Room cache + show error snackbar
```

**Cache priority order (Repository logic):**
```
isCacheValid(entity) → return cached data immediately
isCacheExpired(entity) → fetch fresh → update cache → return
isOffline → return stale cache + emit OfflineBanner side-effect
noCacheExists → show loading → fetch → cache → show
```

---

### Enums (shared across entities)

```kotlin
// data/local/entity/Enums.kt
enum class FirStatus   { PENDING, UNDER_INVESTIGATION, CLOSED, REOPENED, REJECTED }
enum class ZoneType    { DISTRICT, STATION }
enum class PatrolStatus { SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED }
enum class AccidentSeverity { MINOR, SERIOUS, FATAL }
enum class RiskLevel   { LOW, MEDIUM, HIGH, CRITICAL }
```

---

### Type Converters

```kotlin
// data/local/converter/Converters.kt
class Converters {

    // Enums → String (stored as name, safe across renames if migrations run)
    @TypeConverter fun fromFirStatus(v: FirStatus): String = v.name
    @TypeConverter fun toFirStatus(v: String): FirStatus = FirStatus.valueOf(v)

    @TypeConverter fun fromZoneType(v: ZoneType): String = v.name
    @TypeConverter fun toZoneType(v: String): ZoneType = ZoneType.valueOf(v)

    @TypeConverter fun fromPatrolStatus(v: PatrolStatus): String = v.name
    @TypeConverter fun toPatrolStatus(v: String): PatrolStatus = PatrolStatus.valueOf(v)

    @TypeConverter fun fromAccidentSeverity(v: AccidentSeverity): String = v.name
    @TypeConverter fun toAccidentSeverity(v: String): AccidentSeverity = AccidentSeverity.valueOf(v)

    @TypeConverter fun fromRiskLevel(v: RiskLevel?): String? = v?.name
    @TypeConverter fun toRiskLevel(v: String?): RiskLevel? = v?.let { RiskLevel.valueOf(it) }

    // List<String> — comma-separated (crime_types, tags)
    @TypeConverter fun fromStringList(v: List<String>): String = v.joinToString(",")
    @TypeConverter fun toStringList(v: String): List<String> =
        if (v.isBlank()) emptyList() else v.split(",")

    // List<Int> — comma-separated member_ids
    @TypeConverter fun fromIntList(v: List<Int>): String = v.joinToString(",")
    @TypeConverter fun toIntList(v: String): List<Int> =
        if (v.isBlank()) emptyList() else v.split(",").map { it.toInt() }
}
```

---

### Entities

#### FirEntity — mirrors `firs` table

```kotlin
// data/local/entity/FirEntity.kt
@Entity(
    tableName = "firs",
    indices = [
        Index("zone_id"),
        Index("status"),
        Index("police_station"),
        Index("occurred_at"),
        Index("cached_at"),
    ]
)
data class FirEntity(
    @PrimaryKey val id: Int,
    val firNo: String,           // e.g. "FIR-2026-001"
    val crimeType: String,       // human-readable label from crime_classifications
    val actType: String,         // "IPC" | "POCSO" | "IT_ACT" | "OTHER"
    val sectionCode: String,     // IPC section, e.g. "302"
    val category: String,        // "Violent" | "Property" | "Cyber" …
    val severity: Int,           // 1–5
    val occurredAt: Long,        // epoch ms (from TIMESTAMPTZ)
    val locationName: String,
    val latitude: Double?,       // nullable — some FIRs have no GPS
    val longitude: Double?,
    val policeStation: String,
    val zone: String,            // district name
    val zoneId: Int?,
    val victimGender: String?,   // "MALE" | "FEMALE" | "OTHER"
    val victimAge: Int?,
    val victimCount: Int,
    val status: FirStatus,
    val source: String,          // "MANUAL" | "BULK_IMPORT" | "CCTNS"
    val isWomenSafety: Boolean,
    val cachedAt: Long,          // System.currentTimeMillis() when fetched
)
```

#### ZoneEntity — mirrors `zones` table

```kotlin
@Entity(
    tableName = "zones",
    indices = [Index("type"), Index("cachedAt")]
)
data class ZoneEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val type: ZoneType,
    val parentId: Int?,          // STATION → parent DISTRICT id
    val areaKm2: Double?,
    // GeoJSON boundary serialized as JSON string (MultiPolygon)
    // Parsed on read using kotlinx.serialization; not queried spatially on device
    val boundaryJson: String?,
    val cachedAt: Long,
)
```

#### CrimeClassificationEntity — mirrors `crime_classifications` table

```kotlin
@Entity(tableName = "crime_classifications")
data class CrimeClassificationEntity(
    @PrimaryKey val id: Int,
    val actType: String,
    val sectionCode: String,
    val title: String,
    val category: String,
    val severity: Int,
    val isWomenSafety: Boolean,
    val isCognizable: Boolean,
    val cachedAt: Long,
)
```

#### HotspotClusterEntity — DBSCAN result cache

```kotlin
@Entity(
    tableName = "hotspot_clusters",
    indices = [Index("zone"), Index("cachedAt")]
)
data class HotspotClusterEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val clusterId: Int,          // from ML service
    val zone: String,
    val centroidLat: Double,
    val centroidLon: Double,
    val crimeCount: Int,
    val crimeTypes: List<String>,  // TypeConverter → comma-separated
    val memberIds: List<Int>,      // TypeConverter → comma-separated
    val riskLevel: RiskLevel,
    val fromDate: Long,
    val toDate: Long,
    val cachedAt: Long,
)
```

#### HeatPointEntity — KDE heatmap cache

```kotlin
@Entity(
    tableName = "heat_points",
    indices = [Index("zone"), Index("cachedAt")]
)
data class HeatPointEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val zone: String,
    val lat: Double,
    val lon: Double,
    val intensity: Float,        // 0.0–1.0
    val fromDate: Long,
    val toDate: Long,
    val cachedAt: Long,
)
```

#### PatrolRouteEntity — mirrors `patrol_routes` table

```kotlin
@Entity(
    tableName = "patrol_routes",
    indices = [Index("zone"), Index("status"), Index("cachedAt")]
)
data class PatrolRouteEntity(
    @PrimaryKey val id: Int,
    val name: String,
    val zone: String,
    val status: PatrolStatus,
    val depotLat: Double,
    val depotLon: Double,
    val totalDistanceKm: Double?,
    val estimatedDurationMin: Int?,
    val numVehicles: Int,
    val scheduledFor: Long?,     // epoch ms
    val createdAt: Long,
    val cachedAt: Long,
)
```

#### PatrolRouteStopEntity — mirrors `patrol_route_stops` table

```kotlin
@Entity(
    tableName = "patrol_route_stops",
    foreignKeys = [
        ForeignKey(
            entity = PatrolRouteEntity::class,
            parentColumns = ["id"],
            childColumns = ["routeId"],
            onDelete = ForeignKey.CASCADE,
        )
    ],
    indices = [Index("routeId")]
)
data class PatrolRouteStopEntity(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val routeId: Int,
    val sequence: Int,
    val stopName: String,
    val lat: Double,
    val lon: Double,
    val riskScore: Double?,
    val crimeCount: Int?,
)
```

#### IradAccidentEntity — mirrors `irad_accidents` table

```kotlin
@Entity(
    tableName = "irad_accidents",
    indices = [Index("district"), Index("occurredAt"), Index("cachedAt")]
)
data class IradAccidentEntity(
    @PrimaryKey val id: Int,
    val accidentId: String,
    val occurredAt: Long,
    val severity: AccidentSeverity,
    val lat: Double,
    val lon: Double,
    val roadName: String?,
    val district: String,
    val casualties: Int,
    val injuries: Int,
    val weatherCondition: String?,
    val cachedAt: Long,
)
```

#### AlertEntity — crime spike alert cache

```kotlin
@Entity(
    tableName = "alerts",
    indices = [Index("zone"), Index("isRead"), Index("receivedAt")]
)
data class AlertEntity(
    @PrimaryKey val id: String,   // UUID generated on insert
    val zone: String,
    val crimeType: String?,
    val count: Int,
    val zScore: Double,
    val severity: RiskLevel,
    val message: String,
    val isRead: Boolean,
    val receivedAt: Long,         // when the SSE/FCM event arrived
)
```

#### DraftFirEntity — offline FIR drafts (device-only)

```kotlin
@Entity(tableName = "draft_firs")
data class DraftFirEntity(
    @PrimaryKey val localId: String,  // UUID
    val crimeType: String,
    val actType: String,
    val sectionCode: String,
    val occurredAt: Long,
    val locationName: String,
    val latitude: Double?,
    val longitude: Double?,
    val policeStation: String,
    val victimGender: String?,
    val victimAge: Int?,
    val victimCount: Int,
    val description: String,
    val isSynced: Boolean,
    val syncError: String?,
    val createdAt: Long,
    val updatedAt: Long,
)
```

---

### DAOs

#### FirDao

```kotlin
// data/local/dao/FirDao.kt
@Dao
interface FirDao {

    // Queries
    @Query("SELECT * FROM firs ORDER BY occurredAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getPage(limit: Int, offset: Int): List<FirEntity>

    @Query("SELECT * FROM firs WHERE zone = :zone ORDER BY occurredAt DESC LIMIT :limit OFFSET :offset")
    suspend fun getPageByZone(zone: String, limit: Int, offset: Int): List<FirEntity>

    @Query("SELECT * FROM firs WHERE policeStation = :station ORDER BY occurredAt DESC")
    suspend fun getByStation(station: String): List<FirEntity>

    @Query("SELECT * FROM firs WHERE status = :status ORDER BY occurredAt DESC")
    suspend fun getByStatus(status: FirStatus): List<FirEntity>

    @Query("SELECT * FROM firs WHERE zone = :zone AND status = :status ORDER BY occurredAt DESC")
    suspend fun getByZoneAndStatus(zone: String, status: FirStatus): List<FirEntity>

    @Query("SELECT * FROM firs WHERE id = :id")
    suspend fun getById(id: Int): FirEntity?

    @Query("SELECT * FROM firs WHERE isWomenSafety = 1 AND zone = :zone ORDER BY occurredAt DESC")
    suspend fun getWomenSafetyFirs(zone: String): List<FirEntity>

    @Query("SELECT COUNT(*) FROM firs WHERE zone = :zone AND status = 'PENDING'")
    suspend fun countPendingByZone(zone: String): Int

    @Query("SELECT * FROM firs WHERE cachedAt < :threshold")
    suspend fun getExpired(threshold: Long): List<FirEntity>

    // Upserts / writes
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(firs: List<FirEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(fir: FirEntity)

    @Delete
    suspend fun delete(fir: FirEntity)

    @Query("DELETE FROM firs WHERE cachedAt < :threshold")
    suspend fun clearExpired(threshold: Long)

    @Query("DELETE FROM firs WHERE zone = :zone")
    suspend fun clearByZone(zone: String)

    @Query("DELETE FROM firs")
    suspend fun clearAll()
}
```

#### ZoneDao

```kotlin
@Dao
interface ZoneDao {

    @Query("SELECT * FROM zones WHERE type = :type ORDER BY name ASC")
    suspend fun getByType(type: ZoneType): List<ZoneEntity>

    @Query("SELECT * FROM zones WHERE id = :id")
    suspend fun getById(id: Int): ZoneEntity?

    @Query("SELECT * FROM zones WHERE name = :name AND type = :type")
    suspend fun getByNameAndType(name: String, type: ZoneType): ZoneEntity?

    @Query("SELECT * FROM zones WHERE parentId = :districtId")
    suspend fun getStationsInDistrict(districtId: Int): List<ZoneEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(zones: List<ZoneEntity>)

    @Query("DELETE FROM zones WHERE cachedAt < :threshold")
    suspend fun clearExpired(threshold: Long)

    @Query("DELETE FROM zones")
    suspend fun clearAll()
}
```

#### HotspotDao

```kotlin
@Dao
interface HotspotDao {

    @Query("""
        SELECT * FROM hotspot_clusters
        WHERE zone = :zone AND fromDate >= :from AND toDate <= :to
        ORDER BY crimeCount DESC
    """)
    suspend fun getClusters(zone: String, from: Long, to: Long): List<HotspotClusterEntity>

    @Query("""
        SELECT * FROM heat_points
        WHERE zone = :zone AND fromDate >= :from AND toDate <= :to
    """)
    suspend fun getHeatPoints(zone: String, from: Long, to: Long): List<HeatPointEntity>

    @Query("SELECT MAX(cachedAt) FROM hotspot_clusters WHERE zone = :zone")
    suspend fun getLastCachedAt(zone: String): Long?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClusters(clusters: List<HotspotClusterEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHeatPoints(points: List<HeatPointEntity>)

    @Query("DELETE FROM hotspot_clusters WHERE zone = :zone")
    suspend fun clearClustersForZone(zone: String)

    @Query("DELETE FROM heat_points WHERE zone = :zone")
    suspend fun clearHeatPointsForZone(zone: String)

    @Query("DELETE FROM hotspot_clusters WHERE cachedAt < :threshold")
    suspend fun clearExpiredClusters(threshold: Long)

    @Query("DELETE FROM heat_points WHERE cachedAt < :threshold")
    suspend fun clearExpiredHeatPoints(threshold: Long)
}
```

#### PatrolDao

```kotlin
@Dao
interface PatrolDao {

    @Query("SELECT * FROM patrol_routes WHERE zone = :zone ORDER BY scheduledFor DESC")
    suspend fun getRoutesByZone(zone: String): List<PatrolRouteEntity>

    @Query("SELECT * FROM patrol_routes WHERE status = :status ORDER BY scheduledFor DESC")
    suspend fun getRoutesByStatus(status: PatrolStatus): List<PatrolRouteEntity>

    @Query("SELECT * FROM patrol_routes WHERE id = :id")
    suspend fun getRouteById(id: Int): PatrolRouteEntity?

    @Query("SELECT * FROM patrol_route_stops WHERE routeId = :routeId ORDER BY sequence ASC")
    suspend fun getStopsForRoute(routeId: Int): List<PatrolRouteStopEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRoutes(routes: List<PatrolRouteEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertRoute(route: PatrolRouteEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStops(stops: List<PatrolRouteStopEntity>)

    @Query("DELETE FROM patrol_route_stops WHERE routeId = :routeId")
    suspend fun clearStopsForRoute(routeId: Int)

    @Query("DELETE FROM patrol_routes WHERE cachedAt < :threshold")
    suspend fun clearExpiredRoutes(threshold: Long)
}
```

#### IradDao

```kotlin
@Dao
interface IradDao {

    @Query("""
        SELECT * FROM irad_accidents
        WHERE district = :district AND occurredAt BETWEEN :from AND :to
        ORDER BY occurredAt DESC
    """)
    suspend fun getByDistrictAndDateRange(district: String, from: Long, to: Long): List<IradAccidentEntity>

    @Query("SELECT * FROM irad_accidents WHERE severity = :severity ORDER BY occurredAt DESC")
    suspend fun getBySeverity(severity: AccidentSeverity): List<IradAccidentEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(accidents: List<IradAccidentEntity>)

    @Query("DELETE FROM irad_accidents WHERE cachedAt < :threshold")
    suspend fun clearExpired(threshold: Long)
}
```

#### CrimeClassificationDao

```kotlin
@Dao
interface CrimeClassificationDao {

    @Query("SELECT * FROM crime_classifications ORDER BY actType, sectionCode")
    suspend fun getAll(): List<CrimeClassificationEntity>

    @Query("SELECT * FROM crime_classifications WHERE actType = :actType")
    suspend fun getByActType(actType: String): List<CrimeClassificationEntity>

    @Query("SELECT * FROM crime_classifications WHERE isWomenSafety = 1")
    suspend fun getWomenSafetyClassifications(): List<CrimeClassificationEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<CrimeClassificationEntity>)

    @Query("DELETE FROM crime_classifications")
    suspend fun clearAll()
}
```

#### AlertDao

```kotlin
@Dao
interface AlertDao {

    @Query("SELECT * FROM alerts ORDER BY receivedAt DESC LIMIT :limit")
    fun observeRecent(limit: Int): Flow<List<AlertEntity>>

    @Query("SELECT * FROM alerts WHERE isRead = 0 ORDER BY receivedAt DESC")
    fun observeUnread(): Flow<List<AlertEntity>>

    @Query("SELECT COUNT(*) FROM alerts WHERE isRead = 0")
    fun observeUnreadCount(): Flow<Int>

    @Query("SELECT * FROM alerts WHERE id = :id")
    suspend fun getById(id: String): AlertEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(alert: AlertEntity)

    @Query("UPDATE alerts SET isRead = 1 WHERE id = :id")
    suspend fun markRead(id: String)

    @Query("UPDATE alerts SET isRead = 1")
    suspend fun markAllRead()

    @Query("DELETE FROM alerts WHERE receivedAt < :threshold")
    suspend fun clearOlderThan(threshold: Long)
}
```

#### DraftFirDao

```kotlin
@Dao
interface DraftFirDao {

    @Query("SELECT * FROM draft_firs ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<DraftFirEntity>>

    @Query("SELECT * FROM draft_firs WHERE isSynced = 0 ORDER BY createdAt ASC")
    suspend fun getAllPending(): List<DraftFirEntity>

    @Query("SELECT * FROM draft_firs WHERE localId = :localId")
    suspend fun getById(localId: String): DraftFirEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(draft: DraftFirEntity)

    @Query("UPDATE draft_firs SET isSynced = 1, syncError = NULL WHERE localId = :localId")
    suspend fun markSynced(localId: String)

    @Query("UPDATE draft_firs SET syncError = :error WHERE localId = :localId")
    suspend fun markFailed(localId: String, error: String)

    @Query("DELETE FROM draft_firs WHERE localId = :localId")
    suspend fun delete(localId: String)

    @Query("DELETE FROM draft_firs WHERE isSynced = 1")
    suspend fun clearSynced()
}
```

---

### AppDatabase

```kotlin
// data/local/AppDatabase.kt
@Database(
    entities = [
        FirEntity::class,
        ZoneEntity::class,
        CrimeClassificationEntity::class,
        HotspotClusterEntity::class,
        HeatPointEntity::class,
        PatrolRouteEntity::class,
        PatrolRouteStopEntity::class,
        IradAccidentEntity::class,
        AlertEntity::class,
        DraftFirEntity::class,
    ],
    version = 1,
    exportSchema = true,
)
@TypeConverters(Converters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun firDao(): FirDao
    abstract fun zoneDao(): ZoneDao
    abstract fun classificationDao(): CrimeClassificationDao
    abstract fun hotspotDao(): HotspotDao
    abstract fun patrolDao(): PatrolDao
    abstract fun iradDao(): IradDao
    abstract fun alertDao(): AlertDao
    abstract fun draftFirDao(): DraftFirDao

    companion object {
        const val DATABASE_NAME = "crime_intelligence.db"
    }
}
```

Koin binding (inside `coreModule`):

```kotlin
single {
    Room.databaseBuilder(androidContext(), AppDatabase::class.java, AppDatabase.DATABASE_NAME)
        .fallbackToDestructiveMigration()   // acceptable for cache-only data
        .build()
}
single { get<AppDatabase>().firDao() }
single { get<AppDatabase>().zoneDao() }
single { get<AppDatabase>().classificationDao() }
single { get<AppDatabase>().hotspotDao() }
single { get<AppDatabase>().patrolDao() }
single { get<AppDatabase>().iradDao() }
single { get<AppDatabase>().alertDao() }
single { get<AppDatabase>().draftFirDao() }
```

---

### Cache TTL Constants

```kotlin
// data/local/CacheTtl.kt
object CacheTtl {
    val HOTSPOT_MS      = 30 * 60 * 1_000L   // 30 min — matches Redis TTL on backend
    val FIR_LIST_MS     = 5  * 60 * 1_000L   // 5 min  — FIRs are volatile
    val ZONE_GEO_MS     = 24 * 60 * 60 * 1_000L  // 24 h  — zone boundaries rarely change
    val CLASSIFICATION_MS = 7 * 24 * 60 * 60 * 1_000L  // 7 days — classifications are static
    val PATROL_ROUTE_MS = 15 * 60 * 1_000L   // 15 min — routes change during shift
    val IRAD_MS         = 60 * 60 * 1_000L   // 1 hour — accidents ingest is batch
    val ALERT_KEEP_MS   = 7 * 24 * 60 * 60 * 1_000L   // keep alerts 7 days
}

fun Long.isCacheValid(ttlMs: Long): Boolean =
    System.currentTimeMillis() - this < ttlMs
```

---

### Mapper Functions

```kotlin
// data/local/mapper/FirMapper.kt

fun FirEntity.toDomain(): FirDomain = FirDomain(
    id           = id,
    firNo        = firNo,
    crimeType    = crimeType,
    actType      = actType,
    sectionCode  = sectionCode,
    category     = category,
    severity     = severity,
    occurredAt   = Instant.fromEpochMilliseconds(occurredAt),
    locationName = locationName,
    latitude     = latitude,
    longitude    = longitude,
    policeStation = policeStation,
    zone         = zone,
    zoneId       = zoneId,
    victimGender = victimGender,
    victimAge    = victimAge,
    victimCount  = victimCount,
    status       = status,
    source       = source,
    isWomenSafety = isWomenSafety,
)

fun FirResponse.toEntity(now: Long = System.currentTimeMillis()): FirEntity = FirEntity(
    id           = id,
    firNo        = firNo,
    crimeType    = crimeType,
    actType      = actType,
    sectionCode  = sectionCode,
    category     = category,
    severity     = severity,
    occurredAt   = occurredAt.toEpochMilliseconds(),
    locationName = locationName,
    latitude     = latitude,
    longitude    = longitude,
    policeStation = policeStation,
    zone         = zone,
    zoneId       = zoneId,
    victimGender = victimGender,
    victimAge    = victimAge,
    victimCount  = victimCount,
    status       = FirStatus.valueOf(status),
    source       = source,
    isWomenSafety = isWomenSafety,
    cachedAt     = now,
)

// data/local/mapper/HotspotMapper.kt

fun ClusterResponse.toEntity(zone: String, from: Long, to: Long): HotspotClusterEntity =
    HotspotClusterEntity(
        clusterId    = clusterId,
        zone         = zone,
        centroidLat  = centroid.lat,
        centroidLon  = centroid.lon,
        crimeCount   = crimeCount,
        crimeTypes   = crimeTypes,
        memberIds    = memberIds,
        riskLevel    = when {
            crimeCount >= 20 -> RiskLevel.CRITICAL
            crimeCount >= 10 -> RiskLevel.HIGH
            crimeCount >= 5  -> RiskLevel.MEDIUM
            else             -> RiskLevel.LOW
        },
        fromDate     = from,
        toDate       = to,
        cachedAt     = System.currentTimeMillis(),
    )

fun HotspotClusterEntity.toDomain(): HotspotCluster = HotspotCluster(
    clusterId   = clusterId,
    centroidLat = centroidLat,
    centroidLon = centroidLon,
    crimeCount  = crimeCount,
    crimeTypes  = crimeTypes,
    memberIds   = memberIds,
    riskLevel   = riskLevel,
)

// data/local/mapper/DraftFirMapper.kt

fun DraftFirEntity.toCreateRequest(): CreateFirRequest = CreateFirRequest(
    crimeType    = crimeType,
    actType      = actType,
    sectionCode  = sectionCode,
    occurredAt   = Instant.fromEpochMilliseconds(occurredAt).toString(),
    locationName = locationName,
    latitude     = latitude,
    longitude    = longitude,
    policeStation = policeStation,
    victimGender = victimGender,
    victimAge    = victimAge,
    victimCount  = victimCount,
    description  = description,
)
```

---

### Repository Cache Pattern (example)

```kotlin
// data/repository/HotspotRepositoryImpl.kt
class HotspotRepositoryImpl(
    private val hotspotDao: HotspotDao,
    private val hotspotService: HotspotService,
    private val connectivity: ConnectivityObserver,
) : HotspotRepository {

    override suspend fun getClusters(zone: String, from: Long, to: Long): Result<List<HotspotCluster>> {
        val lastCached = hotspotDao.getLastCachedAt(zone) ?: 0L

        if (lastCached.isCacheValid(CacheTtl.HOTSPOT_MS)) {
            return Result.success(
                hotspotDao.getClusters(zone, from, to).map { it.toDomain() }
            )
        }

        if (!connectivity.isConnected()) {
            val cached = hotspotDao.getClusters(zone, from, to)
            return if (cached.isNotEmpty()) Result.success(cached.map { it.toDomain() })
            else Result.failure(OfflineException("No cached hotspot data for $zone"))
        }

        return hotspotService.fetchClusters(zone, from, to)
            .map { response ->
                val entities = response.clusters.map { it.toEntity(zone, from, to) }
                hotspotDao.clearClustersForZone(zone)
                hotspotDao.insertClusters(entities)
                entities.map { it.toDomain() }
            }
    }
}
```

---

### Offline FIR Draft Sync (WorkManager)

```kotlin
// data/worker/SyncDraftFirsWorker.kt
class SyncDraftFirsWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {

    private val draftFirDao: DraftFirDao by inject()
    private val firService: FirService by inject()

    override suspend fun doWork(): Result {
        val pending = draftFirDao.getAllPending()
        if (pending.isEmpty()) return Result.success()

        var anyFailed = false
        pending.forEach { draft ->
            firService.createFir(draft.toCreateRequest())
                .onSuccess { draftFirDao.markSynced(draft.localId) }
                .onFailure { e ->
                    anyFailed = true
                    draftFirDao.markFailed(draft.localId, e.message ?: "Unknown error")
                }
        }
        return if (anyFailed) Result.retry() else Result.success()
    }

    companion object {
        const val WORK_NAME = "sync_draft_firs"

        fun enqueue(workManager: WorkManager) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val request = OneTimeWorkRequestBuilder<SyncDraftFirsWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            workManager.enqueueUniqueWork(
                WORK_NAME,
                ExistingWorkPolicy.KEEP,
                request,
            )
        }
    }
}
```

Triggered on connectivity restore via `ConnectivityObserver`:

```kotlin
// In core module startup (Application.onCreate or Koin)
connectivityObserver.observe().filter { it == AVAILABLE }.collect {
    SyncDraftFirsWorker.enqueue(workManager)
}
```

---

### Cache Eviction Schedule

A periodic `WorkManager` job runs every 6 hours to evict stale rows and keep the SQLite file small:

```kotlin
class CacheEvictionWorker(context: Context, params: WorkerParameters) :
    CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val now = System.currentTimeMillis()
        firDao.clearExpired(now - CacheTtl.FIR_LIST_MS)
        hotspotDao.clearExpiredClusters(now - CacheTtl.HOTSPOT_MS)
        hotspotDao.clearExpiredHeatPoints(now - CacheTtl.HOTSPOT_MS)
        patrolDao.clearExpiredRoutes(now - CacheTtl.PATROL_ROUTE_MS)
        iradDao.clearExpired(now - CacheTtl.IRAD_MS)
        alertDao.clearOlderThan(now - CacheTtl.ALERT_KEEP_MS)
        draftFirDao.clearSynced()
        return Result.success()
    }
}
```

---

## 17. Future Scalability

| Feature | Phase | Notes |
|---------|-------|-------|
| Patrol stop completion (OFFICER marks stops done) | V2 | Requires `PATCH /patrol/logs` backend endpoint |
| Patrol route creation on mobile | V2 | Complex map interaction — web-first for now |
| Live officer tracking (OFFICER broadcasts GPS) | V2 | WebSocket or SSE from mobile → backend |
| Women Safety SOS button | V2 | One-tap alert with GPS location to HQ |
| Hindi UI (full Devanagari) | V2 | i18n via Lyricist or Moko-Resources |
| Offline-first FIR (full offline mode) | V2 | WorkManager sync queue; conflict resolution |
| Biometric login | V2 | Android BiometricPrompt + iOS LocalAuthentication |
| iPad / large-screen layout | V2 | Adaptive layout with side panel on wide screens |
| Apple Watch / Wear OS alerts | V3 | Crime spike on wrist for patrol officers |
| LSTM forecast (when backend adds it) | V3 | Drop-in replacement — API contract unchanged |
| Real CCTNS integration | V3 | When backend switches from mock to CCTNS API |
| AI brief ("What happened in my zone today?") | V3 | LLM-generated summary from backend analytics |

### Extensibility Principles

- **Feature modules are independent** — Adding a new feature = new folder under `feature/`, new Koin module, new Route entries. Zero changes to existing features.
- **Backend-first changes** — The app adapts to new backend endpoints without architectural changes; just new Service + Repository + Domain models.
- **API versioning** — `BuildKonfig.API_BASE_URL` supports `/v2` when backend ships it; old endpoints remain until app min-version forces upgrade.
- **Remote Config** — Feature flags via Firebase Remote Config let us gate V2 features to specific app versions without a Play Store release.

---

## 18. Development Phases & Milestones

### Phase 1 — Foundation (Weeks 1–3)
**Goal:** Skeleton app with auth, navigation, and backend connectivity

| Task | Owner | Est. |
|------|-------|------|
| KMP project setup, Gradle version catalog | Backend + Mobile | 2 days |
| Theme system (`AppColors`, `AppTypography`, `CrimeAppTheme`) | Mobile | 1 day |
| `BaseViewModel`, `BaseRepository`, `AppEventBus` | Mobile | 1 day |
| Ktor HTTP client factory + `TokenProvider` | Mobile | 1 day |
| DataStore proto setup (tokens, user prefs) | Mobile | 1 day |
| Room database + DAOs (Hotspot, FIR, Zone) | Mobile | 1 day |
| Auth feature: `LoginScreen` + `LoginViewModel` + `AuthService` | Mobile | 2 days |
| Navigation skeleton: `Route.kt` + `AppNavHost` + bottom tabs | Mobile | 1 day |
| **Milestone:** Login → Dashboard shell (empty screens) working on device | — | Week 3 |

### Phase 2 — Core Features (Weeks 4–7)
**Goal:** Hotspot map, FIR list, and Dashboard fully functional

| Task | Owner | Est. |
|------|-------|------|
| Google Maps KMP `expect/actual` bridge | Mobile | 2 days |
| DBSCAN cluster overlay on map | Mobile | 2 days |
| KDE heatmap overlay | Mobile | 2 days |
| `HotspotService` + `HotspotRepository` + Room cache | Mobile | 2 days |
| MapControls (mode toggle, layer toggles) | Mobile | 1 day |
| `ClusterDetailBottomSheet` | Mobile | 1 day |
| `FIRListScreen` with pagination + search + status filters | Mobile | 3 days |
| `FIRDetailScreen` | Mobile | 1 day |
| `DashboardScreen` with KPI cards + alert banner | Mobile | 2 days |
| Backend: `PATCH /users/me/fcm-token` endpoint | Backend | 1 day |
| **Milestone:** Officers can view live hotspot map and FIR list | — | Week 7 |

### Phase 3 — FIR Intake & Patrol (Weeks 8–10)
**Goal:** Field-usable FIR creation and patrol route viewing

| Task | Owner | Est. |
|------|-------|------|
| `CreateFIRScreen` 3-step form | Mobile | 3 days |
| Draft FIR → Room → WorkManager sync | Mobile | 2 days |
| Map picker for FIR location (Step 2) | Mobile | 1 day |
| `PatrolRouteScreen` with route stops on map | Mobile | 2 days |
| `ZoneDetailScreen` (risk score + SHAP factors) | Mobile | 2 days |
| RBAC navigation guards + role-aware tab bar | Mobile | 1 day |
| **Milestone:** Officers can register FIRs offline and view patrol routes | — | Week 10 |

### Phase 4 — Real-time & Analytics (Weeks 11–12)
**Goal:** Push notifications, SSE alerts, forecast screen

| Task | Owner | Est. |
|------|-------|------|
| FCM setup (Firebase project, KMPNotifier) | Mobile | 1 day |
| `CrimeAlertSseService` (SSE stream) | Mobile | 2 days |
| `AlertDetailScreen` | Mobile | 1 day |
| `ForecastScreen` (chart, ANALYST+ only) | Mobile | 2 days |
| Women Safety + IRAD map layers | Mobile | 2 days |
| ProfileScreen + theme toggle + logout | Mobile | 1 day |
| **Milestone:** Live alerts working; analysts can view forecasts | — | Week 12 |

### Phase 5 — Polish & Release (Weeks 13–14)
**Goal:** Production-ready app on Play Store internal track

| Task | Owner | Est. |
|------|-------|------|
| Firebase Analytics events on all key actions | Mobile | 1 day |
| Firebase Crashlytics integration | Mobile | 1 day |
| Firebase Remote Config (force update, feature flags) | Mobile | 1 day |
| ProGuard rules + R8 release build | Mobile | 1 day |
| Certificate pinning + `FLAG_SECURE` | Mobile | 1 day |
| Baseline profile generation | Mobile | 1 day |
| Performance testing on low-end device (Redmi 7A class) | Mobile | 2 days |
| Internal Play Store track submission | Mobile | 1 day |
| **Milestone:** V1 released on Play Store internal track | — | Week 14 |

---

## Appendix A — BuildKonfig Keys Required

```properties
# appkeys.properties (not in repo)
BACKEND_BASE_URL=https://your-backend-url.com/
GOOGLE_MAPS_API_KEY=...
FIREBASE_PROJECT_ID=...
DEBUG=false
APP_VERSION=1.0.0
```

## Appendix B — Backend Endpoints Needed (New for Mobile)

All P0 endpoints are documented in `API_REFERENCE.md` under **Mobile-Specific Endpoints**.

| Endpoint | Method | Purpose | Priority | Status |
|----------|--------|---------|----------|--------|
| `/api/v1/users/me` | GET | Get current user profile + role + station | P0 | Documented |
| `/api/v1/users/me/fcm-token` | PATCH | Register/update FCM push token | P0 | Documented |
| `/api/v1/dashboard/summary` | GET | Aggregated KPIs for Dashboard screen | P0 | Documented |
| `/api/v1/alerts` | GET | List crime spike alerts with pagination | P0 | Documented |
| `/api/v1/alerts/:id` | GET | Single alert detail + mark read | P0 | Documented |
| `/api/v1/alerts/:id/read` | PATCH | Explicitly mark alert read | P1 | Documented |
| `/api/v1/firs/drafts` | POST | Save offline FIR draft server-side (optional) | P2 | Not yet |

## Appendix C — Koin Module Structure

```kotlin
// di/Modules.kt
val appModules = listOf(
    coreModule,          // HttpClient, DataStore, AppDatabase, Connectivity
    authModule,          // AuthService, AuthRepository, LoginViewModel
    dashboardModule,     // DashboardService, DashboardRepository, DashboardViewModel
    hotspotModule,       // HotspotService, HotspotRepository, HotspotMapViewModel
    firModule,           // FIRService, FIRRepository, FIRViewModel
    patrolModule,        // PatrolService, PatrolRepository, PatrolViewModel
    analyticsModule,     // AnalyticsService, AnalyticsRepository, ForecastViewModel
    zoneModule,          // ZoneService, ZoneRepository, ZoneDetailViewModel
    alertModule,         // AlertSseService, AlertDetailViewModel
    profileModule,       // ProfileViewModel
    appModule            // AppViewModel, AppEventBus
)
```
