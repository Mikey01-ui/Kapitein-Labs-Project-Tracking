import type { NextFunction, Request, Response } from "express";

export function requireRole(...roles: (string | string[])[]) {
  const flatRoles = roles.flat();
  return (request: Request, response: Response, next: NextFunction) => {
    if (!request.user) {
      response.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!flatRoles.includes(request.user.role)) {
      response.status(403).json({ message: "Access forbidden: insufficient permissions." });
      return;
    }

    next();
  };
}
