import math

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

from ..schemas import Route, RouteRequest, RouteResponse

EARTH_RADIUS_KM = 6371.0088


def haversine_km(a, b) -> float:
    lat1, lon1 = math.radians(a.lat), math.radians(a.lon)
    lat2, lon2 = math.radians(b.lat), math.radians(b.lon)
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(h))


def optimize_routes(req: RouteRequest) -> RouteResponse:
    if not req.stops:
        return RouteResponse(routes=[])

    locations = [req.depot] + req.stops
    n = len(locations)
    dist = [[haversine_km(locations[i], locations[j]) for j in range(n)] for i in range(n)]

    manager = pywrapcp.RoutingIndexManager(n, req.num_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_cb(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(dist[from_node][to_node] * 1000)

    transit_callback_index = routing.RegisterTransitCallback(distance_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_params.time_limit.seconds = 10

    solution = routing.SolveWithParameters(search_params)
    if not solution:
        return RouteResponse(routes=[])

    routes = []
    for vehicle_id in range(req.num_vehicles):
        index = routing.Start(vehicle_id)
        order = []
        total_km = 0.0

        while not routing.IsEnd(index):
            node = manager.IndexToNode(index)
            if node != 0:
                order.append(node - 1)
            next_index = solution.Value(routing.NextVar(index))
            total_km += dist[node][manager.IndexToNode(next_index)]
            index = next_index

        routes.append(Route(vehicle_id=vehicle_id, stop_order=order, distance_km=total_km))

    return RouteResponse(routes=routes)
