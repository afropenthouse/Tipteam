import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/jwt.js";

export interface AdminRequest extends Request {
  isAdmin?: boolean;
  userId?: string;
}

export const adminAuth = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    if (!decoded.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.isAdmin = true;
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid admin token" });
  }
};