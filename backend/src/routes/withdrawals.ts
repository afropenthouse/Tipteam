import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;

async function psRequest(method: string, path: string, body?: unknown) {
  if (!PAYSTACK_SECRET) throw new Error("PAYSTACK_SECRET_KEY missing");
  const res = await fetch(`https://api.paystack.co${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.message || `Paystack ${method} ${path} failed`);
  return json;
}

const BANK_CODES: Record<string, string> = {
  GTBank: "058",
  "Access Bank": "044",
  "Zenith Bank": "057",
  UBA: "033",
  "First Bank": "011",
  "Fidelity Bank": "070",
  "Sterling Bank": "032",
  "Union Bank": "032",
  "Wema Bank": "035",
  "Polaris Bank": "076",
  Ecobank: "050",
  "Stanbic IBTC": "221",
};

const getWalletSummary = async (businessId: string) => {
  try {
    const [feedbacks, withdrawals] = await Promise.all([
      prisma.feedback.findMany({ where: { businessId } }),
      prisma.withdrawal.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const earned = feedbacks.reduce((sum, f) => sum + (f.tipAmount || 0), 0);
    const withdrawn = withdrawals.reduce((sum, w) => sum + w.amount, 0);

    return {
      wallet: {
        earned,
        withdrawn,
        available: Math.max(0, earned - withdrawn),
      },
      withdrawals,
    };
  } catch (error) {
    console.error(`getWalletSummary failed for business ${businessId}:`, error);
    // Fallback: only count COMPLETED withdrawals if filter fails due to status mismatch
    try {
      const [feedbacks, safeWithdrawals] = await Promise.all([
        prisma.feedback.findMany({ where: { businessId } }),
        prisma.withdrawal.findMany({
          where: { businessId, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
        }),
      ]);
      const earned = feedbacks.reduce((sum, f) => sum + (f.tipAmount || 0), 0);
      const withdrawn = safeWithdrawals.reduce((sum, w) => sum + w.amount, 0);
      return {
        wallet: { earned, withdrawn, available: Math.max(0, earned - withdrawn) },
        withdrawals: safeWithdrawals,
      };
    } catch (fallbackError) {
      console.error(`Fallback also failed for ${businessId}:`, fallbackError);
      return { wallet: { earned: 0, withdrawn: 0, available: 0 }, withdrawals: [] };
    }
  }
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
      where: { businessId: { in: businessIds } },
      _sum: { amount: true },
    });

    const earned = earnedAgg._sum.tipAmount || 0;
    const withdrawn = withdrawnAgg._sum.amount || 0;
    const available = Math.max(0, earned - withdrawn);

    res.json({ wallet: { earned, withdrawn, available } });
  } catch (error) {
    console.error("Wallet summary error:", error);
    // Return safe empty wallet
    res.json({ wallet: { earned: 0, withdrawn: 0, available: 0 } });
  }
});

router.get("/business/:businessId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = typeof req.params.businessId === "string" ? req.params.businessId : req.params.businessId[0];
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const summary = await getWalletSummary(businessId);
    res.json(summary);
  } catch (error) {
    console.error("Wallet fetch error:", error);
    // Return safe empty wallet to avoid UI errors
    res.json({ wallet: { earned: 0, withdrawn: 0, available: 0 }, withdrawals: [] });
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
    body("bankCode").optional().isString(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid withdrawal details" });
      }

      const { businessId, amount, accountNumber, bankName, bankCode } = req.body;

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

      // Resolve account name via Paystack if we have bankCode, otherwise fall back to owner name
      let accountName: string | null = null;
      let actualBankCode = bankCode;

      try {
        if (!actualBankCode) {
          // Try to look up bank code from our mapping using bankName
          const codeMap: Record<string, string> = {
            GTBank: "058",
            "Access Bank": "044",
            "Zenith Bank": "057",
            UBA: "033",
            "First Bank": "011",
            "Fidelity Bank": "070",
            "Sterling Bank": "032",
            "Union Bank": "032",
            "Wema Bank": "035",
            "Polaris Bank": "076",
            Ecobank: "050",
            "Stanbic IBTC": "221",
          };
          actualBankCode = codeMap[bankName];
        }

        if (actualBankCode) {
          const resolveRes = await psRequest("GET", `/bank/resolve?account_number=${accountNumber}&bank_code=${actualBankCode}`);
          accountName = resolveRes.data?.account_name || null;
        }
      } catch (resolveErr: any) {
        console.warn("Account resolution failed:", resolveErr.message);
      }

      if (!accountName) {
        accountName = business.owner.fullName || "Recipient";
      }

      if (!actualBankCode) {
        return res.status(400).json({ error: "Unable to determine bank code. Please select a supported bank." });
      }

      // Create transfer recipient
      const recipientRes = await psRequest("POST", "/transferrecipient", {
        type: "nuban",
        name: accountName,
        account_number: accountNumber,
        bank_code: actualBankCode,
        currency: "NGN",
      });

      const recipientCode = recipientRes.data?.recipient_code;
      if (!recipientCode) {
        return res.status(500).json({ error: "Failed to create transfer recipient" });
      }

      // Initiate transfer
      const transferRes = await psRequest("POST", "/transfer", {
        source: "balance",
        amount: amount * 100,
        recipient: recipientCode,
        reason: `Withdrawal for ${business.name}`,
      });

      if (!transferRes.status) {
        return res.status(500).json({ error: transferRes.message || "Transfer failed" });
      }

      // Record withdrawal
      const withdrawal = await prisma.withdrawal.create({
        data: {
          businessId,
          amount,
          accountNumber,
          bankName,
          bankCode: actualBankCode,
          accountName,
          status: "COMPLETED",
        },
      });

      res.status(201).json({
        message: "Withdrawal successful",
        withdrawal,
        transfer: transferRes.data,
      });
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      res.status(500).json({ error: error.message || "Failed to process withdrawal" });
    }
  }
);

router.post(
  "/confirm",
  authenticate,
  async (req: AuthRequest, res: Response) => {
    res.status(501).json({ error: "Endpoint disabled" });
  }
);

export default router;
