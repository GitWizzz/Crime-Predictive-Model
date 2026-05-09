# API Reference
**Crime Predictive Hotspot Mapping System**  
Base URL: `http://localhost:4000/api/v1`  
Last updated: 2026-05-09

---

## Authentication

All protected endpoints require a valid JWT access token sent as an **HttpOnly cookie** named `token`. The browser sends this automatically after login — no manual header needed.

For server-to-server calls (testing, scripts), pass:
```
Cookie: token=<jwt>
X-CSRF-Token: <csrf_token>
```

**Roles:**
- `ADMIN` — full access
- `OFFICER` — create/update FIRs in their station, view analytics
- `ANALYST` — read-only, can run ML analysis and export

**Standard response envelope:**
```json
{ "success": true, "data": { ... } }
{ "success": false, "message": "Validation error", "errors": [...] }
```

---

## Auth Endpoints — `/api/v1/auth`

---

### POST `/api/v1/auth/signup`
Create a new user account.

**Auth required:** No  
**Rate limit:** 5 per hour per IP

**Request body:**
```json
{
  "name": "Rajesh Kumar",
  "email": "rajesh@bihar.gov.in",
  "password": "Secure@1234",
  "role": "OFFICER"
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | 2–100 chars |
| `email` | string | Yes | Valid email, unique |
| `password` | string | Yes | Min 8 chars, 1 uppercase, 1 digit, 1 special char |
| `role` | string | Yes | `ADMIN`, `OFFICER`, or `ANALYST` |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Rajesh Kumar", "email": "rajesh@bihar.gov.in", "role": "OFFICER" }
  }
}
```
Sets HttpOnly cookies: `token` (15 min) and `refreshToken` (7 days).

**Error 400:** Email already exists or validation failure.

---

### POST `/api/v1/auth/login`
Authenticate and receive session cookies.

**Auth required:** No  
**Rate limit:** 10 attempts per 15 min per IP. Account locks after 5 failed attempts (30 min lockout).

**Request body:**
```json
{
  "email": "rajesh@bihar.gov.in",
  "password": "Secure@1234"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": { "id": 1, "name": "Rajesh Kumar", "role": "OFFICER" }
  }
}
```
Sets HttpOnly cookies: `token` and `refreshToken`.

**Error 401:** Invalid credentials.  
**Error 423:** Account locked — includes `minutesLeft` in response.

---

### POST `/api/v1/auth/refresh`
Exchange a valid refresh token for a new access token. Called automatically by the frontend on 401.

**Auth required:** `refreshToken` cookie  
**Request body:** None

**Response 200:** Sets new `token` cookie.

**Error 401:** Refresh token expired, revoked, or not found.

---

### POST `/api/v1/auth/logout`
Revoke refresh token and clear both cookies.

**Auth required:** Yes

**Response 200:**
```json
{ "success": true }
```

---

### GET `/api/v1/auth/profile`
Get the authenticated user's profile.

