import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { generateVerificationCode, generateVerificationToken } from "../lib/jwt.js";
import { sendWithdrawalVerificationEmail } from "../lib/email.js";

const router = Router();

const getWalletSummary = async (businessId: string) => {
  const [feedbacks, withdrawals] = await Promise.all([
    prisma.feedback.findMany({ where: { businessId } }),
    prisma.withdrawal.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const earned = feedbacks.reduce((sum, f) => sum + (f.tipAmount || 0), 0);
  const withdrawn = withdrawals
    .filter((w) => w.status === "PENDING" || w.status === "APPROVED")
    .reduce((sum, w) => sum + w.amount, 0);

  return {
    wallet: {
      earned,
      withdrawn,
      available: Math.max(0, earned - withdrawn),
    },
    withdrawals,
  };
};

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { ownerId: req.userId },
      select: { id: true, name: true },
    });

    const businessIds = businesses.map((b) => b.id);

    const withdrawals = await prisma.withdrawal.findMany({
      where: { businessId: { in: businessIds } },
      orderBy: { createdAt: "desc" },
      include: { business: { select: { name: true } } },
    });

    res.json({ withdrawals });
  } catch (error) {
    res.status(500).json({ error: "Failed to get withdrawals" });
  }
});

// New aggregated wallet summary across all businesses
router.get("/summary", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { ownerId: req.userId },
      select: { id: true },
    });

    const businessIds = businesses.map((b) => b.id);

    const earnedAgg = await prisma.feedback.aggregate({
      where: { businessId: { in: businessIds } },
      _sum: { tipAmount: true },
    });

    const withdrawnAgg = await prisma.withdrawal.aggregate({
      where: {
        businessId: { in: businessIds },
        status: { in: ["PENDING", "APPROVED"] },
      },
      _sum: { amount: true },
    });

    const earned = earnedAgg._sum.tipAmount || 0;
    const withdrawn = withdrawnAgg._sum.amount || 0;
    const available = Math.max(0, earned - withdrawn);

    res.json({ wallet: { earned, withdrawn, available } });
  } catch (error) {
    console.error("Wallet summary error:", error);
    res.status(500).json({ error: "Failed to get wallet summary" });
  }
});

router.get("/business/:businessId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const summary = await getWalletSummary(businessId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: "Failed to get wallet" });
  }
});

router.post(
  "/request",
  authenticate,
  [
    body("businessId").notEmpty().withMessage("Business ID is required"),
    body("amount").isInt({ min: 1 }).withMessage("Amount must be at least 1"),
    body("accountNumber")
      .trim()
      .isLength({ min: 10, max: 10 })
      .withMessage("Account number must be 10 digits")
      .isNumeric()
      .withMessage("Account number must contain only numbers"),
    body("bankName").notEmpty().withMessage("Bank name is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid withdrawal details" });
      }

      const { businessId, amount, accountNumber, bankName } = req.body;

      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.userId },
        include: {
          owner: {
            select: { id: true, email: true, fullName: true },
          },
        },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const summary = await getWalletSummary(businessId);
      const available = summary.wallet.available;

      if (amount > available) {
        return res.status(400).json({ error: "Amount exceeds available balance" });
      }

      await prisma.verification.updateMany({
        where: {
          userId: business.owner.id,
          type: "WITHDRAWAL_VERIFICATION",
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });

      const withdrawal = await prisma.withdrawal.create({
        data: {
          businessId,
          amount,
          accountNumber,
          bankName,
          status: "AWAITING_CONFIRMATION",
        },
      });

      const code = generateVerificationCode();
      await prisma.verification.create({
        data: {
          userId: business.owner.id,
          type: "WITHDRAWAL_VERIFICATION",
          token: generateVerificationToken(),
          code,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      });

      await sendWithdrawalVerificationEmail(business.owner.email, business.owner.fullName, code, {
        amount,
        businessName: business.name,
        accountNumber,
      });

      res.status(201).json({
        message: "A verification code has been sent to your email",
        withdrawalId: withdrawal.id,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to request withdrawal" });
    }
  }
);

router.post(
  "/confirm",
  authenticate,
  [
    body("withdrawalId").notEmpty().withMessage("Withdrawal ID is required"),
    body("code").trim().notEmpty().withMessage("Verification code is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid confirmation details" });
      }

      const { withdrawalId, code } = req.body;

      const withdrawal = await prisma.withdrawal.findFirst({
        where: {
          id: withdrawalId,
          status: "AWAITING_CONFIRMATION",
          business: { ownerId: req.userId },
        },
        include: {
          business: {
            select: { id: true, ownerId: true },
          },
        },
      });

      if (!withdrawal) {
        return res.status(404).json({ error: "Withdrawal request not found" });
      }

      const verification = await prisma.verification.findFirst({
        where: {
          userId: req.userId,
          type: "WITHDRAWAL_VERIFICATION",
          code,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      if (!verification) {
        return res.status(400).json({ error: "Invalid or expired verification code" });
      }

      const summary = await getWalletSummary(withdrawal.businessId);
      if (withdrawal.amount > summary.wallet.available) {
        await prisma.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: "REJECTED" },
        });

        await prisma.verification.update({
          where: { id: verification.id },
          data: { usedAt: new Date() },
        });

        return res.status(400).json({ error: "Amount exceeds available balance" });
      }

      const confirmedWithdrawal = await prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: "PENDING" },
      });

      await prisma.verification.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      });

      res.json({
        message: "Withdrawal submitted successfully",
        withdrawal: confirmedWithdrawal,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to confirm withdrawal" });
    }
  }
);

export default router;
