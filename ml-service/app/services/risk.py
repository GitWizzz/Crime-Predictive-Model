utf-8importnumpyasnp
from..schemasimportRiskScoreRequest,RiskScoreResponse,RiskScore

def_normalize(values):
    v=np.array(values,dtype=float)
ifv.size==0:
        returnv
mn,mx=v.min(),v.max()
ifmn==mx:
        returnnp.ones_like(v)
return(v-mn)/(mx-mn)

defcompute_risk_scores(req:RiskScoreRequest)->RiskScoreResponse:
    freq=_normalize([i.frequencyforiinreq.items])
sev=_normalize([i.severityforiinreq.items])
rec=_normalize([i.recency_daysforiinreq.items])
den=_normalize([i.hotspot_densityforiinreq.items])
rep=_normalize([i.repeat_rateforiinreq.items])

scores=[]
foridx,iteminenumerate(req.items):
        score=(
0.30*freq[idx]
+0.25*sev[idx]
+0.20*rec[idx]
+0.15*den[idx]
+0.10*rep[idx]
)*100.0
scores.append(RiskScore(id=item.id,score=float(score)))

returnRiskScoreResponse(scores=scores)