**Auth required:** Yes

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Rajesh Kumar",
    "email": "rajesh@bihar.gov.in",
    "role": "OFFICER",
    "last_login_at": "2025-04-20T08:30:00Z",
    "created_at": "2025-01-15T10:00:00Z"
  }
}
```

---

### GET `/api/v1/csrf-token`
Get a CSRF token to include in state-changing requests.

**Auth required:** No  
**Response 200:**
```json
{ "csrfToken": "abc123..." }
```

---

## FIR Endpoints — `/api/v1/fir`

---

### POST `/api/v1/fir`
Register a single new FIR.

**Auth required:** Yes — `ADMIN`, `OFFICER`

**Request body:**
```json
{
  "fir_no": "123/2025",
  "crime_type": "Theft",
  "act_type": "IPC",
  "section": "379",
  "section_code": "379",
  "classification_id": 12,
  "severity": 2,
  "occurred_at": "2025-04-15T22:30:00+05:30",
  "latitude": 25.5941,
  "longitude": 85.1376,
  "location_name": "Gandhi Maidan, Patna",
  "police_station": "Patna Sadar",
  "zone": "Patna",
  "victim_gender": "MALE",
  "victim_age": 35,
  "victim_count": 1,
  "description": "Complainant's motorcycle stolen from Gandhi Maidan parking.",
  "status": "PENDING"
}
```

| Field | Required | Notes |
|---|---|---|
| `fir_no` | Yes | Must be unique |
| `crime_type` | Yes | Human-readable label |
| `occurred_at` | Yes | ISO 8601 with timezone |
| `latitude` + `longitude` | No | If omitted, location is NULL |
| `severity` | No | 1–5, default 1 |
| `status` | No | Default `PENDING` |

**Response 201:**
```json
{
  "success": true,
  "data": { "id": 101, "fir_no": "123/2025" }
}
```

---

### POST `/api/v1/fir/bulk`
Import multiple FIRs in one request. Maximum 500 per batch. Duplicates (same `fir_no`) are skipped, not errored.

**Auth required:** Yes — `ADMIN`, `OFFICER`

**Request body:**
```json
{
  "firs": [
    { "fir_no": "001/2025", "crime_type": "Robbery", "occurred_at": "2025-03-01T18:00:00Z", ... },
    { "fir_no": "002/2025", "crime_type": "Theft",   "occurred_at": "2025-03-02T09:30:00Z", ... }
  ]
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "inserted": 48,
    "skipped": 2,
    "errors": []
  }
}
```

---

### POST `/api/v1/fir/cctns`
Import FIRs from a CCTNS-format payload (Bihar Police national system format).

**Auth required:** Yes — `ADMIN`

**Request body:** CCTNS JSON format (see `CCTNS_FORMAT.md`)

**Response 200:** Same as bulk import.

---

### GET `/api/v1/fir`
List FIRs with filters and pagination.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `zone` | string | — | Filter by district/zone name |
| `police_station` | string | — | Filter by police station |
| `crime_type` | string | — | Filter by crime type |
| `act_type` | string | — | Filter by act (IPC, POCSO, etc.) |
| `status` | string | — | Filter by FIR status |
| `severity` | integer | — | Filter by severity (1–5) |
| `fromDate` | ISO date | — | `occurred_at >= fromDate` |
| `toDate` | ISO date | — | `occurred_at <= toDate` |
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Max 200 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "firs": [
      {
        "id": 101,
        "fir_no": "123/2025",
        "crime_type": "Theft",
        "zone": "Patna",
        "police_station": "Patna Sadar",
        "severity": 2,
        "occurred_at": "2025-04-15T17:00:00Z",
        "status": "PENDING",
        "latitude": 25.5941,
        "longitude": 85.1376
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1234,
      "total_pages": 25
    }
  }
}
```

---

### GET `/api/v1/fir/search`
Full-text search across FIR descriptions, locations, and crime types.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Required | Description |
|---|---|---|---|
| `q` | string | Yes | Search query (e.g. `"knife NH-28"`) |
| `zone` | string | No | Limit to zone |
| `page` | integer | No | Default 1 |
| `limit` | integer | No | Default 50 |

**Response 200:** Same shape as list endpoint, with additional `relevance` score per FIR.

---

### GET `/api/v1/fir/:id`
Get a single FIR by ID.

**Auth required:** Yes

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 101,
    "fir_no": "123/2025",
    "crime_type": "Theft",
    "classification": { "title": "Theft", "section_code": "379", "severity": 2 },
    "occurred_at": "2025-04-15T17:00:00Z",
    "location_name": "Gandhi Maidan, Patna",
    "latitude": 25.5941,
    "longitude": 85.1376,
    "zone": "Patna",
    "police_station": "Patna Sadar",
    "victim_gender": "MALE",
    "victim_age": 35,
    "status": "PENDING",
    "attachments": [],
    "registered_by": { "id": 1, "name": "Rajesh Kumar" }
  }
}
```

---

### POST `/api/v1/fir/:id/attachments`
Upload a file attachment to a FIR (photos, PDFs, etc.).

**Auth required:** Yes — `ADMIN`, `OFFICER`  
**Content-Type:** `multipart/form-data`  
**Limits:** Max 5 attachments per FIR, max 10MB per file. Allowed: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

**Form fields:**
| Field | Type | Description |
|---|---|---|
| `file` | File | The attachment |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "original_name": "crime_scene.jpg",
    "mime_type": "image/jpeg",
    "size_bytes": 204800
  }
}
```

---

### GET `/api/v1/fir/:id/attachments/:attachmentId/download`
Get a pre-signed download URL for an attachment (valid 1 hour).

**Auth required:** Yes

**Response 302:** Redirects to pre-signed S3 URL.

---

