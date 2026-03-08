import { apiGet, apiPost } from "./api";

export const generatePatrolRoute = async (
  token: string | null,
  payload: Record<string, unknown>
) => {
  return apiPost("/api/patrol/routes", payload, token);
};

export const fetchPatrolRoutes = async (token: string | null) => {
  return apiGet("/api/patrol/routes", token);
};

export const fetchPatrolRouteById = async (token: string | null, id: number | string) => {
  return apiGet(`/api/patrol/routes/${id}`, token);
};
