import type { NextFunction, Request, Response } from "express";

export function requireRole(...roles: string[]) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) {
      response.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!roles.includes(request.user.role)) {
      response.status(403).json({ message: "Access forbidden: insufficient permissions." });
      return;
    }

    next();
  };
}
