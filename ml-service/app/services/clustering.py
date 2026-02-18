utf-8importnumpyasnp
fromsklearn.clusterimportDBSCAN
from..schemasimportClusterRequest,ClusterResponse,Cluster,Point

EARTH_RADIUS_KM=6371.0088

defrun_dbscan(req:ClusterRequest)->ClusterResponse:
    ifnotreq.incidents:
        returnClusterResponse(clusters=[],noise_ids=[])

coords=np.radians([[i.lat,i.lon]foriinreq.incidents])
eps_rad=(req.eps_meters/1000.0)/EARTH_RADIUS_KM
model=DBSCAN(eps=eps_rad,min_samples=req.min_samples,metric="haversine")
labels=model.fit_predict(coords)

clusters=[]
noise_ids=[]
forlabelinset(labels):
        idxs=np.where(labels==label)[0]
iflabel==-1:
            noise_ids.extend([req.incidents[i].idforiinidxs])
continue
lat=float(np.mean([req.incidents[i].latforiinidxs]))
lon=float(np.mean([req.incidents[i].lonforiinidxs]))
clusters.append(
Cluster(
cluster_id=f"cluster_{label}",
centroid=Point(lat=lat,lon=lon),
crime_count=len(idxs),
member_ids=[req.incidents[i].idforiinidxs],
)
)

returnClusterResponse(clusters=clusters,noise_ids=noise_ids)