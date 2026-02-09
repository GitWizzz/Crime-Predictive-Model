import bcrypt from "bcrypt";
import { findUserByEmail, createUser, findUserById } from "../models/user.model.js";
import { generateToken } from "../utils/jwt.util.js";

export const signupUser = async ({ name, email, password, role }) => {
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new Error("User already exists");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  return await createUser({
    name,
    email,
    passwordHash,
    role
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

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  };
};

export const getUserById = async (id) => {
  const user = await findUserById(id);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
};
