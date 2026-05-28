const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000").replace(/\/$/, "");

type ApiToken = string | null | undefined;

// ─── In-memory GET cache (30 s TTL) ──────────────────────────────────────────
const CACHE_TTL = 30_000;
interface CacheEntry { data: unknown; expiresAt: number }
const cache = new Map<string, CacheEntry>();

const cacheKey = (path: string, token?: ApiToken) =>
  `${path}::${token ? token.slice(-8) : "anon"}`;

export const invalidateCache = (pathPrefix?: string) => {
  if (!pathPrefix) { cache.clear(); return; }
  for (const key of cache.keys()) {
    if (key.startsWith(pathPrefix)) cache.delete(key);
  }
};
// ─────────────────────────────────────────────────────────────────────────────

const buildHeaders = (token?: ApiToken) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const apiPath = (path: string) => {
  if (path.startsWith("/api/v1/")) return path;
  if (path === "/api/v1") return path;
  if (path.startsWith("/api/")) return `/api/v1${path.slice(4)}`;
  return path;
};

export const apiUrl = (path: string) => `${API_BASE}${apiPath(path)}`;

const parseResponse = async (res: Response) => {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  throw new Error(text ? text.slice(0, 140) : `Request failed (${res.status})`);
};

export const apiGet = async (path: string, token?: ApiToken) => {
  const key = cacheKey(path, token);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const res = await fetch(apiUrl(path), {
    headers: buildHeaders(token),
  });

  const data = await parseResponse(res);
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }

  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
};

export const apiPost = async (path: string, body: unknown, token?: ApiToken) => {
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: buildHeaders(token),
    body: JSON.stringify(body),
  });

  const data = await parseResponse(res);
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
};
