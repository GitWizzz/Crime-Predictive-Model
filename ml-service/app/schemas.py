from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field

ID = Union[int, str]


class Point(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)


class Incident(BaseModel):
    id: ID
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    occurred_at: Optional[datetime] = None
    crime_type: Optional[str] = None
    severity: Optional[float] = Field(default=None, ge=0)


class ClusterRequest(BaseModel):
    incidents: List[Incident]
    eps_meters: float = Field(default=300, gt=0)
    min_samples: int = Field(default=4, ge=1)


class Cluster(BaseModel):
    cluster_id: str
    centroid: Point
    crime_count: int
    member_ids: List[ID]


class ClusterResponse(BaseModel):
    clusters: List[Cluster]
    noise_ids: List[ID]


class KDERequest(BaseModel):
    incidents: List[Incident]
    bandwidth_meters: float = Field(default=500, gt=0)
    grid_size: int = Field(default=30, ge=5, le=200)
    boundary_geojson: Optional[Dict[str, Any]] = None
    weights: Optional[List[float]] = None
    min_intensity: float = Field(default=0.01, ge=0, le=1)


class HeatPoint(BaseModel):
    lat: float
    lon: float
    intensity: float = Field(..., ge=0, le=1)


class KDEResponse(BaseModel):
    heat_points: List[HeatPoint]


class TimeSeriesPoint(BaseModel):
    ds: datetime
    y: float


class ForecastRequest(BaseModel):
    series: List[TimeSeriesPoint]
    periods: int = Field(default=30, ge=1, le=365)
    freq: str = Field(default="D", min_length=1, max_length=8)


class ForecastPoint(BaseModel):
    ds: datetime
    yhat: float
    yhat_lower: float
    yhat_upper: float


class ForecastResponse(BaseModel):
    points: List[ForecastPoint]
    fallback_used: bool = False


class RouteRequest(BaseModel):
    depot: Point
    stops: List[Point]
    num_vehicles: int = Field(default=1, ge=1)


class Route(BaseModel):
    vehicle_id: int
    stop_order: List[int]
    distance_km: float = Field(..., ge=0)


class RouteResponse(BaseModel):
    routes: List[Route]


class RiskInput(BaseModel):
    id: ID
    frequency: float = Field(..., ge=0)
    severity: float = Field(..., ge=0)
    recency_days: float = Field(..., ge=0)
    hotspot_density: float = Field(..., ge=0)
    repeat_rate: float = Field(..., ge=0)


class RiskScore(BaseModel):
    id: ID
    score: float = Field(..., ge=0, le=100)


class RiskScoreRequest(BaseModel):
    items: List[RiskInput]


class RiskScoreResponse(BaseModel):
    scores: List[RiskScore]
