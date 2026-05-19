import { Router, Response } from "express";
import prisma from "../../lib/prisma.js";
import { adminAuth, AdminRequest } from "../../middleware/admin.js";

const router = Router();

// Get all withdrawals across all businesses
router.get("/", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        business: { select: { id: true, name: true, owner: { select: { fullName: true, email: true } } } },
      },
    });

    // Enrich with calculated tipAmount from feedback
    const result = await Promise.all(withdrawals.map(async (w) => {
      const totalTips = await prisma.feedback.aggregate({
        where: { businessId: w.businessId },
        _sum: { tipAmount: true },
      });
      return { ...w, totalTipsEarned: totalTips._sum?.tipAmount ?? 0 };
    }));

    res.json({ withdrawals: result });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    res.status(500).json({ error: "Failed to get withdrawals" });
  }
});

// Get withdrawals for a specific business
router.get("/:businessId", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const withdrawals = await prisma.withdrawal.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });

    const totalTips = await prisma.feedback.aggregate({
      where: { businessId },
      _sum: { tipAmount: true },
    });
    const totalWithdrawn = withdrawals.filter((w) => w.status === "COMPLETED").reduce((sum, w) => sum + w.amount, 0);

    res.json({
      withdrawals,
      wallet: {
        totalEarned: totalTips._sum?.tipAmount ?? 0,
        totalWithdrawn,
        availableBalance: (totalTips._sum?.tipAmount ?? 0) - totalWithdrawn,
      },
    });
  } catch (error) {
    console.error("Get business withdrawals error:", error);
    res.status(500).json({ error: "Failed to get withdrawals" });
  }
});

// Update withdrawal status
router.patch("/:id/status", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;

    if (!["PENDING", "APPROVED", "REJECTED", "COMPLETED"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const withdrawal = await prisma.withdrawal.update({
      where: { id },
      data: { status },
    });

    res.json({ withdrawal });
  } catch (error) {
    console.error("Update withdrawal status error:", error);
    res.status(500).json({ error: "Failed to update withdrawal status" });
  }
});

export default router;