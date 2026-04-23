import { Request, Response, NextFunction } from "express";
import prisma from "../lib/prisma.js";
import { verifyToken } from "../lib/jwt.js";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.slice(7);
    const { userId } = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};