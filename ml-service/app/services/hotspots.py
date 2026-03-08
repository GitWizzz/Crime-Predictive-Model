import numpy as np
from shapely.geometry import Point as ShapelyPoint, shape
from sklearn.neighbors import KernelDensity

from ..schemas import HeatPoint, KDERequest, KDEResponse

EARTH_RADIUS_KM = 6371.0088


def _normalize(values: np.ndarray) -> np.ndarray:
    if values.size == 0:
        return values
    min_v = float(values.min())
    max_v = float(values.max())
    if max_v <= min_v:
        return np.ones_like(values)
    return (values - min_v) / (max_v - min_v)


def run_kde(req: KDERequest) -> KDEResponse:
    if not req.incidents:
        return KDEResponse(heat_points=[])

    coords_deg = np.array([[i.lat, i.lon] for i in req.incidents], dtype=float)
    if coords_deg.size == 0:
        return KDEResponse(heat_points=[])

    latitudes = coords_deg[:, 0]
    longitudes = coords_deg[:, 1]
    min_lat, max_lat = float(latitudes.min()), float(latitudes.max())
    min_lon, max_lon = float(longitudes.min()), float(longitudes.max())

    ys = np.linspace(min_lat, max_lat, req.grid_size)
    xs = np.linspace(min_lon, max_lon, req.grid_size)
    grid_deg = np.array([[lat, lon] for lat in ys for lon in xs], dtype=float)

    incident_mask: np.ndarray | None = None
    if req.boundary_geojson:
        boundary = shape(req.boundary_geojson)
        grid_mask = np.array(
            [boundary.contains(ShapelyPoint(lon, lat)) for lat, lon in grid_deg], dtype=bool
        )
        grid_deg = grid_deg[grid_mask]
        if grid_deg.size == 0:
            return KDEResponse(heat_points=[])

        incident_mask = np.array(
            [boundary.contains(ShapelyPoint(lon, lat)) for lat, lon in coords_deg], dtype=bool
        )
        coords_deg = coords_deg[incident_mask]
        if coords_deg.size == 0:
            return KDEResponse(heat_points=[])

    coords_rad = np.radians(coords_deg)
    grid_rad = np.radians(grid_deg)

    bandwidth_km = req.bandwidth_meters / 1000.0
    bandwidth_rad = bandwidth_km / EARTH_RADIUS_KM
    kde = KernelDensity(bandwidth=bandwidth_rad, metric="haversine")

    if req.weights and len(req.weights) == len(req.incidents):
        candidate_weights = np.asarray(req.weights, dtype=float)
        if incident_mask is not None:
            candidate_weights = candidate_weights[incident_mask]
        if len(candidate_weights) == len(coords_rad) and np.all(candidate_weights >= 0):
            kde.fit(coords_rad, sample_weight=candidate_weights)
        else:
            kde.fit(coords_rad)
    else:
        kde.fit(coords_rad)

    scores = kde.score_samples(grid_rad)
    intensities = _normalize(np.exp(scores))

    heat_points = [
        HeatPoint(lat=float(grid_deg[i][0]), lon=float(grid_deg[i][1]), intensity=float(intensities[i]))
        for i in range(len(grid_deg))
    ]
    return KDEResponse(heat_points=heat_points)
