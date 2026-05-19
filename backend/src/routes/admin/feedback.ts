import { Router, Response } from "express";
import prisma from "../../lib/prisma.js";
import { adminAuth, AdminRequest } from "../../middleware/admin.js";

const router = Router();

// Get all feedback across all businesses (with business and owner info)
router.get("/", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, businessId, rating, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (businessId) where.businessId = businessId as string;
    if (rating) where.rating = Number(rating);
    if (search) {
      where.OR = [
        { experience: { contains: search as string, mode: "insensitive" } },
        { complaint: { contains: search as string, mode: "insensitive" } },
        { phone: { contains: search as string, mode: "insensitive" } },
      ];
    }

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
        include: {
          business: { select: { id: true, name: true, email: true, owner: { select: { fullName: true } } } },
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({ feedback: feedbacks, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) });
  } catch (error) {
    console.error("Get feedback error:", error);
    res.status(500).json({ error: "Failed to get feedback" });
  }
});

// Get feedback for a specific business (accessible via admin even if not owner)
router.get("/:businessId", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [feedbacks, total] = await Promise.all([
      prisma.feedback.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        skip,
        take: Number(limit),
      }),
      prisma.feedback.count({ where: { businessId } }),
    ]);

    res.json({ feedback: feedbacks, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    console.error("Get business feedback error:", error);
    res.status(500).json({ error: "Failed to get feedback" });
  }
});

// Delete a feedback entry
router.delete("/:id", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.feedback.delete({ where: { id } });
    res.json({ message: "Feedback deleted" });
  } catch (error) {
    console.error("Delete feedback error:", error);
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

export default router;