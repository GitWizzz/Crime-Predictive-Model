utf-8importmath
fromortools.constraint_solverimportpywrapcp,routing_enums_pb2
from..schemasimportRouteRequest,RouteResponse,Route

defhaversine_km(a,b):
    lat1,lon1=math.radians(a.lat),math.radians(a.lon)
lat2,lon2=math.radians(b.lat),math.radians(b.lon)
dlat,dlon=lat2-lat1,lon2-lon1
h=math.sin(dlat/2)**2+math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
return2*6371.0088*math.asin(math.sqrt(h))

defoptimize_routes(req:RouteRequest)->RouteResponse:
    locations=[req.depot]+req.stops
n=len(locations)

dist=[[haversine_km(locations[i],locations[j])forjinrange(n)]foriinrange(n)]

manager=pywrapcp.RoutingIndexManager(n,req.num_vehicles,0)
routing=pywrapcp.RoutingModel(manager)

defdistance_cb(from_index,to_index):
        returnint(dist[manager.IndexToNode(from_index)][manager.IndexToNode(to_index)]*1000)

transit_callback_index=routing.RegisterTransitCallback(distance_cb)
routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

search_params=pywrapcp.DefaultRoutingSearchParameters()
search_params.first_solution_strategy=routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC

solution=routing.SolveWithParameters(search_params)
routes=[]
ifnotsolution:
        returnRouteResponse(routes=[])

forvehicle_idinrange(req.num_vehicles):
        index=routing.Start(vehicle_id)
order=[]
total_km=0.0
whilenotrouting.IsEnd(index):
            node=manager.IndexToNode(index)
ifnode!=0:
                order.append(node-1)
next_index=solution.Value(routing.NextVar(index))
total_km+=dist[node][manager.IndexToNode(next_index)]
index=next_index
routes.append(Route(vehicle_id=vehicle_id,stop_order=order,distance_km=total_km))

returnRouteResponse(routes=routes)