import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Pricing configuration (10,000 NGN per month = 1,000,000 kobo)
const PRICING = {
  THREE_MONTHS: { duration: 3, price: 3000000 }, // 3 months * 10,000 NGN
  SIX_MONTHS: { duration: 6, price: 6000000 },   // 6 months * 10,000 NGN
  NINE_MONTHS: { duration: 9, price: 9000000 },  // 9 months * 10,000 NGN
  TWELVE_MONTHS: { duration: 12, price: 12000000 } // 12 months * 10,000 NGN
};

// Get available pricing plans
router.get("/plans", (req: AuthRequest, res: Response) => {
  res.json({
    plans: [
      {
        type: "THREE_MONTHS",
        duration: 3,
        price: 3000000,
        priceNGN: 30000,
        description: "3 months subscription"
      },
      {
        type: "SIX_MONTHS",
        duration: 6,
        price: 6000000,
        priceNGN: 60000,
        description: "6 months subscription"
      },
      {
        type: "NINE_MONTHS",
        duration: 9,
        price: 9000000,
        priceNGN: 90000,
        description: "9 months subscription"
      },
      {
        type: "TWELVE_MONTHS",
        duration: 12,
        price: 12000000,
        priceNGN: 120000,
        description: "12 months subscription"
      }
    ]
  });
});

// Get user's active subscriptions
router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    
    res.json({ subscriptions });
  } catch (error) {
    console.error("Get subscriptions error:", error);
    res.status(500).json({ error: "Failed to get subscriptions" });
  }
});

// Check if user has active subscription
router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId: req.userId,
        status: "ACTIVE",
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: "desc" },
    });
    
    const hasActiveSubscription = !!activeSubscription;
    
    res.json({ 
      hasActiveSubscription,
      subscription: hasActiveSubscription ? activeSubscription : null,
      canCreateBusiness: hasActiveSubscription
    });
  } catch (error) {
    console.error("Subscription status check error:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
});

// Create new subscription (after payment)
router.post(
  "/",
  authenticate,
  [
    body("planType").isIn(["THREE_MONTHS", "SIX_MONTHS", "NINE_MONTHS", "TWELVE_MONTHS"]).withMessage("Invalid plan type"),
    body("paystackRef").notEmpty().withMessage("Paystack reference is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { planType, paystackRef } = req.body;
      const pricing = PRICING[planType as keyof typeof PRICING];

      if (!pricing) {
        return res.status(400).json({ error: "Invalid plan type" });
      }

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + pricing.duration);

      // Create subscription
      const subscription = await prisma.subscription.create({
        data: {
          userId: req.userId!,
          planType: planType as "THREE_MONTHS" | "SIX_MONTHS" | "NINE_MONTHS" | "TWELVE_MONTHS",
          duration: pricing.duration,
          price: pricing.price,
          status: "ACTIVE",
          startDate: startDate,
          endDate: endDate,
          paystackRef,
        },
      });

      res.status(201).json({ subscription });
    } catch (error) {
      res.status(500).json({ error: "Failed to create subscription" });
    }
  }
);

// Cancel subscription
router.patch("/:id/cancel", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    const subscription = await prisma.subscription.findFirst({
      where: { id, userId: req.userId },
    });

    if (!subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { id },
      data: { status: "CANCELLED", updatedAt: new Date() },
    });

    res.json({ subscription: updatedSubscription });
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

export default router;
