import jwt from "jsonwebtoken";
import { env } from "../utils/env.js";

export const protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  } else if (req.headers["x-access-token"]) {
    token = req.headers["x-access-token"];
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, env.jwtSecret);
      req.user = decoded;
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
        data: null,
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
      data: null,
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`,
        data: null,
      });
    }
    next();
  };
};
