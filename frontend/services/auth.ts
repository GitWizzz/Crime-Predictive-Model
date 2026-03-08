import { apiPost } from "./api";

type LoginInput = {
  email: string;
  password: string;
};

type SignupInput = {
  name: string;
  email: string;
  password: string;
  role: "ADMIN" | "OFFICER" | "ANALYST";
};

export const login = async ({ email, password }: LoginInput) => {
  return apiPost("/api/auth/login", { email, password });
};

export const signup = async ({ name, email, password, role }: SignupInput) => {
  return apiPost("/api/auth/signup", { name, email, password, role });
};
