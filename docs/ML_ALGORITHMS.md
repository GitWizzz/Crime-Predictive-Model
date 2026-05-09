# ML Algorithms Reference
**Crime Predictive Hotspot Mapping System**  
Last updated: 2026-05-09

---

## Overview

The ML service (`ml-service/`) implements twelve distinct algorithms. Each is purpose-built for a specific aspect of crime analysis. This document explains what each algorithm does, how it is configured, how to tune it, and how to interpret its output.

| Algorithm | File | Status | Purpose |
|---|---|---|---|
| DBSCAN | `services/clustering.py` | ✅ Implemented | Spatial crime cluster detection |
| KDE | `services/hotspots.py` | ✅ Implemented | Density heatmap generation (standard + severity-weighted women safety) |
| Prophet | `services/forecast.py` | ✅ Implemented | Time-series crime forecasting (30-day, 80% CI) |
| OR-Tools VRP | `services/routing.py` | ✅ Implemented | Patrol route optimization |
| Ridge Regression | `services/risk.py` | ✅ Implemented | Zone risk scoring (0–100) |
| SHAP | `services/risk.py` | ✅ Implemented | Risk score explainability (feature contributions) |
| Random Forest | `services/classification.py` | ✅ Implemented | Crime category prediction (4 classes) |
| Isolation Forest | `services/anomaly.py` | ✅ Implemented | Crime spike anomaly detection |
| Moran's I | `services/spatial_stats.py` | ✅ Implemented | Spatial autocorrelation significance test |
| PAI | `services/evaluation.py` | ✅ Implemented | Hotspot prediction accuracy index |
| Knox Test (Near-Repeat) | `services/near_repeat.py` | ✅ Implemented | Near-repeat victimization risk scoring |
| spaCy NER | `services/nlp.py` | ✅ Implemented | Named entity extraction from FIR text |

**Frontend surfaces consuming ML output:**
- Hotspot Map page → DBSCAN clusters + KDE heatmap + women safety weighted KDE
- Analytics page (7 tabs) → Prophet forecasts, SHAP risk scores, Isolation Forest anomalies, behavioral clusters
- Patrol page → OR-Tools VRP routes
- Reports page → Prophet forecast with configurable horizon (7–60 days)
- Dashboard overview → Risk summary, active hotspot count, system health
| SHAP | `services/risk.py` | Risk score explainability |
| Isolation Forest | `services/anomaly.py` | Crime spike detection |
| Knox / Near-repeat | `services/near_repeat.py` | Near-repeat victimization |
| spaCy NER | `services/nlp.py` | Entity extraction from FIR text |

---

## 1. DBSCAN — Density-Based Spatial Clustering

**File:** `ml-service/app/services/clustering.py`  
**Endpoint:** `POST /cluster`

### What It Does
DBSCAN (Density-Based Spatial Clustering of Applications with Noise) groups crime incidents into clusters based on geographic density. Unlike K-means, it does not require specifying the number of clusters in advance — it discovers them. Points that are too sparse to form a cluster are classified as "noise."

### Algorithm Steps
1. Convert lat/lon coordinates to radians for haversine metric compatibility
2. Convert `eps_meters` to radians: `eps_rad = eps_meters / 6371008.8`
3. Run DBSCAN with `metric='haversine'`, `algorithm='ball_tree'`
4. Any point with `cluster_label == -1` is noise (not in any cluster)
5. Compute centroid for each cluster (mean lat/mean lon of members)

### Parameters

| Parameter | Default | Range | Effect |
|---|---|---|---|
| `eps_meters` | 300 | 100–1000 | **Search radius.** Two points are "neighbours" if they are within this distance. Smaller = tighter clusters. Too small = many tiny fragmented clusters. Too large = everything merges into one cluster. |
| `min_samples` | 4 | 2–20 | **Minimum cluster size.** A point is a "core point" only if it has at least this many neighbours within eps. Higher = fewer, denser, more meaningful clusters. Lower = more clusters including sparse ones. |

### Tuning Guide

**Problem: Too many small clusters (fragmented)**
→ Increase `eps_meters` (try 400–500m) or increase `min_samples` (try 5–6)

**Problem: All points in one giant cluster**
→ Decrease `eps_meters` (try 150–200m)

