import { signupUser, loginUser, refreshUserToken } from "../services/auth.service.js";
import { fetchCurrentUserProfile } from "../services/user.service.js";

export const signup = async (req, res) => {
  try {
    const user = await signupUser(req.body);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: user
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

export const login = async (req, res) => {
  try {
    const result = await loginUser(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: result
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
      data: null
    });
  }
};

export const refresh = async (req, res) => {
  try {
    const result = await refreshUserToken(req.body);
    return res.status(200).json({
      success: true,
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};

export const logout = async (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Logout successful",
    data: { message: "Tokens cleared on client" },
  });
};

export const getProfile = async (req, res) => {
  try {
    const user = await fetchCurrentUserProfile(req.user.id);
    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
      data: null,
    });
  }
};