## Hotspot Endpoints — `/api/v1/hotspots`

---

### GET `/api/v1/hotspots`
Run DBSCAN clustering and KDE heatmap on filtered FIRs. Results cached 30 min in Redis.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `zone` | string | — | Filter by zone |
| `crimeType` | string | — | Filter by crime type |
| `fromDate` | ISO date | 90 days ago | Start of analysis window |
| `toDate` | ISO date | today | End of analysis window |
| `eps` | number | 300 | DBSCAN epsilon in meters |
| `minPts` | integer | 4 | DBSCAN minimum points |
| `bandwidth` | number | 500 | KDE bandwidth in meters |
| `gridSize` | integer | 30 | KDE grid resolution |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "clusters": [
      {
        "cluster_id": 0,
        "centroid": { "lat": 25.612, "lon": 85.143 },
        "crime_count": 14,
        "crime_types": ["Theft", "Robbery"],
        "member_ids": [12, 34, 56]
      }
    ],
    "heat_points": [
      { "lat": 25.61, "lon": 85.14, "intensity": 0.85 }
    ],
    "from_cache": false,
    "total_firs_analyzed": 342
  }
}
```

---

## Analytics Endpoints — `/api/v1/analytics`

---

### GET `/api/v1/analytics/zones`
Crime totals and statistics per zone (district or station).

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `type` | string | `DISTRICT` | `DISTRICT` or `STATION` |
| `fromDate` | ISO date | 30 days ago | — |
| `toDate` | ISO date | today | — |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "zone": "Patna",
      "total_firs": 423,
      "firs_last_7_days": 18,
      "firs_last_30_days": 74,
      "pending_firs": 31,
      "avg_severity": 2.4,
      "dominant_crime_type": "Theft"
    }
  ]
}
```

---

### GET `/api/v1/analytics/seasonal`
Crime distribution by month, day of week, and hour of day.

**Auth required:** Yes

**Query parameters:** `zone`, `crimeType`, `year` (default current year)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "monthly": [
      { "month": 1, "month_name": "Jan", "count": 89 },
      { "month": 2, "month_name": "Feb", "count": 76 }
    ],
    "by_day_of_week": [
      { "day": 0, "day_name": "Sunday", "count": 124 }
    ],
    "by_hour": [
      { "hour": 0, "count": 34 },
      { "hour": 22, "count": 67 }
    ]
  }
}
```

---

### GET `/api/v1/analytics/forecast`
30-day crime count forecast using Facebook Prophet.

**Auth required:** Yes

**Query parameters:** `zone`, `crimeType`, `periods` (default 30)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "forecast": [
      {
        "date": "2025-05-01",
        "predicted": 12.4,
        "lower_bound": 8.1,
        "upper_bound": 16.7
      }
    ],
    "trend": "increasing",
    "fallback_used": false
  }
}
```

---

### POST `/api/v1/analytics/behavioral`
Cluster FIRs by behavioral patterns (time, severity, crime type).

**Auth required:** Yes

**Request body:**
```json
{
  "zone": "Patna",
  "fromDate": "2025-01-01",
  "toDate": "2025-12-31"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "clusters": [
      {
        "cluster_id": 0,
        "pattern_tags": ["NightTime", "HighSeverity"],
        "crime_count": 45,
        "dominant_crime": "Robbery",
        "avg_hour": 22.3
      }
    ]
  }
}
```

---

### GET `/api/v1/analytics/women-safety`
Weighted KDE heatmap for women-safety related crimes.

**Auth required:** Yes

**Query parameters:** `zone`, `fromDate`, `toDate`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "heat_points": [
      { "lat": 25.61, "lon": 85.14, "intensity": 0.92 }
    ],
    "total_incidents": 87
  }
}
```

---

### GET `/api/v1/analytics/risk`
Zone-level risk scores (0–100) with SHAP explanations.

**Auth required:** Yes

**Query parameters:** `zone`, `type` (DISTRICT or STATION)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "zone": "Patna",
      "risk_score": 78.4,
      "dominant_factor": "frequency",
      "explanation": "Risk driven primarily by frequency (+0.42)",
      "shap_contributions": {
        "frequency": 0.42,
        "severity": 0.21,
        "recency_days": 0.18,
        "hotspot_density": 0.12,
        "repeat_rate": 0.07
      }
    }
  ]
}
```

---

