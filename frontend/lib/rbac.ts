export type UserRole = "ADMIN" | "ANALYST" | "OFFICER";

export const normalizeRole = (role?: string | null): UserRole => {
  const normalized = role?.trim().toUpperCase();
  if (normalized === "ADMIN" || normalized === "ANALYST" || normalized === "OFFICER") {
    return normalized;
  }
  return "OFFICER";
};

const roleRoutes: Record<UserRole, string[]> = {
  ADMIN: [
    "/dashboard",
    "/dashboard/analytics",
    "/dashboard/audit-log",
    "/dashboard/firs",
    "/dashboard/geo-fences",
    "/dashboard/hotspots",
    "/dashboard/irad",
    "/dashboard/patrols",
    "/dashboard/reports",
    "/dashboard/settings",
    "/dashboard/users",
    "/dashboard/women-safety",
  ],
  ANALYST: [
    "/dashboard",
    "/dashboard/analytics",
    "/dashboard/hotspots",
    "/dashboard/reports",
    "/dashboard/women-safety",
  ],
  OFFICER: [
    "/dashboard",
    "/dashboard/firs",
    "/dashboard/geo-fences",
    "/dashboard/hotspots",
    "/dashboard/irad",
    "/dashboard/patrols",
    "/dashboard/reports",
    "/dashboard/women-safety",
  ],
};

export const canAccessRoute = (role: UserRole, pathname: string) => {
  const allowed = roleRoutes[role];
  return allowed.some((route) => pathname === route || pathname.startsWith(`${route}/`));
};

export const rolesForRoute = (route: string): UserRole[] =>
  (Object.keys(roleRoutes) as UserRole[]).filter((role) => roleRoutes[role].includes(route));
