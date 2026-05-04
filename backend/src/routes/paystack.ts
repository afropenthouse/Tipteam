import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { createRequire } from "module";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();
const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
const require = createRequire(import.meta.url);
const paystackModule = require("paystack-sdk") as {
  default?: new (key: string) => PaystackClient;
  Paystack?: new (key: string) => PaystackClient;
};

type PaystackClient = {
  transaction: {
    initialize(data: {
      email: string;
      amount: string;
      currency: string;
      callback_url: string;
      metadata: Record<string, unknown>;
    }): Promise<{
      status: boolean;
      message: string;
      data?: {
        authorization_url?: string;
        reference: string;
      } | null;
    }>;
    verify(reference: string): Promise<{
      status: boolean;
      message: string;
      data?: {
        amount: number;
        status: string;
        metadata?: Record<string, unknown>;
      } | null;
    }>;
  };
};

type PaymentMetadata = {
  businessId?: string;
  rating?: number | string;
  experience?: string;
  phone?: string;
  teamNumber?: string;
  payerEmail?: string;
};

const getPaystackClient = () => {
  if (!paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured");
  }

  const PaystackCtor = paystackModule.default || paystackModule.Paystack;
  if (!PaystackCtor) {
    throw new Error("Unable to load Paystack SDK constructor");
  }

  return new PaystackCtor(paystackSecretKey);
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

      const paystack = getPaystackClient();
      const transaction = await paystack.transaction.initialize({
        email,
        amount: String(Number(amount) * 100),
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
      });

      if (!transaction.status || !transaction.data?.authorization_url) {
        return res.status(400).json({ error: transaction.message || "Failed to initialize payment" });
      }

      res.json({
        authorizationUrl: transaction.data.authorization_url,
        reference: transaction.data.reference,
      });
    } catch (error) {
      console.error("Paystack init error:", error);
      res.status(500).json({ error: "Failed to initialize payment" });
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

      const paystack = getPaystackClient();
      const transaction = await paystack.transaction.verify(reference);

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

      res.json({ success: true, amount, feedback });
    } catch (error) {
      console.error("Paystack verify error:", error);
      res.status(500).json({ error: "Failed to verify payment" });
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

      const paystack = getPaystackClient();
      const transaction = await paystack.transaction.initialize({
        email,
        amount: String(amount),
        currency: "NGN",
        callback_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/dashboard/subscriptions`,
        metadata: {
          planType,
          payerEmail: email,
          type: "subscription",
        },
      });

      if (!transaction.status || !transaction.data?.authorization_url) {
        return res.status(400).json({ error: transaction.message || "Failed to initialize subscription payment" });
      }

      res.json({
        authorizationUrl: transaction.data.authorization_url,
        reference: transaction.data.reference,
      });
    } catch (error) {
      console.error("Paystack subscription init error:", error);
      res.status(500).json({ error: "Failed to initialize subscription payment" });
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

      const paystack = getPaystackClient();
      const transaction = await paystack.transaction.verify(reference);

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

      // Get planType from request body or transaction metadata
      const metadata = (transactionData.metadata || {}) as { planType?: string };
      const planType = requestPlanType || metadata.planType;

      // Create subscription after successful payment
      const pricing = {
        THREE_MONTHS: { duration: 3, price: 3000000 },
        SIX_MONTHS: { duration: 6, price: 6000000 },
        NINE_MONTHS: { duration: 9, price: 9000000 },
        TWELVE_MONTHS: { duration: 12, price: 12000000 }
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

      // Create subscription
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
    } catch (error) {
      console.error("Paystack subscription verify error:", error);
      res.status(500).json({ error: "Failed to verify subscription payment" });
    }
  }
);

export default router;
