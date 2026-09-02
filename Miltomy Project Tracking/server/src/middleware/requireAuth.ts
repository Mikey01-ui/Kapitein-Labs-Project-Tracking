import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/env.js";

export interface DecodedToken {
  userId: string;
  id?: string;
  email: string;
  role: "OWNER" | "PROJECT_MANAGER" | "TEAM_MEMBER";
  name?: string;
}

// Extend Express Request interface to store authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    response.status(401).json({ message: "Authentication token required." });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;
    if (!decoded.id && decoded.userId) {
      decoded.id = decoded.userId;
    }
    request.user = decoded;
    next();
  } catch (error) {
    response.status(401).json({ message: "Invalid or expired session token." });
  }
}
