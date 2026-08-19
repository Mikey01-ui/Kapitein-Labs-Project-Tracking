import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../utils/env.js";

interface DecodedToken {
  userId: string;
  email: string;
  role: string;
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
    
    request.user = decoded;
    next();
  } catch (error) {
    response.status(401).json({ message: "Invalid or expired session token." });
  }
}
