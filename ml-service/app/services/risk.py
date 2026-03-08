import numpy as np

from ..schemas import RiskScore, RiskScoreRequest, RiskScoreResponse


def _normalize(values: list[float]) -> np.ndarray:
    vec = np.asarray(values, dtype=float)
    vec = np.nan_to_num(vec, nan=0.0, posinf=0.0, neginf=0.0)
    if vec.size == 0:
        return vec
    min_v = float(vec.min())
    max_v = float(vec.max())
    if max_v <= min_v:
        return np.ones_like(vec)
    return (vec - min_v) / (max_v - min_v)


def compute_risk_scores(req: RiskScoreRequest) -> RiskScoreResponse:
    if not req.items:
        return RiskScoreResponse(scores=[])

    freq = _normalize([i.frequency for i in req.items])
    sev = _normalize([i.severity for i in req.items])
    # Lower recency_days means more recent crime and should contribute higher risk.
    rec = 1.0 - _normalize([i.recency_days for i in req.items])
    den = _normalize([i.hotspot_density for i in req.items])
    rep = _normalize([i.repeat_rate for i in req.items])

    weights = {
        "freq": 0.30,
        "sev": 0.25,
        "rec": 0.20,
        "den": 0.15,
        "rep": 0.10,
    }

    scores = []
    for idx, item in enumerate(req.items):
        score = (
            weights["freq"] * freq[idx]
            + weights["sev"] * sev[idx]
            + weights["rec"] * rec[idx]
            + weights["den"] * den[idx]
            + weights["rep"] * rep[idx]
        ) * 100.0
        score = float(np.clip(score, 0.0, 100.0))
        scores.append(RiskScore(id=item.id, score=score))

    return RiskScoreResponse(scores=scores)
