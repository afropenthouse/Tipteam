import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const generateToken = (userId: string, isAdmin?: boolean): string => {
  const payload: { userId: string; isAdmin?: boolean } = { userId };
  if (isAdmin) payload.isAdmin = true;
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
};

export const generateAdminToken = (): string => {
  return jwt.sign({ userId: "admin", isAdmin: true }, process.env.JWT_SECRET!, { expiresIn: "7d" });
};

export const verifyToken = (token: string): { userId: string; isAdmin?: boolean } => {
  return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; isAdmin?: boolean };
};

export const generateVerificationToken = (): string => {
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
};

export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
};