### GET `/api/v1/analytics/compare`
Side-by-side crime trend comparison for up to 4 zones.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Example |
|---|---|---|
| `zones` | CSV | `Patna,Muzaffarpur,Gaya` |
| `crimeType` | string | `Theft` |
| `year` | integer | `2025` |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "Patna": [
      { "month": "2025-01", "count": 89, "serious_count": 12 }
    ],
    "Muzaffarpur": [
      { "month": "2025-01", "count": 54, "serious_count": 8 }
    ]
  }
}
```

---

### POST `/api/v1/analytics/ask`
Natural language query — convert plain English to SQL and execute.

**Auth required:** Yes — `ADMIN`, `ANALYST`

**Request body:**
```json
{
  "question": "How many theft cases were registered in Patna last month?"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "sql": "SELECT COUNT(*) FROM firs WHERE zone='Patna' AND crime_type='Theft' AND occurred_at >= '2025-03-01'",
    "rows": [[47]],
    "fields": ["count"]
  }
}
```

---

### GET `/api/v1/analytics/export/csv`
Export filtered FIRs as a CSV file download.

**Auth required:** Yes  
**Response:** `Content-Type: text/csv` with `Content-Disposition: attachment`

**Query parameters:** `zone`, `fromDate`, `toDate`, `crimeType`, `status`

---

### GET `/api/v1/analytics/heatmap-timeline`
Monthly KDE heatmap data for the animated time-slider.

**Auth required:** Yes

**Query parameters:** `zone`, `crimeType`, `fromDate`, `toDate`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "buckets": [
      {
        "bucket": "2025-01",
        "heat_points": [{ "lat": 25.61, "lon": 85.14, "intensity": 0.72 }]
      },
      {
        "bucket": "2025-02",
        "heat_points": [{ "lat": 25.62, "lon": 85.15, "intensity": 0.84 }]
      }
    ]
  }
}
```

---

## ML Endpoints — `/api/v1/ml`
These are backend proxies to the Python ML service. The ML service itself is not publicly accessible.

---

### POST `/api/v1/ml/cluster`
Run DBSCAN clustering directly with custom parameters.

**Auth required:** Yes

**Request body:**
```json
{
  "incidents": [
    { "id": 1, "lat": 25.59, "lon": 85.13 },
    { "id": 2, "lat": 25.60, "lon": 85.14 }
  ],
  "eps_meters": 300,
  "min_samples": 4
}
```

**Response 200:**
```json
{
  "clusters": [
    { "cluster_id": 0, "centroid": { "lat": 25.595, "lon": 85.135 }, "crime_count": 8, "member_ids": [1,2,3] }
  ],
  "noise": [4, 5]
}
```

---

### POST `/api/v1/ml/hotspots/kde`
Generate KDE heatmap from a list of incidents.

**Auth required:** Yes

**Request body:**
```json
{
  "incidents": [{ "lat": 25.59, "lon": 85.13 }],
  "bandwidth_meters": 500,
  "grid_size": 30,
  "weights": [1.0, 2.0]
}
```

---

### POST `/api/v1/ml/forecast`
Time-series forecast using Prophet.

**Request body:**
```json
{
  "time_series": [
    { "ds": "2025-01-01", "y": 12 },
    { "ds": "2025-01-02", "y": 15 }
  ],
  "periods": 30,
  "frequency": "D"
}
```

---

### POST `/api/v1/ml/routes/optimize`
Generate optimized patrol route using OR-Tools VRP.

**Request body:**
```json
{
  "depot": { "lat": 25.5941, "lon": 85.1376 },
  "stops": [
    { "lat": 25.601, "lon": 85.142, "risk_score": 65 },
    { "lat": 25.612, "lon": 85.155, "risk_score": 82 }
  ],
  "num_vehicles": 2
}
```

**Response 200:**
```json
{
  "routes": [
    { "vehicle": 0, "stops": [0, 2, 1], "total_distance_km": 12.4 }
  ]
}
```

---

### POST `/api/v1/ml/classify/train`
Train the Random Forest crime classifier. Returns immediately with a job ID (background job).

**Auth required:** Yes — `ADMIN`

**Request body:**
```json
{
  "fir_records": [
    { "hour": 22, "day_of_week": 5, "month": 3, "zone": "Patna", "act_type": "IPC", "severity": 2, "crime_category": "Property" }
  ]
}
```

