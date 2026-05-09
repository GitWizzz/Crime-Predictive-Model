import bcrypt from "bcrypt";
import { findUserByEmail, createUser, findUserById } from "../models/user.model.js";
import { generateRefreshToken, generateToken, verifyRefreshToken } from "../utils/jwt.util.js";

export const signupUser = async ({ name, email, password, role, police_station, zone }) => {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return await createUser({
    name,
    email,
    passwordHash,
    role,
    police_station,
    zone,
  });
};

export const loginUser = async ({ email, password }) => {
  const user = await findUserByEmail(email);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new Error("Invalid credentials");
  }

  const token = generateToken(user);
  const refreshToken = generateRefreshToken(user);

  return {
    token,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      policeStation: user.police_station,
      zone: user.zone,
    }
  };
};

export const refreshUserToken = async ({ refreshToken }) => {
  const decoded = verifyRefreshToken(refreshToken);
  const user = await findUserById(decoded.id);
  if (!user) {
    throw new Error("User not found");
  }

  return {
    token: generateToken(user),
    refreshToken: generateRefreshToken(user),
  };
};

export const getUserById = async (id) => {
  const user = await findUserById(id);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};