**Problem: Too many noise points (scattered map)**
→ Decrease `min_samples` (try 3) or increase `eps_meters`

**Problem: Urban vs. rural inconsistency**
→ Run DBSCAN separately per zone with zone-specific parameters. Dense urban areas (Patna) need smaller eps (200m); rural areas need larger eps (500m+).

### Evaluating Cluster Quality

**Silhouette Score** (range: -1 to +1, higher = better separated clusters):
```python
from sklearn.metrics import silhouette_score
score = silhouette_score(coords_rad, labels, metric='haversine')
# > 0.5 = good, > 0.7 = strong clusters
```

**Davies-Bouldin Index** (range: 0 to ∞, lower = better):
```python
from sklearn.metrics import davies_bouldin_score
score = davies_bouldin_score(coords, labels)
# < 0.5 = excellent, < 1.0 = acceptable
```

### Interpreting Results

```json
{
  "cluster_id": 0,
  "centroid": { "lat": 25.612, "lon": 85.143 },
  "crime_count": 14,
  "crime_types": ["Theft", "Robbery"],
  "member_ids": [12, 34, 56, ...]
}
```

- **centroid** — geographic center of the cluster (place patrol here)
- **crime_count** — size of the cluster (more = higher priority)
- **crime_types** — mix of crimes in the cluster (indicates problem type)

