import { Router } from "express";
import prisma from "../../lib/prisma.js";
import adminAuthRoutes from "./auth.js";
import adminUserRoutes from "./users.js";
import adminBusinessRoutes from "./businesses.js";
import adminFeedbackRoutes from "./feedback.js";
import adminWithdrawalRoutes from "./withdrawals.js";

const router = Router();

router.use("/auth", adminAuthRoutes);
router.use("/users", adminUserRoutes);
router.use("/businesses", adminBusinessRoutes);
router.use("/feedback", adminFeedbackRoutes);
router.use("/withdrawals", adminWithdrawalRoutes);

// Admin dashboard stats
router.get("/dashboard-stats", async (req, res) => {
  try {
    const [totalUsers, totalBusinesses, totalFeedback, totalWithdrawals, activeSubscriptions] = await Promise.all([
      prisma.user.count(),
      prisma.business.count(),
      prisma.feedback.count(),
      prisma.withdrawal.count(),
      prisma.subscription.count({ where: { status: "ACTIVE", endDate: { gt: new Date() } } }),
    ]);

    const totalTipsEarned = await prisma.feedback.aggregate({
      _sum: { tipAmount: true },
    });

    const completedWithdrawals = await prisma.withdrawal.aggregate({
      _sum: { amount: true },
      where: { status: "COMPLETED" },
    });

    res.json({
      stats: {
        totalUsers,
        totalBusinesses,
        totalFeedback,
        totalWithdrawals,
        activeSubscriptions,
        totalTipsEarned: totalTipsEarned._sum?.tipAmount ?? 0,
        totalAmountWithdrawn: completedWithdrawals._sum?.amount ?? 0,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

export default router;