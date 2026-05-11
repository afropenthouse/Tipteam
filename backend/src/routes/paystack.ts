import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { sendVerificationEmail, sendPasswordResetEmail, sendPaymentReceivedEmail } from "../lib/email.js";

const router = Router();

async function psRequest(method: string, path: string, body?: Record<string, unknown>) {
  const baseUrl = "https://api.paystack.co";
  const sec = process.env.PAYSTACK_SECRET_KEY;
  if (!sec) throw new Error("PAYSTACK_SECRET_KEY missing");

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${sec}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.message || `Paystack API ${method} ${path} failed`);
    // @ts-ignore
    err.data = json;
    throw err;
  }
  return json;
}

type PaymentMetadata = {
  businessId?: string;
  rating?: number | string;
  experience?: string;
  phone?: string;
  teamNumber?: string;
  payerEmail?: string;
};

const getCallbackUrl = (req: Request, businessId: string) => {
  const frontendUrl = req.get("origin") || process.env.FRONTEND_URL || "http://localhost:5173";
  return `${frontendUrl.replace(/\/$/, "")}/rate/${businessId}`;
};

router.post(
  "/initialize",
  [
    body("email").isEmail().withMessage("A valid email is required"),
    body("amount").isInt({ min: 1 }).withMessage("Amount must be at least 1"),
    body("businessId").notEmpty().withMessage("Business ID is required"),
    body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be between 1 and 5"),
    body("experience").optional().isString(),
    body("phone").optional().isString(),
    body("teamNumber").optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid payment details" });
      }

      const { email, amount, businessId, rating, experience, phone, teamNumber } = req.body;

      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const transaction = await psRequest(
        "POST",
        "/transaction/initialize",
        {
          email,
          amount: Number(amount) * 100,
          currency: "NGN",
          callback_url: getCallbackUrl(req, businessId),
          metadata: {
            businessId,
            rating,
            experience: experience?.trim() || "",
            phone: phone?.trim() || "",
            teamNumber: teamNumber?.trim() || "",
            payerEmail: email,
          },
        }
      );

      if (!transaction.status || !transaction.data?.authorization_url) {
        return res.status(400).json({ error: transaction.message || "Failed to initialize payment" });
      }

      res.json({
        authorizationUrl: transaction.data.authorization_url,
        reference: transaction.data.reference,
      });
    } catch (error: any) {
      console.error("Paystack init error:", error);
      res.status(500).json({ error: error?.message || "Failed to initialize payment" });
    }
  }
);

router.post(
  "/verify",
  [body("reference").notEmpty().withMessage("Reference is required")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid payment reference" });
      }

      const { reference } = req.body;

      const existingFeedback = await prisma.feedback.findFirst({
        where: { paystackRef: reference },
      });

      if (existingFeedback) {
        return res.json({
          success: true,
          amount: existingFeedback.tipAmount,
          feedback: existingFeedback,
          alreadyProcessed: true,
        });
      }

      const transaction = await psRequest("GET", `/transaction/verify/${reference}`);

      if (!transaction.status) {
        return res.status(400).json({ error: transaction.message || "Unable to verify payment" });
      }

      const transactionData = transaction.data;
      if (!transactionData) {
        return res.status(400).json({ error: "Missing transaction details from Paystack" });
      }

      if (transactionData.status !== "success") {
        return res.status(400).json({ success: false, error: "Payment not successful" });
      }

      const amount = Math.round(transactionData.amount / 100);
      const metadata = (transactionData.metadata || {}) as PaymentMetadata;
      const businessId = metadata.businessId;
      const parsedRating = Number(metadata.rating);
      const rating = Number.isInteger(parsedRating) && parsedRating >= 1 && parsedRating <= 5 ? parsedRating : null;

      if (!businessId) {
        return res.status(400).json({ error: "Missing business ID in payment metadata" });
      }

      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const feedback = await prisma.feedback.create({
        data: {
          businessId,
          rating,
          experience: metadata.experience?.trim() || undefined,
          phone: metadata.phone?.trim() || undefined,
          tipAmount: amount,
          paystackRef: reference,
        },
      });

      // Send payment received email to business owner
      try {
        const business = await prisma.business.findUnique({
          where: { id: businessId },
          select: { name: true, owner: { select: { fullName: true, email: true } } }
        });

        if (business?.owner) {
          await sendPaymentReceivedEmail(
            business.owner.email,
            business.owner.fullName,
            {
              amount,
              customerName: metadata.payerEmail,
              businessName: business.name,
              rating: rating || undefined
            }
          );
          console.log("Payment received email sent to:", business.owner.email);
        }
      } catch (emailError) {
        console.error("Failed to send payment received email:", emailError);
      }

      res.json({ success: true, amount, feedback });
    } catch (error: any) {
      console.error("Paystack verify error:", error);
      res.status(500).json({ error: error?.message || "Failed to verify payment" });
    }
  }
);

