const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type ApiToken = string | null | undefined;

const buildHeaders = (token?: ApiToken) => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const parseResponse = async (res: Response) => {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  const text = await res.text();
  throw new Error(text ? text.slice(0, 140) : `Request failed (${res.status})`);
};

export const apiGet = async (path: string, token?: ApiToken) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(token),
  });

  const data = await parseResponse(res);
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || `Request failed (${res.status})`);
  }
  return data;
};

export const apiPost = async (path: string, body: unknown, token?: ApiToken) => {
  const res = await fetch(`${API_BASE}${path}`, {
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
