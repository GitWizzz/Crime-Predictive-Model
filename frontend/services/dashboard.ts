import { apiGet } from "./api";

export const fetchDashboardSummary = async (token: string | null, zone?: string) => {
  const search = zone ? `?zone=${encodeURIComponent(zone)}` : "";
  return apiGet(`/api/dashboard/summary${search}`, token);
};
