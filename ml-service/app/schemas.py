utf-8frompydanticimportBaseModel,Field
fromdatetimeimportdatetime
fromtypingimportList,Optional,Union,Dict

ID=Union[int,str]

classPoint(BaseModel):
    lat:float=Field(...,ge=-90,le=90)
lon:float=Field(...,ge=-180,le=180)

classIncident(BaseModel):
    id:ID
lat:float=Field(...,ge=-90,le=90)
lon:float=Field(...,ge=-180,le=180)
occurred_at:Optional[datetime]=None
crime_type:Optional[str]=None
severity:Optional[float]=None

classClusterRequest(BaseModel):
    incidents:List[Incident]
eps_meters:float=300
min_samples:int=4

classCluster(BaseModel):
    cluster_id:str
centroid:Point
crime_count:int
member_ids:List[ID]

classClusterResponse(BaseModel):
    clusters:List[Cluster]
noise_ids:List[ID]

classKDERequest(BaseModel):
    incidents:List[Incident]
bandwidth_meters:float=500
grid_size:int=30
boundary_geojson:Optional[Dict]=None
weights:Optional[List[float]]=None

classHeatPoint(BaseModel):
    lat:float
lon:float
intensity:float

classKDEResponse(BaseModel):
    heat_points:List[HeatPoint]

classTimeSeriesPoint(BaseModel):
    ds:datetime
y:float

classForecastRequest(BaseModel):
    series:List[TimeSeriesPoint]
periods:int=30
freq:str="D"

classForecastPoint(BaseModel):
    ds:datetime
yhat:float
yhat_lower:float
yhat_upper:float

classForecastResponse(BaseModel):
    points:List[ForecastPoint]

classRouteRequest(BaseModel):
    depot:Point
stops:List[Point]
num_vehicles:int=1

classRoute(BaseModel):
    vehicle_id:int
stop_order:List[int]
distance_km:float

classRouteResponse(BaseModel):
    routes:List[Route]

classRiskInput(BaseModel):
    id:ID
frequency:float
severity:float
recency_days:float
hotspot_density:float
repeat_rate:float

classRiskScore(BaseModel):
    id:ID
score:float

classRiskScoreRequest(BaseModel):
    items:List[RiskInput]

classRiskScoreResponse(BaseModel):
    scores:List[RiskScore]
