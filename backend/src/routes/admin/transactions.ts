import { Router, Response } from "express";
import prisma from "../../lib/prisma.js";
import { adminAuth, AdminRequest } from "../../middleware/admin.js";

const router = Router();

// Get all tip transactions
router.get("/", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const search = (req.query.search as string) || "";
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { business: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Tip transactions are recorded as feedbacks with tipAmount > 0
    where.tipAmount = { gt: 0 };

    const [transactions, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        include: {
          business: {
            select: {
              id: true,
              name: true,
              owner: {
                select: {
                  id: true,
                  fullName: true,
                }
              }
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      transactions,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Get transactions error:", error);
    res.status(500).json({ error: "Failed to get transactions" });
  }
});

export default router;
