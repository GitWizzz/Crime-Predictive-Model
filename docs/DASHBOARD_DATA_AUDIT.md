# Dashboard Data Audit

Status as of **2026-05-10**. Every visible field on the dashboard is catalogued below — what drives it, whether it is live data or a computed approximation, and what (if anything) is still hardcoded.

---

## 1. Header / Greeting

| Field | Status | Source |
|---|---|---|
| Date line (weekday, date) | ✅ Live | `new Date()` — renders current date and day at page load |
| Greeting (morning / afternoon / evening) | ✅ Live | `new Date().getHours()` |
| Officer first name | ✅ Live | `authUser.name` from `localStorage("authUser")` |
| Zone / station sub-heading | ✅ Live | `authUser.zone` or `authUser.policeStation` from `localStorage` |
| Station count | ✅ Live | `GET /api/zones?type=STATION` → `totals.length` |
| Pending FIRs count | ✅ Live | `GET /api/dashboard/summary` → `data.pendingFirs` |

---

## 2. Alert Banner (spike detected)

| Field | Status | Source |
|---|---|---|
| Top crime type | ✅ Live | `GET /api/dashboard/summary` → `data.topCrimeType` |
| High-risk zone name | ✅ Live | `GET /api/dashboard/summary` → `data.highRiskZones[0]` |
| Forecast confidence % | ✅ Live | `GET /api/dashboard/summary` → `data.forecastConfidence` |
| Zone list in sub-line | ✅ Live | `data.highRiskZones.slice(0, 3)` |

---

## 3. KPI Stat Cards

### FIRs This Week
| Field | Status | Source |
|---|---|---|
| Main value | ✅ Live | `GET /api/dashboard/summary` → `firsLast7d` |
| Delta badge "+12.3%" | ⚠️ Hardcoded | No week-over-week comparison API. Needs `/api/dashboard/summary` to return `firsDelta` |
| Sparkline bars | ⚠️ Static array | `sparkSets.firs` — 11 hardcoded weekly values. **Fix**: derive from per-week FIR counts |
| "vs N last week" note | ⚠️ Approximation | `firLast7Days - 137` — 137 is hardcoded as last-week baseline |

### Open Cases
| Field | Status | Source |
|---|---|---|
| Main value | ✅ Live | `GET /api/dashboard/summary` → `pendingFirs` (or 25.5% of total as fallback) |
| Delta badge "58%" | ⚠️ Hardcoded | No open-rate API field |
| "N escalated today" | ⚠️ Approximation | `hotspotTotal / 3` — derived from hotspot count |
| Sparkline bars | ⚠️ Static array | `sparkSets.cases` |

### Avg Response Time
| Field | Status | Source |
|---|---|---|
| Main value (minutes) | ⚠️ Approximation | `18 - hotspotTotal/12` — there is no dispatch/response-time table |
| Delta "-2.1m" | ⚠️ Hardcoded | No response-time history |
| Sparkline | ⚠️ Static array | `sparkSets.response` |
| **To make live** | — | Add `patrol_logs` with `dispatched_at` / `arrived_at` columns and compute avg delta |

### Patrol Units Active
| Field | Status | Source |
|---|---|---|
| Main value | ⚠️ Approximation | Uses `stationTotal` as proxy (each station = 1 unit) |
| "/ 56" denominator | ⚠️ Hardcoded | Fixed fleet size of 56 |
| Delta "6 behind" | ⚠️ Hardcoded | No real patrol schedule data |
| Sparkline | ⚠️ Static array | `sparkSets.patrols` |
| **To make live** | — | `GET /api/patrol/logs?status=active` would give real unit count |

---

## 4. Hotspot Map

| Field | Status | Source |
|---|---|---|
| DBSCAN clusters on map | ✅ Live | `GET /api/hotspots` → ML DBSCAN via Python service |
| District boundary polygons | ✅ Live | `GET /api/zones?type=DISTRICT` → GeoJSON |
| State boundary | ✅ Live | Computed from union of district boundaries (PostGIS) or null (fallback) |
| Priority zone label | ✅ Live | Top hotspot `clusterId` or `highRiskZones[0]` |

---

## 5. ML Signal Cards

### Forecast Signal
| Field | Status | Source |
|---|---|---|
| Low–High range | ✅ Live | `POST /api/ml/forecast` → Prophet model, 14-day window |
| "~N incidents/day" | ✅ Live | Mean of first 7 forecast points |
| Fallback text | ✅ Live | Shown when < 2 FIR data points available |

### Risk Signal
| Field | Status | Source |
|---|---|---|
| Top district name | ✅ Live | `GET /api/analytics/risk` → highest-score district |
| Score value | ✅ Live | Composite score: `frequency×0.35 + severity×0.25 + recency×0.20 + density×0.10 + repeat_rate×0.10` |
| Incident count | ✅ Live | `frequency` field from risk model |

### Behavioral Clusters
| Field | Status | Source |
|---|---|---|
| A / B / C counts | ✅ Live | `POST /api/analytics/behavioral` → DBSCAN clustering on FIR locations |
| Cluster assignment | ✅ Fixed | **C** = violent crimes (Murder, Assault, Rape, Dacoity, Kidnapping, Robbery); **B** = property crimes (Theft, Burglary, Cheating, Fraud); **A** = other (Narcotics, etc.) |

### Seasonal Peak
| Field | Status | Source |
|---|---|---|
| Peak month label | ✅ Live | `GET /api/analytics/seasonal?granularity=month` → month with highest FIR count (1-year window) |
| Incident count | ✅ Live | `total` field for that month |