// Subscription payment initialization
router.post(
  "/initialize-subscription",
  authenticate,
  [
    body("email").isEmail().withMessage("A valid email is required"),
    body("amount").isInt({ min: 1 }).withMessage("Amount must be at least 1"),
    body("planType").isIn(["THREE_MONTHS", "SIX_MONTHS", "NINE_MONTHS", "TWELVE_MONTHS"]).withMessage("Invalid plan type"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid payment details" });
      }

      const { email, amount, planType } = req.body;

      const transaction = await psRequest(
        "POST",
        "/transaction/initialize",
        {
          email,
          amount,
          currency: "NGN",
          callback_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard/subscriptions`,
          metadata: {
            planType,
            payerEmail: email,
            type: "subscription",
          },
        }
      );

      if (!transaction.status || !transaction.data?.authorization_url) {
        return res.status(400).json({ error: transaction.message || "Failed to initialize subscription payment" });
      }

      res.json({
        authorizationUrl: transaction.data.authorization_url,
        reference: transaction.data.reference,
      });
    } catch (error: any) {
      console.error("Paystack subscription init error:", error);
      res.status(500).json({ error: error?.message || "Failed to initialize subscription payment" });
    }
  }
);

// Subscription payment verification
router.post(
  "/verify-subscription",
  authenticate,
  [body("reference").notEmpty().withMessage("Reference is required")],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg || "Invalid payment reference" });
      }

      const { reference, planType: requestPlanType } = req.body;

      const transaction = await psRequest("GET", `/transaction/verify/${reference}`);

      if (!transaction.status) {
        return res.status(400).json({ error: transaction.message || "Unable to verify payment" });
      }

      const transactionData = transaction.data;
      if (!transactionData) {
        return res.status(400).json({ error: "Missing transaction details from Paystack" });
      }

      if (transactionData.status !== "success") {
        return res.status(400).json({ success: false, error: "Payment not successful" });
      }

      const metadata = (transactionData.metadata || {}) as { planType?: string };
      const planType = requestPlanType || metadata.planType;

      const pricing = {
        THREE_MONTHS: { duration: 3, price: 3000000 },
        SIX_MONTHS: { duration: 6, price: 6000000 },
        NINE_MONTHS: { duration: 9, price: 9000000 },
        TWELVE_MONTHS: { duration: 12, price: 12000000 },
      };

      const plan = pricing[planType as keyof typeof pricing];
      if (!plan) {
        return res.status(400).json({ error: "Invalid plan type" });
      }

      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + plan.duration);

      const subscription = await prisma.subscription.create({
        data: {
          userId,
          planType: planType as "THREE_MONTHS" | "SIX_MONTHS" | "NINE_MONTHS" | "TWELVE_MONTHS",
          duration: plan.duration,
          price: plan.price,
          status: "ACTIVE",
          startDate,
          endDate,
          paystackRef: reference,
        },
      });

      res.json({ success: true, subscription });
    } catch (error: any) {
      console.error("Paystack subscription verify error:", error);
      res.status(500).json({ error: error?.message || "Failed to verify subscription payment" });
    }
  }
);

// Bank name to Paystack bank code mapping for Nigerian banks
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

// Get all Nigerian banks
router.get("/banks", async (_req, res) => {
  try {
    const result = await psRequest("GET", "/bank?country=nigeria");
    res.json({ banks: result.data });
  } catch (error: any) {
    console.error("Paystack banks error:", error);
    res.status(500).json({ error: error?.message || "Failed to fetch banks" });
  }
});

// Resolve Nigerian bank account number to account name (public - no auth)
router.get("/resolve-account", async (req, res) => {
  try {
    const { bankCode, accountNumber } = req.query;

    if (!bankCode || typeof bankCode !== "string") {
      return res.status(400).json({ error: "bankCode query parameter is required" });
    }

    if (!accountNumber || typeof accountNumber !== "string") {
      return res.status(400).json({ error: "accountNumber query parameter is required" });
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({ error: "accountNumber must be a 10-digit number" });
    }

    const result = await psRequest("GET", `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);

    res.json({
      accountName: result.data.account_name,
      accountNumber: result.data.account_number,
      bankCode,
    });
  } catch (error: any) {
    console.error("Paystack resolve account error:", error);
    const data = error?.data || {};
    const msg = data?.message || "Unable to resolve account";
    if (msg && msg.toLowerCase().includes("not found")) {
      return res.status(400).json({ error: "Account not found. Please check the account number and try again." });
    }
    res.status(500).json({ error: error?.message || "Failed to resolve account" });
  }
});

// Create transfer recipient (authenticated)
router.post("/transferrecipient", authenticate, async (req, res) => {
  try {
    const { account_number, account_bank, name, type = "nuban", currency = "NGN" } = req.body;

    if (!account_number || !account_bank || !name) {
      return res.status(400).json({ error: "account_number, account_bank, and name are required" });
    }

    const result = await psRequest("POST", "/transferrecipient", {
      type,
      currency,
      name,
      account_number,
      bank: {
        account_number,
        bank_code: account_bank,
      },
    });

    res.json({
      recipient_code: result.data.recipient_code,
      ...result.data,
    });
  } catch (error: any) {
    console.error("Paystack transfer recipient error:", error);
    res.status(500).json({ error: error?.message || "Failed to create transfer recipient" });
  }
});

// Initiate transfer (authenticated)
router.post("/transfer", authenticate, async (req, res) => {
  try {
    const { amount, recipient_code, reason } = req.body;

    if (!amount || !recipient_code) {
      return res.status(400).json({ error: "amount and recipient_code are required" });
    }

    const result = await psRequest("POST", "/transfer", {
      source: "balance",
      amount: Number(amount) * 100,
      recipient: recipient_code,
      reason,
    });

    res.json(result.data);
  } catch (error: any) {
    console.error("Paystack transfer error:", error);
    res.status(500).json({ error: error?.message || "Failed to initiate transfer" });
  }
});

export default router;
