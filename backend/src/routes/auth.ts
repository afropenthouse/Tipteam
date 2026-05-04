import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import prisma from "../lib/prisma.js";
import { generateToken, generateVerificationToken, generateVerificationCode } from "../lib/jwt.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.post(
  "/signup",
  [
    body("fullName").trim().notEmpty().withMessage("Full name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, email, password } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: "An account with that email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationCode = generateVerificationCode();

      const user = await prisma.user.create({
        data: {
          fullName,
          email,
          password: hashedPassword,
          verifications: {
            create: {
              type: "EMAIL_VERIFICATION",
              code: verificationCode,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          },
        },
      });

      await sendVerificationEmail(email, fullName, verificationCode);

      const token = generateToken(user.id);
      res.status(201).json({
        user: { id: user.id, fullName: user.fullName, email: user.email, isVerified: user.isVerified },
        token,
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const token = generateToken(user.id);
      res.json({
        user: { id: user.id, fullName: user.fullName, email: user.email, isVerified: user.isVerified },
        token,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to sign in" });
    }
  }
);

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, fullName: true, email: true, isVerified: true, avatarUrl: true, createdAt: true },
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.post("/verify-email", async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const verification = await prisma.verification.findFirst({
      where: {
        userId: user.id,
        type: "EMAIL_VERIFICATION",
        code,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!verification) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    await prisma.verification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify email" });
  }
});

router.post(
  "/forgot-password",
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required")],
  async (req: Request, res: Response) => {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.json({ message: "If the email exists, a reset code will be sent" });
      }

      const existingReset = await prisma.verification.findFirst({
        where: { userId: user.id, type: "PASSWORD_RESET", usedAt: null, expiresAt: { gt: new Date() } },
      });

      if (existingReset) {
        return res.json({ message: "If the email exists, a reset code will be sent" });
      }

      const resetCode = generateVerificationCode();

      await prisma.verification.create({
        data: {
          userId: user.id,
          type: "PASSWORD_RESET",
          code: resetCode,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      await sendPasswordResetEmail(email, user.fullName, resetCode);

      res.json({ message: "If the email exists, a reset link will be sent" });
    } catch (error) {
      res.status(500).json({ error: "Failed to process request" });
    }
  }
);

router.post(
  "/reset-password",
  [body("email").isEmail().withMessage("Valid email is required"), body("code").notEmpty().withMessage("Code is required"), body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")],
  async (req: Request, res: Response) => {
    try {
      const { email, code, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      const verification = await prisma.verification.findFirst({
        where: {
          userId: user.id,
          type: "PASSWORD_RESET",
          code,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!verification) {
        return res.status(400).json({ error: "Invalid or expired code" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      await prisma.verification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

router.post(
  "/forgot-password-direct",
  [body("email").isEmail().withMessage("Valid email is required"), body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters")],
  async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(400).json({ error: "User not found" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Direct password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }
);

export default router;