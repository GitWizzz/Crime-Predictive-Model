import { apiPost } from "./api";

const LOCAL_USERS_KEY = "crimeIntelLocalUsers";

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

type LocalUser = {
  id: number;
  name: string;
  email: string;
  password: string;
  role: SignupInput["role"];
};

const isNetworkError = (error: unknown) =>
  error instanceof TypeError && error.message.toLowerCase().includes("fetch");

const canUseLocalFallback = () =>
  typeof window !== "undefined" && process.env.NODE_ENV !== "production";

const readLocalUsers = (): LocalUser[] => {
  if (!canUseLocalFallback()) return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_USERS_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeLocalUsers = (users: LocalUser[]) => {
  window.localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
};

const localSignup = ({ name, email, password, role }: SignupInput) => {
  const users = readLocalUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
    throw new Error("User already exists");
  }

  const user: LocalUser = {
    id: Date.now(),
    name: name.trim(),
    email: normalizedEmail,
    password,
    role,
  };

  writeLocalUsers([...users, user]);

  return {
    success: true,
    message: "User created locally because the API server is unavailable.",
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const localLogin = ({ email, password }: LoginInput) => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = readLocalUsers().find(
    (item) => item.email.toLowerCase() === normalizedEmail && item.password === password
  );

  if (!user) {
    throw new Error("Invalid credentials. If this is a new account, create it first.");
  }

  return {
    success: true,
    message: "Login successful using local development account.",
    data: {
      token: `local-dev-token-${user.id}`,
      refreshToken: `local-dev-refresh-${user.id}`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        policeStation: null,
        zone: "Bihar Police",
      },
    },
  };
};

export const login = async ({ email, password }: LoginInput) => {
  try {
    return await apiPost("/api/auth/login", { email, password });
  } catch (error) {
    if (isNetworkError(error) && canUseLocalFallback()) {
      return localLogin({ email, password });
    }
    throw error;
  }
};

export const signup = async ({ name, email, password, role }: SignupInput) => {
  try {
    return await apiPost("/api/auth/signup", { name, email, password, role });
  } catch (error) {
    if (isNetworkError(error) && canUseLocalFallback()) {
      return localSignup({ name, email, password, role });
    }
    throw error;
  }
};
