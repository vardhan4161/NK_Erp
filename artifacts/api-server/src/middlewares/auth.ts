import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logger } from "../lib/logger";

export interface AuthPayload {
  userId: number;
  username: string;
  role: "admin" | "manager" | "cashier";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET ?? "erp-pos-secret-key-change-in-production";

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): AuthPayload {
  return jwt.verify(token, JWT_SECRET) as AuthPayload;
}

/** Middleware: require valid JWT — BYPASSED for local dev, always admin */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  // Auth bypassed: always inject admin user for local development
  req.user = { userId: 1, username: "admin", role: "admin" };
  next();
}


/** Middleware: require specific role(s) */
export function requireRole(...roles: Array<"admin" | "manager" | "cashier">) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: insufficient permissions" });
      return;
    }
    next();
  };
}
