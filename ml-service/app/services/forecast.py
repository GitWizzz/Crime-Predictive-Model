from __future__ import annotations

import pandas as pd

from ..schemas import ForecastPoint, ForecastRequest, ForecastResponse

try:
    from prophet import Prophet
except Exception:  # pragma: no cover
    Prophet = None


def _build_baseline_forecast(df: pd.DataFrame, periods: int, freq: str) -> ForecastResponse:
    values = df["y"].astype(float).tolist()
    window = values[-7:] if len(values) >= 7 else values
    avg = float(sum(window) / max(1, len(window)))

    last_ds = pd.to_datetime(df["ds"]).max()
    if pd.isna(last_ds):
        raise ValueError("Invalid series timestamps")
    future_dates = pd.date_range(start=last_ds, periods=periods + 1, freq=freq)[1:]

    points = []
    for dt in future_dates:
        yhat = max(0.0, avg)
        points.append(
            ForecastPoint(
                ds=dt.to_pydatetime(),
                yhat=yhat,
                yhat_lower=max(0.0, yhat * 0.85),
                yhat_upper=yhat * 1.15,
            )
        )
    return ForecastResponse(points=points)


def run_forecast(req: ForecastRequest) -> ForecastResponse:
    df = pd.DataFrame([{"ds": p.ds, "y": p.y} for p in req.series])
    if df.empty:
        return ForecastResponse(points=[])

    df["ds"] = pd.to_datetime(df["ds"], errors="coerce")
    df["y"] = pd.to_numeric(df["y"], errors="coerce")
    df = df.dropna(subset=["ds", "y"]).sort_values("ds")
    if len(df) < 2:
        raise ValueError("Not enough valid data points for forecasting")

    # Collapse duplicate timestamps to one point.
    df = df.groupby("ds", as_index=False)["y"].sum()

    if Prophet is None:
        return _build_baseline_forecast(df, req.periods, req.freq)

    try:
        model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=True)
        model.fit(df)
        future = model.make_future_dataframe(periods=req.periods, freq=req.freq)
        forecast = model.predict(future).tail(req.periods)
        points = [
            ForecastPoint(
                ds=row["ds"].to_pydatetime(),
                yhat=max(0.0, float(row["yhat"])),
                yhat_lower=max(0.0, float(row["yhat_lower"])),
                yhat_upper=max(0.0, float(row["yhat_upper"])),
            )
            for _, row in forecast.iterrows()
        ]
        return ForecastResponse(points=points)
    except Exception as exc:
        import logging
        logging.getLogger(__name__).warning("Prophet forecast failed, using baseline: %s", exc)
        return _build_baseline_forecast(df, req.periods, req.freq)
