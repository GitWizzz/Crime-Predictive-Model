import { apiGet, apiPost } from "./api";

export const generatePatrolRoute = async (token, payload) => {
  return apiPost("/api/patrol/routes", payload, token);
};

export const fetchPatrolRoutes = async (token) => {
  return apiGet("/api/patrol/routes", token);
};

export const fetchPatrolRouteById = async (token, id) => {
  return apiGet(`/api/patrol/routes/${id}`, token);
};
