import numpy as np
from sklearn.cluster import DBSCAN

from ..schemas import Cluster, ClusterRequest, ClusterResponse, Point

EARTH_RADIUS_KM = 6371.0088


def run_dbscan(req: ClusterRequest) -> ClusterResponse:
    if not req.incidents:
        return ClusterResponse(clusters=[], noise_ids=[])

    coords = np.radians([[i.lat, i.lon] for i in req.incidents])
    eps_rad = (req.eps_meters / 1000.0) / EARTH_RADIUS_KM
    model = DBSCAN(eps=eps_rad, min_samples=req.min_samples, metric="haversine")
    labels = model.fit_predict(coords)

    clusters: list[Cluster] = []
    noise_ids: list[int | str] = []
    for label in sorted(set(labels.tolist())):
        idxs = np.where(labels == label)[0]
        if label == -1:
            noise_ids.extend([req.incidents[i].id for i in idxs])
            continue

        lat = float(np.mean([req.incidents[i].lat for i in idxs]))
        lon = float(np.mean([req.incidents[i].lon for i in idxs]))
        clusters.append(
            Cluster(
                cluster_id=f"cluster_{label}",
                centroid=Point(lat=lat, lon=lon),
                crime_count=len(idxs),
                member_ids=[req.incidents[i].id for i in idxs],
            )
        )

    return ClusterResponse(clusters=clusters, noise_ids=noise_ids)