**Response 202:**
```json
{
  "success": true,
  "data": { "jobId": "abc-123", "message": "Training queued. Poll /ml/jobs/abc-123 for status." }
}
```

---

### GET `/api/v1/ml/jobs/:jobId`
Poll background ML job status.

**Response 200:**
```json
{
  "jobId": "abc-123",
  "state": "completed",
  "result": {
    "accuracy": 0.873,
    "macro_f1": 0.841,
    "weighted_f1": 0.869,
    "samples_trained": 9960,
    "samples_tested": 2490
  }
}
```

States: `waiting`, `active`, `completed`, `failed`

---

### POST `/api/v1/ml/classify/cross-validate`
Run k-fold cross-validation on the classifier.

**Response 200:**
```json
{
  "k_folds": 5,
  "fold_scores": [0.87, 0.84, 0.89, 0.86, 0.85],
  "mean_f1": 0.862,
  "std_f1": 0.018,
  "confidence_interval_95": [0.827, 0.897]
}
```

---

### POST `/api/v1/ml/spatial/morans-i`
Compute Global Moran's I for spatial autocorrelation significance testing.

**Request body:**
```json
{
  "incidents": [
    { "lat": 25.59, "lon": 85.13, "count": 12 }
  ],
  "k_neighbors": 5
}
```

**Response 200:**
```json
{
  "morans_i": 0.712,
  "expected_i": -0.026,
  "z_score": 8.43,
  "p_value": 0.0001,
  "is_significant": true,
  "interpretation": "Strong spatial clustering (non-random)"
}
```

---

### POST `/api/v1/ml/evaluation/pai`
Compute PAI (Predictive Accuracy Index) for hotspot evaluation.

**Response 200:**
```json
{
  "pai": 7.4,
  "crimes_captured": 312,
  "total_crimes": 420,
  "pct_crimes_captured": 74.3,
  "pct_area_flagged": 10.0,
  "rating": "Good"
}
```

---

### POST `/api/v1/ml/anomaly/detect`
Detect unusual crime spikes in time-series data.

**Response 200:**
```json
{
  "results": [
    { "date": "2025-04-01", "zone": "Patna", "count": 45, "is_anomaly": false, "z_score": 0.8 },
    { "date": "2025-04-15", "zone": "Patna", "count": 134, "is_anomaly": true, "z_score": 4.2, "severity": "critical" }
  ]
}
```

---

### POST `/api/v1/ml/near-repeat`
Score candidate locations for near-repeat victimization risk.

**Response 200:**
```json
{
  "results": [
    { "lat": 25.60, "lon": 85.14, "near_repeat_risk": 3.2, "contributing_crimes": 4, "risk_level": "high" }
  ]
}
```

---

### POST `/api/v1/ml/nlp/extract`
Extract named entities from FIR description text (locations, persons, vehicles, phones).

**Request body:**
```json
{
  "records": [
    { "fir_no": "123/2025", "description": "Complainant's vehicle MH-12-AB-1234 stolen near Gandhi Maidan." }
  ]
}
```

**Response 200:**
```json
{
  "results": [
    {
      "fir_no": "123/2025",
      "extracted_entities": {
        "locations": ["Gandhi Maidan"],
        "persons": [],
        "vehicle_numbers": ["MH-12-AB-1234"],
        "phone_numbers": []
      }
    }
  ]
}
```

---

## Zone Endpoints — `/api/v1/zones`

---

### GET `/api/v1/zones`
List all zone boundaries as GeoJSON.

**Auth required:** Yes

**Query parameters:** `type` (DISTRICT or STATION)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Patna",
      "type": "DISTRICT",
      "area_km2": 3202.5,
      "boundary": { "type": "MultiPolygon", "coordinates": [...] }
    }
  ]
}
```

---

## Crime Classification Endpoints — `/api/v1/classifications`

---

### GET `/api/v1/classifications`
List all crime classifications (IPC sections and special acts).

**Auth required:** Yes

**Query parameters:** `act_type`, `category`, `is_women_safety` (true/false)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "act_type": "IPC",
      "section_code": "302",
      "title": "Murder",
      "category": "Violent",
      "severity": 5,
      "is_women_safety": false,
      "is_cognizable": true
    }
  ]
}
```

---

## IRAD Endpoints — `/api/v1/irad`

---

