import { Router } from "express";
import prisma from "../../lib/prisma.js";
import adminAuthRoutes from "./auth.js";
import adminUserRoutes from "./users.js";
import adminBusinessRoutes from "./businesses.js";
import adminFeedbackRoutes from "./feedback.js";
import adminTransactionRoutes from "./transactions.js";

const router = Router();

router.use("/auth", adminAuthRoutes);
router.use("/users", adminUserRoutes);
router.use("/businesses", adminBusinessRoutes);
router.use("/feedback", adminFeedbackRoutes);
router.use("/transactions", adminTransactionRoutes);

// Admin dashboard stats
router.get("/dashboard-stats", async (req, res) => {
  try {
    const [totalUsers, totalBusinesses, totalFeedback, activeSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.feedback.count(),
      prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gt: new Date() } } }),
    ]);

    const totalTipsEarned = await prisma.feedback.aggregate({
      _sum: { tipAmount: true },
    });

    res.json({
      stats: {
        totalUsers,
        totalBusinesses,
        totalFeedback,
        activeSubscriptions,
        totalTipsEarned: totalTipsEarned._sum?.tipAmount ?? 0,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;