utf-8importnumpyasnp
importpandasaspd
importgeopandasasgpd
fromshapely.geometryimportPointasShapelyPoint,shape
fromsklearn.neighborsimportKernelDensity
from..schemasimportKDERequest,KDEResponse,HeatPoint

EARTH_RADIUS_KM=6371.0088

defrun_kde(req:KDERequest)->KDEResponse:
    ifnotreq.incidents:
        returnKDEResponse(heat_points=[])

df=pd.DataFrame([{"lat":i.lat,"lon":i.lon}foriinreq.incidents])
gdf=gpd.GeoDataFrame(
df,
geometry=[ShapelyPoint(xy)forxyinzip(df["lon"],df["lat"])],
crs="EPSG:4326"
)

ifreq.boundary_geojson:
        boundary=shape(req.boundary_geojson)
gdf=gdf[gdf.within(boundary)]

ifgdf.empty:
        returnKDEResponse(heat_points=[])

minx,miny,maxx,maxy=gdf.total_bounds
xs=np.linspace(minx,maxx,req.grid_size)
ys=np.linspace(miny,maxy,req.grid_size)
grid=np.array([[y,x]foryinysforxinxs])

coords=np.radians(gdf[["lat","lon"]].to_numpy())
grid_rad=np.radians(grid)

bandwidth_km=req.bandwidth_meters/1000.0
bandwidth_rad=bandwidth_km/EARTH_RADIUS_KM
kde=KernelDensity(bandwidth=bandwidth_rad,metric="haversine")
ifreq.weightsandlen(req.weights)==len(coords):
        kde.fit(coords,sample_weight=req.weights)
else:
        kde.fit(coords)

scores=kde.score_samples(grid_rad)
intensities=np.exp(scores)

heat_points=[
HeatPoint(lat=float(grid[i][0]),lon=float(grid[i][1]),intensity=float(intensities[i]))
foriinrange(len(grid))
]
returnKDEResponse(heat_points=heat_points)