---

## 6. Recent FIRs Table

| Field | Status | Source |
|---|---|---|
| All 5 rows | ✅ Live | `GET /api/fir?startDate=30daysAgo&limit=1000` → sorted by `occurred_at` desc, top 5 |
| FIR ID | ✅ Live | `fir.id` |
| Crime type + risk colour | ✅ Live | `fir.crime_type`; colour based on type keywords |
| Zone | ✅ Live | `fir.zone` |
| Status badge | ✅ Live | `fir.status` (Open / Closed) |
| Time | ✅ Live | `fir.date_time` formatted to HH:MM |

---

## 7. Forecast Chart (Next 7 Days)

| Field | Status | Source |
|---|---|---|
| Low–High range (big number) | ✅ Live | `forecastWindow` from Prophet; falls back to `firLast7Days × 1.2/1.45` |
| Sparkline shape | ✅ Live | `forecastWindow.map(p => p.yhat)` |
| "Prophet" badge | ✅ Live (static label) | Indicates ML backend model used |
| Zone label "Patna zone" | ⚠️ Hardcoded | Should be `authUser.zone` |
| MAE estimate | ⚠️ Approximation | `(forecastHigh - forecastLow) / 4` — no actual MAE from Prophet |
| Trend (Rising/Stable) | ✅ Live | `forecastMid >= firLast7Days` |
| "80% CI" label | ⚠️ Hardcoded label | Prophet does return `yhat_lower` / `yhat_upper` but CI level is not returned from service |

---

## 8. Top Crime Types

| Field | Status | Source |
|---|---|---|
| All 6 bars | ✅ Live | Derived from FIR items: count by `crime_type`, top 6, sorted desc |
| Bar lengths | ✅ Live | Proportional to count |
| Colours | ✅ Live | Assigned by rank index |

---

## 9. Top Hotspots

| Field | Status | Source |
|---|---|---|
| Hotspot names (cluster IDs) | ✅ Live | `GET /api/hotspots` sorted by `crimeCount` |
| Incident counts | ✅ Live | `crimeCount` from ML cluster |
| Risk badge colour | ✅ Live | Top = high, 2nd–3rd = medium, rest = low |
| Delta % ("+18%", "+11%"…) | ⚠️ Hardcoded | Static strings — no week-over-week hotspot tracking |

---

## 10. Officer Leaderboard

| Field | Status | Source |
|---|---|---|
| Officer names | ✅ Live | `GET /api/analytics/officer-leaderboard?startDate=7daysAgo` |
| Police station | ✅ Live | `users.police_station` joined via `firs.registered_by` |
| FIR count | ✅ Live | `COUNT(firs)` grouped by `registered_by` for the date window |

---

## 11. Bottom 3 Summary Cards

### System Health
| Field | Status | Source |
|---|---|---|
| Ready / Review | ✅ Live | `GET /api/health` → `success` boolean |

### Incident Pressure
| Field | Status | Source |
|---|---|---|
| % value | ✅ Live | `(firLast7Days / firTotal) × 100` — real-time ratio |

### Special Layers
| Field | Status | Source |
|---|---|---|
| Combined signal count | ✅ Live | `womenSafetySignals (heat_points.length) + iradTotal` |
| Women safety data window | ✅ Fixed | Now uses **6-month** window (`sixMonthsAgo`) |
| IRAD data window | ✅ Fixed | Now uses **6-month** window — IRAD seed data runs to March 2026 |

---

## Known Gaps / Future Work

| Item | What's Needed |
|---|---|
| FIR sparkline (weekly bars) | Add `GET /api/analytics/weekly-counts?weeks=11` returning per-week FIR totals |
| Avg response time | Add `dispatched_at` + `arrived_at` to patrol_logs; expose `/api/patrol/avg-response` |
| Patrol units active | Add `GET /api/patrol/active-units` pulling from patrol_logs with active sessions |
| Hotspot delta % | Add hotspot snapshot comparison (current week vs. previous week cluster counts) |
| FIR delta % (stat card) | Add `firsDeltaPct` to `/api/dashboard/summary` using 7d-vs-7d comparison |
| Forecast zone name | Pass `authUser.zone` to forecast chart title |
| Prophet CI level | ML service could return `ci_level` in forecast response |
| Open-rate badge | Add `openRatePct` to `/api/dashboard/summary` |

---

## API Endpoints Used by Dashboard

| Endpoint | Method | Purpose | Window |
|---|---|---|---|
| `/api/health` | GET | System health | — |
| `/api/dashboard/summary` | GET | KPI summary | Rolling |
| `/api/fir` | GET | Recent FIRs + forecast series | Last 30 days |
| `/api/hotspots` | GET | DBSCAN cluster map | ML-computed |
| `/api/zones?type=DISTRICT` | GET | District GeoJSON + totals | All time |
| `/api/zones?type=STATION` | GET | Station count | All time |
| `/api/analytics/women-safety` | GET | Women safety heat points | Last 6 months |
| `/api/irad` | GET | Road accident count | Last 6 months |
| `/api/analytics/seasonal` | GET | Monthly crime pattern | Last 12 months |
| `/api/analytics/risk` | GET | District risk scores with `score` field | Last 6 months |
| `/api/analytics/behavioral` | POST | Behavioral clustering points | Last 6 months |
| `/api/ml/forecast` | POST | Prophet 14-day forecast | Based on FIR series |
| `/api/analytics/officer-leaderboard` | GET | Real officer FIR counts | Last 7 days |
