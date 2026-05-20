import { Router, Response } from "express";
import prisma from "../../lib/prisma.js";
import { adminAuth, AdminRequest } from "../../middleware/admin.js";

const router = Router();

// Get all users with their businesses, subscriptions, and feedback counts
router.get("/", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        isVerified: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    const usersWithExtra = await Promise.all(
      users.map(async (user) => {
        const businessCount = await prisma.business.count({ where: { ownerId: user.id } });
        const feedbackCount = await prisma.feedback.count({
          where: { business: { ownerId: user.id } },
        });
        const hasActiveSub = await prisma.subscription.findFirst({
          where: { userId: user.id, status: "ACTIVE", endDate: { gt: new Date() } },
        });
        return {
          ...user,
          businessCount,
          feedbackCount,
          hasActiveSubscription: !!hasActiveSub,
        };
      })
    );

    res.json({ users: usersWithExtra });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({ error: "Failed to get users" });
  }
});

// Get user details by ID
router.get("/:id", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        businesses: {
          include: {
            menus: { select: { id: true, name: true, publicId: true, createdAt: true } },
            feedbacks: { select: { id: true, rating: true, createdAt: true, tipAmount: true } },
            withdrawals: { select: { id: true, amount: true, status: true, createdAt: true } },
          },
        },
        subscriptions: true,
        verifications: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// Activate/deactivate user
router.patch("/:id/toggle", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const updated = await prisma.user.update({
      where: { id },
      data: { isVerified: !user.isVerified },
    });
    res.json({ user: updated });
  } catch (error) {
    console.error("Toggle user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
router.delete("/:id", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.user.delete({ where: { id } });
    res.json({ message: "User deleted" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;