### POST `/api/v1/irad/ingest`
Ingest road accident data from IRAD system.

**Auth required:** Yes — `ADMIN`

**Request body:**
```json
{
  "accidents": [
    {
      "accident_id": "IRAD-2025-001",
      "occurred_at": "2025-04-10T14:30:00Z",
      "severity": 2,
      "latitude": 25.6012,
      "longitude": 85.1502,
      "road_name": "NH-28",
      "district": "Patna",
      "casualties": 1,
      "injuries": 3,
      "weather_condition": "CLEAR"
    }
  ]
}
```

**Response 200:**
```json
{ "success": true, "data": { "inserted": 1, "skipped": 0 } }
```

---

### GET `/api/v1/irad`
List IRAD accidents with filters.

**Query parameters:** `district`, `severity`, `fromDate`, `toDate`, `page`, `limit`

---

### GET `/api/v1/irad/hotspots`
DBSCAN clustering of IRAD accident locations.

**Query parameters:** `district`, `fromDate`, `toDate`, `eps` (default 500), `minPts` (default 3)

---

## Patrol Endpoints — `/api/v1/patrol`

---

### POST `/api/v1/patrol/routes`
Generate an optimized patrol route using OR-Tools VRP.

**Auth required:** Yes — `ADMIN`, `OFFICER`

**Request body:**
```json
{
  "name": "Patna Night Patrol 2025-04-20",
  "zone": "Patna",
  "depot": { "lat": 25.5941, "lon": 85.1376 },
  "stops": [
    { "lat": 25.601, "lon": 85.142, "stop_name": "Gandhi Maidan", "crime_count": 14 },
    { "lat": 25.612, "lon": 85.155, "stop_name": "Boring Road", "crime_count": 8 }
  ],
  "num_vehicles": 1,
  "scheduled_for": "2025-04-21T20:00:00Z"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 42,
    "name": "Patna Night Patrol 2025-04-20",
    "total_distance_km": 18.4,
    "estimated_duration_min": 120,
    "stops": [
      { "sequence": 1, "stop_name": "Gandhi Maidan", "risk_score": 72.1 },
      { "sequence": 2, "stop_name": "Boring Road", "risk_score": 58.3 }
    ]
  }
}
```

---

### GET `/api/v1/patrol/routes`
List patrol routes.

**Query parameters:** `status`, `zone`, `page`, `limit`

---

### GET `/api/v1/patrol/routes/:id`
Get single patrol route with all stops.

---

### GET `/api/v1/patrol/schedule`
List scheduled patrol routes for a date range.

**Query parameters:** `fromDate`, `toDate`, `zone`

---

### POST `/api/v1/patrol/logs`
Record patrol execution (actual vs planned).

**Auth required:** Yes — `ADMIN`, `OFFICER`

**Request body:**
```json
{
  "route_id": 42,
  "unit_id": 3,
  "started_at": "2025-04-21T20:05:00Z",
  "completed_at": "2025-04-21T22:15:00Z",
  "stops_visited": 6,
  "stops_planned": 7,
  "coverage_pct": 85.7,
  "incidents_encountered": 1
}
```

---

## Geo-Fence Endpoints — `/api/v1/geo-fences`

---

### POST `/api/v1/geo-fences`
Create a new geo-fence sensitive area.

**Auth required:** Yes — `ADMIN`

**Request body:**
```json
{
  "name": "Patna City Hospital",
  "type": "HOSPITAL",
  "boundary": {
    "type": "Polygon",
    "coordinates": [[[85.134, 25.612], [85.138, 25.612], [85.138, 25.615], [85.134, 25.615], [85.134, 25.612]]]
  },
  "alert_radius_m": 300,
  "notify_roles": ["ADMIN", "OFFICER"]
}
```

---

### GET `/api/v1/geo-fences`
List all geo-fences.

**Query parameters:** `type`, `active` (true/false)

---

### PATCH `/api/v1/geo-fences/:id`
Update geo-fence (name, alert radius, active status).

---

### DELETE `/api/v1/geo-fences/:id`
Delete a geo-fence. **Auth required:** `ADMIN`

---

## Events Endpoint — `/api/v1/events`

---

### GET `/api/v1/events/subscribe`
Subscribe to real-time SSE stream for live notifications.

**Auth required:** Yes  
**Response:** `Content-Type: text/event-stream`

