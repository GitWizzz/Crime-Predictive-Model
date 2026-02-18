utf-8importpandasaspd
fromprophetimportProphet
from..schemasimportForecastRequest,ForecastResponse,ForecastPoint

defrun_forecast(req:ForecastRequest)->ForecastResponse:
    df=pd.DataFrame([{"ds":p.ds,"y":p.y}forpinreq.series])
model=Prophet(daily_seasonality=True,weekly_seasonality=True,yearly_seasonality=True)
model.fit(df)

future=model.make_future_dataframe(periods=req.periods,freq=req.freq)
forecast=model.predict(future).tail(req.periods)

points=[
ForecastPoint(
ds=row["ds"].to_pydatetime(),
yhat=float(row["yhat"]),
yhat_lower=float(row["yhat_lower"]),
yhat_upper=float(row["yhat_upper"]),
)
for_,rowinforecast.iterrows()
]
returnForecastResponse(points=points)