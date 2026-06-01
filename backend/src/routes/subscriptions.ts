import { Router, Response } from "express";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Pricing configuration
export const PRICING = {
  BASIC: { pricePerMonth: 1000000 },   // 10,000 NGN
  PREMIUM: { pricePerMonth: 2000000 }  // 20,000 NGN
};

// Get available pricing plans
router.get("/plans", (req: AuthRequest, res: Response) => {
  res.json({
    plans: [
      {
        type: "BASIC",
        name: "Basic Plan",
        pricePerMonth: 1000000,
        pricePerMonthNGN: 10000,
        description: "Standard access to digital menu and basic tipping",
        durations: [3, 6, 9, 12]
      },
      {
        type: "PREMIUM",
        name: "Premium Plan",
        pricePerMonth: 2000000,
        pricePerMonthNGN: 20000,
        description: "Advanced access with Staff Settlement and team reporting",
        durations: [3, 6, 9, 12]
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
    const hasPremiumAccess = (activeSubscription?.planType as any) === "PREMIUM";
    
    res.json({ 
      hasActiveSubscription,
      hasPremiumAccess,
      subscription: hasActiveSubscription ? activeSubscription : null,
      canCreateBusiness: hasActiveSubscription,
      hasStaffSettlementAccess: hasPremiumAccess
    });
  } catch (error) {
    console.error("Subscription status check error:", error);
    res.status(500).json({ error: "Failed to check subscription status" });
  }
});

// Create subscription
router.post("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { planType, paystackRef } = req.body;
    let { duration } = req.body;
    duration = Number(duration || 3);

    let price = 0;

    if (planType === "BASIC" || planType === "PREMIUM") {
      const pricing = PRICING[planType as keyof typeof PRICING];
      price = pricing.pricePerMonth * duration;
    } else {
      // Handle legacy plans
      const legacyPricing: any = {
        "THREE_MONTHS": { duration: 3, price: 3000000 },
        "SIX_MONTHS": { duration: 6, price: 6000000 },
        "NINE_MONTHS": { duration: 9, price: 9000000 },
        "TWELVE_MONTHS": { duration: 12, price: 12000000 }
      };
      const pricing = legacyPricing[planType];
      if (!pricing) return res.status(400).json({ error: "Invalid plan type" });
      duration = pricing.duration;
      price = pricing.price;
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + duration);

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.userId!,
        planType: planType as any,
        duration: duration,
        price: price,
        status: "ACTIVE",
        startDate: startDate,
        endDate: endDate,
        paystackRef,
      },
    });

    res.status(201).json({ subscription });
  } catch (error) {
    console.error("Create subscription error:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});



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