**Events emitted:**
| Event name | Payload | Trigger |
|---|---|---|
| `fir_created` | `{ count, zone, timestamp }` | New FIR registered or bulk imported |
| `crime_spike_alert` | `{ anomalies: [{zone, count, z_score}] }` | Anomaly detection finds critical spike |
| `geo_fence_alert` | `{ fir_no, crime_type, zones_violated: [] }` | FIR location inside geo-fence |

**Frontend usage:**
```javascript
const es = new EventSource('/api/v1/events/subscribe', { withCredentials: true });
es.addEventListener('fir_created', (e) => {
  const data = JSON.parse(e.data);
  // Update dashboard counters
});
```

---

## Health Endpoint — `/api/v1/health`

---

### GET `/api/v1/health`
Check health of all system components.

**Auth required:** No (for monitoring tools)

**Response 200 (all healthy):**
```json
{
  "status": "ok",
  "timestamp": "2025-04-20T10:30:00Z",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "ok" },
    "cache": { "status": "ok" },
    "ml_service": { "status": "ok" }
  }
}
```

**Response 503 (degraded):**
```json
{
  "status": "degraded",
  "checks": {
    "database": { "status": "ok" },
    "cache": { "status": "error", "error": "Connection refused" },
    "ml_service": { "status": "ok" }
  }
}
```

---

## Women Safety Endpoints — `/api/v1/analytics/women-safety`

---

### GET `/api/v1/analytics/women-safety`
Fetch severity-weighted KDE heatmap data for women safety crimes.

**Auth required:** Yes

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `zone` | string | all | Filter by district or station |
| `fromDate` | ISO date | -30d | Start date |
| `toDate` | ISO date | today | End date |
| `bandwidth_meters` | integer | 500 | KDE bandwidth |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "heat_points": [
      { "lat": 25.601, "lon": 85.142, "intensity": 0.87 },
      { "lat": 25.612, "lon": 85.155, "intensity": 0.54 }
    ],
    "total_incidents": 142,
    "top_zones": [
      { "name": "Patna Central", "count": 34, "risk_level": "high" }
    ]
  }
}
```

---

### GET `/api/v1/analytics/women-safety/firs`
List FIRs classified as women-safety crimes.

**Auth required:** Yes

**Query parameters:** `zone`, `fromDate`, `toDate`, `status`, `page`, `limit`

---

## Users Endpoints — `/api/v1/users`

**Auth required for all:** `ADMIN` only

---

### GET `/api/v1/users`
List all users with optional filters.

**Query parameters:** `role`, `page`, `limit`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "users": [
      { "id": 1, "name": "Rajesh Kumar", "email": "rajesh@bihar.gov.in", "role": "OFFICER", "created_at": "2025-01-10T..." }
    ],
    "pagination": { "page": 1, "limit": 25, "total": 84 }
  }
}
```

---

### PATCH `/api/v1/users/:id`
Update user role or status.

**Request body:**
```json
{ "role": "ANALYST", "is_active": true }
```

---

### DELETE `/api/v1/users/:id`
Deactivate (soft-delete) a user account.

---

### POST `/api/v1/users/:id/reset-password`
Admin-initiated password reset for a user. Sends reset email.

---

## Audit Log Endpoints — `/api/v1/audit`

**Auth required:** `ADMIN` only

---

### GET `/api/v1/audit`
List audit log entries for all API actions.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `userId` | integer | Filter by user |
| `action` | string | e.g. `FIR_CREATE`, `LOGIN`, `ROUTE_GENERATE` |
| `fromDate` | ISO date | Start date |
| `toDate` | ISO date | End date |
| `page` | integer | Pagination (default 1) |
| `limit` | integer | Per page (default 50, max 200) |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": 1001,
        "user_id": 5,
        "user_name": "Rajesh Kumar",
        "action": "FIR_CREATE",
        "resource": "firs",
        "resource_id": "FIR-2026-05-09-001",
        "ip": "192.168.1.10",
        "created_at": "2026-05-09T10:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 50, "total": 2341 }
  }
}
```

**Audited actions:**
`LOGIN`, `LOGOUT`, `FIR_CREATE`, `FIR_UPDATE`, `FIR_DELETE`, `FIR_BULK_IMPORT`,
`ROUTE_GENERATE`, `HOTSPOT_CLUSTER`, `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`,
`GEO_FENCE_CREATE`, `GEO_FENCE_DELETE`, `EXPORT_CSV`, `ML_TRAIN`

---

## Mobile-Specific Endpoints

These endpoints are required by the mobile app and are either new additions or clarified here for mobile context.

---

### GET `/api/v1/users/me`
Get the authenticated user's own profile (any role).

**Auth required:** Yes

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "name": "Rajesh Kumar",
    "email": "rajesh@bihar.gov.in",
    "role": "OFFICER",
    "policeStation": "Patna Sadar",
    "zone": "Patna",
    "createdAt": "2025-01-10T08:00:00Z"
  }
}
```