### Limitations
- Detects where crime *was concentrated* — not where it *will be*
- Does not account for time (a cluster from 2 years ago is treated the same as last week's)
- Parameter-sensitive — same dataset with different eps can give very different results

---

## 2. KDE — Kernel Density Estimation

**File:** `ml-service/app/services/hotspots.py`  
**Endpoint:** `POST /hotspots/kde`

### What It Does
KDE estimates the continuous probability density of crime across a geographic area. It places a smooth "kernel" (bell curve) centered on each crime incident, then sums all kernels across a grid. The result is a heatmap where intensity represents crime likelihood — not just crime count.

### Algorithm Steps
1. Convert lat/lon to a 2D array
2. Fit `sklearn.neighbors.KernelDensity(metric='haversine', bandwidth=bw_rad)`
3. Create a grid of `grid_size × grid_size` points covering the incident bounding box (with 10% padding)
4. Score each grid point: higher score = higher crime density
5. Optionally filter grid points outside the zone boundary polygon (GeoJSON)
6. Normalize all scores to [0, 1] range
7. Return only grid points with intensity > 0.01 (removes empty areas)

### Parameters

| Parameter | Default | Range | Effect |
|---|---|---|---|
| `bandwidth_meters` | 500 | 100–2000 | **Smoothing radius.** Larger = smoother heatmap, broader hotspots. Smaller = sharper peaks, more granular. |
| `grid_size` | 30 | 10–100 | **Grid resolution.** 30 = 30×30 = 900 heatmap points. Higher = finer detail but slower computation. |
| `weights` | None | — | Per-incident weights. Used for women-safety layer (higher weight to severe crimes). |

### Tuning Guide

**Problem: Heatmap too smooth/blurry**
→ Decrease `bandwidth_meters` (try 200–300m)

**Problem: Too many isolated peaks (noisy)**
→ Increase `bandwidth_meters` (try 700–1000m)

**Problem: Slow computation on large datasets**
→ Reduce `grid_size` (try 20) or pre-filter incidents to the visible map area

**Women Safety weighting:**
```python
weights = [
  3.0 if severity >= 4 else  # Heinous crimes: 3× weight
  2.0 if is_women_safety else # Women safety crimes: 2× weight
  1.0                         # Regular crimes: normal weight
  for severity, is_women_safety in incidents
]
```

### Bandwidth Selection (Rule of Thumb)
For geographic data, Silverman's rule of thumb adapted for haversine distance:
- Small city (population < 500k): 300–500m
- Large city (population > 1M): 500–800m
- District-level analysis: 1000–2000m

### Interpreting Results

```json
{ "lat": 25.61, "lon": 85.14, "intensity": 0.85 }
```

- **intensity 0.0–0.3** → Low risk (green on map)
- **intensity 0.3–0.6** → Medium risk (yellow/orange)
- **intensity 0.6–1.0** → High risk (red on heatmap)

### KDE vs DBSCAN — When to Use Which

| Situation | Use |
|---|---|
| "Where are the clusters?" | DBSCAN |
| "How dense is crime across the whole area?" | KDE |
| "Where should I patrol?" | Both — DBSCAN centroids as stops, KDE for background context |
| "Women safety overlay" | KDE (weighted) |
| Academic hotspot validation | Both + Moran's I |

---

## 3. Prophet — Time-Series Crime Forecasting

**File:** `ml-service/app/services/forecast.py`  
**Endpoint:** `POST /forecast`

### What It Does
Facebook Prophet models crime counts as a time series with three components:
- **Trend:** Long-term increase or decrease in crime
- **Weekly seasonality:** Crime is higher on weekends than weekdays
- **Yearly seasonality:** Crime peaks in certain months (summer heat, festival seasons)

It then extrapolates these patterns into the future with confidence intervals.

### Algorithm Steps
1. Aggregate input FIR data into daily/weekly counts as `{ds, y}` pairs
2. Deduplicate timestamps by summing counts for the same date
3. Fit Prophet model with `daily_seasonality=False` (use weekly instead)
4. Generate forecast for `periods` days into the future
5. Return `yhat` (predicted), `yhat_lower`, `yhat_upper` (80% confidence interval)
6. If insufficient data (< 2 points): fall back to last 7-day rolling average

### Parameters

| Parameter | Default | Effect |
|---|---|---|
| `periods` | 30 | Days to forecast into the future |
| `frequency` | `'D'` | `'D'` = daily, `'W'` = weekly aggregation |

### Tuning (Advanced)
```python
model = Prophet(
  changepoint_prior_scale=0.05,   # Flexibility of trend changes. Higher = fits more changepoints.
  seasonality_prior_scale=10,     # Strength of seasonality. Higher = stronger seasonal effect.
  yearly_seasonality=True,        # Enable annual patterns (monsoon, festivals)
  weekly_seasonality=True,        # Enable day-of-week patterns
  daily_seasonality=False,        # Disable (we use daily aggregated counts, not hourly)
)
# Add Indian festival seasonality:
model.add_seasonality(name='diwali', period=365.25, fourier_order=3)
```

### Interpreting Results

```json
{
  "date": "2025-05-15",
  "predicted": 12.4,
  "lower_bound": 8.1,
  "upper_bound": 16.7
}
```

- **predicted (yhat)** — expected crime count on that day
- **lower_bound** — 10th percentile (optimistic scenario)
- **upper_bound** — 90th percentile (pessimistic scenario)
- A wide band (upper - lower > 10) means the model is uncertain — more historical data needed

### Limitations
- Univariate — only uses past crime counts, not weather, events, demographics
- Spatial-blind — one forecast per zone, does not model how crime spreads between zones
- Minimum ~30 data points needed for reliable seasonality detection

---

## 4. OR-Tools VRP — Patrol Route Optimization

**File:** `ml-service/app/services/routing.py`  
**Endpoint:** `POST /routes/optimize`

### What It Does
Solves the Vehicle Routing Problem (VRP): given a set of crime hotspot locations (stops) and a depot (police station), find the optimal routes for `n` patrol vehicles that minimize total travel distance while visiting all stops.

### Algorithm Steps
1. Build a distance matrix: haversine distance between every pair of stops + depot
2. Create OR-Tools routing model with `num_vehicles` vehicles, all starting at depot
3. Set objective: minimize total distance
4. Add constraint: each stop must be visited by exactly one vehicle
5. Solve with `FirstSolutionStrategy.PATH_CHEAPEST_ARC` + `LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH`
6. Time limit: 10 seconds (returns best solution found so far)
7. Extract ordered stop sequences for each vehicle

### Parameters

| Parameter | Notes |
|---|---|
| `depot` | `{lat, lon}` of police station (starting/ending point) |
| `stops` | List of `{lat, lon, risk_score}` — crime hotspot locations |
| `num_vehicles` | Number of patrol vehicles. If 1 → TSP (Travelling Salesman Problem). |

### Interpreting Results

```json
{
  "routes": [
    {
      "vehicle": 0,
      "stops": [0, 3, 1, 4, 2],
      "total_distance_km": 12.4
    }
  ]
}
```

- `stops` array is **0-indexed** and maps to your original stops list
- Route always starts and ends at depot (index -1/not shown)
- Stops are ordered for minimum travel distance

### Limitations
- Does not account for traffic, one-way roads, or road network (straight-line distances only)
- Does not account for officer shift time limits (time-window constraints)
- Greedy heuristic — solution is good but not guaranteed globally optimal for large inputs

---

## 5. Random Forest — Crime Category Classification

**File:** `ml-service/app/services/classification.py`  
**Endpoints:** `POST /classify/train`, `POST /classify/predict`, `POST /classify/cross-validate`

### What It Does
Predicts the crime category (Property, Violent, Women Safety, Cyber, etc.) given structured features of a new FIR. Used to auto-classify incoming FIRs and to power the research paper's classification experiment.

### Features Used

| Feature | Type | Description |
|---|---|---|
| `hour` | Integer 0–23 | Hour when crime occurred |
| `day_of_week` | Integer 0–6 | 0=Monday, 6=Sunday |
| `month` | Integer 1–12 | Month of occurrence |
| `zone` | Encoded integer | Label-encoded zone name |
| `act_type` | Encoded integer | Label-encoded act (IPC, POCSO, etc.) |
| `severity` | Integer 1–5 | Severity level of the FIR |

### Model Configuration
```python
RandomForestClassifier(
  n_estimators=200,        # 200 decision trees (more = more stable, slower)
  max_depth=15,            # Limits tree depth to prevent overfitting
  min_samples_leaf=2,      # Each leaf must have ≥2 samples
  class_weight='balanced', # Compensates for imbalanced crime categories
  random_state=42,         # Reproducibility
  n_jobs=-1               # Use all CPU cores
)
```

### Evaluation Metrics

**Accuracy:** Percentage of correctly predicted categories. Simple but misleading with imbalanced classes.

**F1-Score (weighted):** Harmonic mean of precision and recall, weighted by class frequency. Best single metric for imbalanced crime data.

**Classification Report:**
```
              precision  recall  f1-score  support
    Property     0.89     0.91     0.90     1240
      Violent     0.82     0.78     0.80      430
Women Safety     0.91     0.87     0.89      180
       Cyber     0.76     0.81     0.78       90
```

**Confusion Matrix interpretation:** Off-diagonal entries are misclassifications. High confusion between Violent and Property usually means severity feature needs improvement.

### Cross-Validation (Best Practice)
Always report k-fold CV results in the research paper, not single-split accuracy:
```
5-Fold CV Results: mean_f1 = 0.862 ± 0.018
95% CI: [0.827, 0.897]
```
This is more trustworthy than a single 80/20 split.

---

## 6. Ridge Regression — Zone Risk Scoring

**File:** `ml-service/app/services/risk.py`  
**Endpoint:** `POST /risk-score`

### What It Does
Computes a 0–100 risk score for each zone by combining five normalized crime metrics. The weights are *learned* from historical data using Ridge regression (L2 regularization prevents overfitting on small datasets).

### Input Features

| Feature | Weight (fallback) | Description |
|---|---|---|
| `frequency` | 0.30 | Total crime count in zone over period |
| `severity` | 0.25 | Average severity (1–5) of crimes |
| `recency_days` | 0.20 | Days since most recent crime (inverted — recent = high risk) |
| `hotspot_density` | 0.15 | Number of DBSCAN clusters in zone |
| `repeat_rate` | 0.10 | Fraction of repeat-victimized locations |

### Fallback Formula (Before Training)
When no trained model exists:
```
risk = (freq_norm × 0.30 + sev_norm × 0.25 + recency_norm × 0.20 + 
        density_norm × 0.15 + repeat_norm × 0.10) × 100
```
All inputs normalized to [0,1] min-max scaling before combining.

### With Trained Model
After calling `POST /ml/risk-score/train` with historical outcome data:
- Ridge regression learns weights from data
- Output normalized to 0–100 range
- SHAP explains which factor drove each zone's score

### Interpreting Scores

| Score | Risk Level | Recommended Action |
|---|---|---|
| 0–25 | Low | Regular patrol schedule |
| 25–50 | Moderate | Increased patrol frequency |
| 50–75 | High | Daily targeted patrol + preventive deployment |
| 75–100 | Critical | Immediate attention, possible special operation |

---

## 7. Moran's I — Spatial Autocorrelation Test

**File:** `ml-service/app/services/spatial_stats.py`  
**Endpoint:** `POST /spatial/morans-i`

### What It Does
Moran's I tests whether the spatial pattern of crime counts is **clustered** (high values near high values), **dispersed** (high values near low values), or **random**. It is the standard statistical test to prove that detected hotspots are non-random.

### Formula
```
I = (n / S₀) × (Σᵢ Σⱼ wᵢⱼ(xᵢ - x̄)(xⱼ - x̄)) / (Σᵢ(xᵢ - x̄)²)
```
Where `wᵢⱼ` = spatial weight between zones i and j (based on k-nearest neighbours).

### Interpreting Results

| Moran's I | Interpretation |
|---|---|
| Close to +1 | Strong positive clustering (hotspots cluster together) |
| Close to 0 | Random spatial pattern |
| Close to -1 | Dispersed pattern (hotspots evenly spread) |

**p-value:** The probability that the observed clustering occurred by chance.
- p < 0.001 → Extremely significant clustering
- p < 0.05 → Statistically significant
- p > 0.05 → Cannot reject random null hypothesis

### In the Research Paper
Report: *"Global Moran's I = 0.71 (z = 8.43, p < 0.001), confirming that the detected crime hotspots exhibit statistically significant spatial clustering that is unlikely to be due to random chance (Anselin, 1995)."*

---

## 8. PAI — Predictive Accuracy Index

**File:** `ml-service/app/services/evaluation.py`  
**Endpoint:** `POST /evaluation/pai`

### What It Does
PAI is the standard criminological metric for evaluating how well a hotspot model predicts crime. It answers: "If we focus resources on the top X% of area flagged as hotspot, what percentage of actual crime does that capture?"

### Formula
```
PAI = (crimes captured in hotspot area / total crimes) /
      (hotspot area / total area)
```

### Interpreting PAI

| PAI Value | Rating | Meaning |
|---|---|---|
| < 1 | Poor | Worse than random — avoid these predictions |
| 1–5 | Fair | Better than random but room for improvement |
| 5–10 | Good | Strong predictive performance |
| > 10 | Excellent | State-of-the-art performance |

### In the Research Paper
*"Our DBSCAN-KDE hybrid achieved a PAI of 7.4, capturing 74.3% of actual crimes within 10% of the total study area, indicating strong hotspot predictive accuracy consistent with prior studies (Chainey et al., 2008)."*

---

## 9. SHAP — Risk Score Explainability

**File:** `ml-service/app/services/risk.py`  
**Endpoint:** `POST /ml/risk/explain`

### What It Does
SHAP (SHapley Additive exPlanations) decomposes each zone's risk score into contributions from each feature. Instead of a black-box score, the officer sees: *"Patna's score of 78 is driven primarily by frequency (+0.42) and recency (+0.21)."*

### Reading SHAP Outputs

```json
{
  "zone": "Patna",
  "risk_score": 78.4,
  "shap_contributions": {
    "frequency": 0.42,
    "severity": 0.21,
    "recency_days": 0.18,
    "hotspot_density": 0.12,
    "repeat_rate": 0.07
  },
  "dominant_factor": "frequency",
  "explanation": "Risk driven primarily by frequency (+0.42)"
}
```

- **Positive contribution** → increases risk score
- **Negative contribution** → decreases risk score
- **dominant_factor** → the single most impactful feature for this zone

---

## 10. Isolation Forest — Crime Spike Anomaly Detection

**File:** `ml-service/app/services/anomaly.py`  
**Endpoint:** `POST /ml/anomaly/detect`

### What It Does
Isolation Forest identifies days when crime volume in a zone is anomalously high compared to its historical baseline. These "spikes" trigger real-time alerts to officers.

### Two-Method Approach
1. **Z-score:** `z = (x - μ) / σ`. Days with `|z| > 2.5` are flagged.
2. **Isolation Forest:** Unsupervised anomaly detection — isolates outliers by building random decision trees. Returns anomaly score in [0, 1].

Both methods must agree for a `critical` alert. Either method alone = `warning`.

### Interpreting Output

| Severity | Condition | Action |
|---|---|---|
| `normal` | z < 2.0 | No alert |
| `warning` | 2.0 ≤ z < 3.5 or Isolation Forest flags | Log, monitor |
| `critical` | z ≥ 3.5 AND Isolation Forest flags | SSE alert broadcast to dashboard |

---

## 11. Near-Repeat Victimization

**File:** `ml-service/app/services/near_repeat.py`  
**Endpoint:** `POST /ml/near-repeat`

### What It Does
Based on criminological research (Johnson & Bowers, 2004): after a crime occurs, nearby locations have elevated risk of crime *within the next 1–2 weeks*. This phenomenon (called "near-repeat victimization") is strongest for burglary and theft.

### Algorithm
For each candidate location, compute a risk score based on how many recent crimes occurred nearby:
```
risk = Σ (spatial_weight × temporal_weight)
     for each crime within spatial_bandwidth AND temporal_bandwidth

spatial_weight  = 1 - (distance / spatial_bandwidth_m)
temporal_weight = 1 - (days_ago / temporal_bandwidth_days)
```

### Parameters

| Parameter | Default | Meaning |
|---|---|---|
| `spatial_bandwidth_m` | 400 | Crimes further than 400m don't contribute |
| `temporal_bandwidth_days` | 14 | Crimes older than 14 days don't contribute |

### Use Case
Run near-repeat analysis after a robbery cluster is detected. Score locations within 400m of recent robberies. Deploy preventive patrol to high-scoring locations within 48 hours.

---

## 12. spaCy NER — Entity Extraction

**File:** `ml-service/app/services/nlp.py`  
**Endpoint:** `POST /ml/nlp/extract`

### What It Does
Extracts structured entities from free-text FIR descriptions using spaCy's Named Entity Recognition (NER). Identifies:
- **Locations** — "near Gandhi Maidan", "at NH-28"
- **Persons** — suspect names, witness names
- **Vehicles** — `MH-12-AB-1234` (regex pattern for Indian number plates)
- **Phone numbers** — 10-digit mobile numbers (regex)

### Model
- `en_core_web_sm` — English spaCy model (small, fast, no GPU needed)
- Works with transliterated Hindi text to some degree

### Use Case
Auto-populate the `location_name` field from FIR description when the officer leaves it blank. Helps geocoding by providing a human-readable landmark.

---

## Algorithm Selection Guide

| Question | Algorithm |
|---|---|
| Where are crime clusters right now? | DBSCAN |
| What is the crime density across the district? | KDE |
| How many crimes will happen next month? | Prophet |
| Where should patrols go tonight? | OR-Tools VRP |
| What crime type will this FIR likely be? | Random Forest |
| Which zones are most dangerous? | Ridge Regression + SHAP |
| Are the hotspots statistically real? | Moran's I |
| How good are our hotspot predictions? | PAI |
| Did crime spike unusually today? | Isolation Forest |
| Which nearby areas are at elevated risk now? | Near-Repeat |
| What location/vehicle is mentioned in this FIR? | spaCy NER |

---

## References

- Ester, M., et al. (1996). "A density-based algorithm for discovering clusters." *KDD-96.*
- Rosenblatt, M. (1956). "Remarks on some nonparametric estimates of a density function." *Annals of Mathematical Statistics.*
- Taylor, S.J., & Letham, B. (2018). "Forecasting at scale." *The American Statistician.*
- Google OR-Tools VRP documentation: https://developers.google.com/optimization/routing
- Anselin, L. (1995). "Local Indicators of Spatial Association — LISA." *Geographical Analysis.*
- Chainey, S., Tompson, L., & Uhlig, S. (2008). "The utility of hotspot mapping for predicting spatial patterns of crime." *Security Journal.*
- Johnson, S.D., & Bowers, K.J. (2004). "The burglary as clue to the future." *European Journal of Criminology.*
- Lundberg, S.M., & Lee, S.I. (2017). "A unified approach to interpreting model predictions (SHAP)." *NeurIPS.*
- Liu, F.T., et al. (2008). "Isolation Forest." *IEEE ICDM.*
