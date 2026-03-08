from fastapi import FastAPI, HTTPException

from .schemas import (
    ClusterRequest,
    ClusterResponse,
    ForecastRequest,
    ForecastResponse,
    KDERequest,
    KDEResponse,
    RiskScoreRequest,
    RiskScoreResponse,
    RouteRequest,
    RouteResponse,
)
from .services.clustering import run_dbscan
from .services.forecast import run_forecast
from .services.hotspots import run_kde
from .services.risk import compute_risk_scores
from .services.routing import optimize_routes

app = FastAPI(title="Crime ML Service", version="0.2.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/cluster", response_model=ClusterResponse)
def cluster(req: ClusterRequest) -> ClusterResponse:
    try:
        return run_dbscan(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/hotspots/kde", response_model=KDEResponse)
def hotspots(req: KDERequest) -> KDEResponse:
    try:
        return run_kde(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest) -> ForecastResponse:
    if len(req.series) < 2:
        raise HTTPException(status_code=400, detail="Not enough data points")
    try:
        return run_forecast(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/routes/optimize", response_model=RouteResponse)
def routes(req: RouteRequest) -> RouteResponse:
    try:
        return optimize_routes(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/risk-score", response_model=RiskScoreResponse)
def risk_score(req: RiskScoreRequest) -> RiskScoreResponse:
    try:
        return compute_risk_scores(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