Used by the mobile app immediately after login to populate local user state and determine role-based navigation.

---

### PATCH `/api/v1/users/me/fcm-token`
Register or refresh the device's FCM push token. Called on app start and when FCM issues a new token.

**Auth required:** Yes

**Request body:**
```json
{ "fcmToken": "fGxyz...APA91b" }
```

**Response 200:**
```json
{ "success": true, "data": { "message": "FCM token updated" } }
```

The backend stores the token on the `users` row and uses it to send targeted push notifications via Firebase Admin SDK.

---

### GET `/api/v1/dashboard/summary`
Aggregated KPI payload optimized for the mobile Dashboard screen. Returns all top-level numbers in a single call to minimize round trips on mobile networks.

**Auth required:** Yes

**Query parameters:** `zone` (default: user's assigned zone)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "activeHotspots": 127,
    "stationsCovered": 42,
    "forecastConfidence": 80,
    "pendingFirs": 31,
    "firsLast24h": 14,
    "firsLast7d": 87,
    "highRiskZones": ["Patna Central", "Muzaffarpur North"],
    "topCrimeType": "Theft",
    "generatedAt": "2026-05-09T10:30:00Z"
  }
}
```

---

### GET `/api/v1/alerts`
List recent crime spike alerts for the mobile Alerts screen. Alerts are generated by the anomaly detection pipeline.

**Auth required:** Yes

**Query parameters:**
| Param | Type | Default | Description |
|---|---|---|---|
| `zone` | string | user zone | Filter by zone |
| `severity` | string | — | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |
| `unreadOnly` | boolean | false | Return only unread alerts |
| `page` | integer | 1 | — |
| `limit` | integer | 20 | Max 100 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "a1b2c3d4",
        "zone": "Patna Central",
        "crimeType": "Robbery",
        "count": 134,
        "zScore": 4.2,
        "severity": "CRITICAL",
        "message": "Crime spike detected in Patna Central — 134 incidents (z-score 4.2)",
        "isRead": false,
        "receivedAt": "2026-05-09T09:15:00Z"
      }
    ],
    "unreadCount": 3,
    "pagination": { "page": 1, "limit": 20, "total": 7 }
  }
}
```

---

### GET `/api/v1/alerts/:id`
Fetch a single alert by ID and mark it as read.

**Auth required:** Yes

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4",
    "zone": "Patna Central",
    "crimeType": "Robbery",
    "count": 134,
    "zScore": 4.2,
    "severity": "CRITICAL",
    "message": "Crime spike detected in Patna Central — 134 incidents (z-score 4.2)",
    "anomalyDetails": {
      "expected": 18.3,
      "actual": 134,
      "stdDev": 28.1,
      "windowDays": 7
    },
    "isRead": true,
    "receivedAt": "2026-05-09T09:15:00Z"
  }
}
```

---

### PATCH `/api/v1/alerts/:id/read`
Explicitly mark a single alert as read without fetching its full detail.

**Auth required:** Yes

**Response 200:**
```json
{ "success": true, "data": { "message": "Alert marked as read" } }
```

---

## Error Reference

| HTTP Code | Meaning | When |
|---|---|---|
| 400 | Bad Request | Validation failed — check `errors` array in response |
| 401 | Unauthorized | No token, expired token, or invalid token |
| 403 | Forbidden | Authenticated but wrong role for this endpoint |
| 404 | Not Found | Resource ID does not exist |
| 409 | Conflict | Duplicate `fir_no` on single FIR create |
| 422 | Unprocessable | Request shape is valid JSON but fails business rules |
| 423 | Locked | Account locked after too many failed login attempts |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected backend error — check logs |
| 503 | Service Unavailable | ML service down (circuit breaker open) or DB unreachable |
