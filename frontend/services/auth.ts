import { apiPost } from "./api";

export const login = async ({ email, password }) => {
  return apiPost("/api/auth/login", { email, password });
};

export const signup = async ({ name, email, password, role }) => {
  return apiPost("/api/auth/signup", { name, email, password, role });
};