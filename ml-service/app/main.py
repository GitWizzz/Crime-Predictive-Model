utf-8fromfastapiimportFastAPI,HTTPException
from.schemasimport(
ClusterRequest,ClusterResponse,
KDERequest,KDEResponse,
ForecastRequest,ForecastResponse,
RouteRequest,RouteResponse,
RiskScoreRequest,RiskScoreResponse
)
from.services.clusteringimportrun_dbscan
from.services.hotspotsimportrun_kde
from.services.forecastimportrun_forecast
from.services.routingimportoptimize_routes
from.services.riskimportcompute_risk_scores

app=FastAPI(title="Crime ML Service",version="0.1.0")

@app.get("/health")
defhealth():
    return{"status":"ok"}

@app.post("/cluster",response_model=ClusterResponse)
defcluster(req:ClusterRequest):
    returnrun_dbscan(req)

@app.post("/hotspots/kde",response_model=KDEResponse)
defhotspots(req:KDERequest):
    returnrun_kde(req)

@app.post("/forecast",response_model=ForecastResponse)
defforecast(req:ForecastRequest):
    iflen(req.series)<2:
        raiseHTTPException(status_code=400,detail="Not enough data points")
returnrun_forecast(req)

@app.post("/routes/optimize",response_model=RouteResponse)
defroutes(req:RouteRequest):
    returnoptimize_routes(req)

@app.post("/risk-score",response_model=RiskScoreResponse)
defrisk_score(req:RiskScoreRequest):
    returncompute_risk_scores(req)