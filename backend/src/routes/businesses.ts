import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { ownerId: req.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ businesses });
  } catch (error) {
    res.status(500).json({ error: "Failed to get businesses" });
  }
});

router.get("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const business = await prisma.business.findFirst({
      where: { id, ownerId: req.userId },
    });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }
    res.json({ business });
  } catch (error) {
    res.status(500).json({ error: "Failed to get business" });
  }
});

router.post(
  "/",
  authenticate,
  [
    body("name").trim().notEmpty().withMessage("Business name is required"),
    body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
    body("phone").trim().notEmpty().withMessage("Phone is required"),
    body("address").trim().notEmpty().withMessage("Address is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check if user has active subscription
      // Temporary workaround until Prisma client is regenerated
      const activeSubscription = await prisma.$queryRaw`
        SELECT * FROM subscriptions 
        WHERE "userId" = ${req.userId} 
        AND status = 'ACTIVE'
        AND "endDate" > ${new Date()}
        ORDER BY "endDate" DESC
        LIMIT 1
      `;

      if (!activeSubscription) {
        return res.status(403).json({ 
          error: "Active subscription required to create a business",
          requiresSubscription: true,
          message: "You need an active subscription to create a business. Please subscribe to continue."
        });
      }

      const { name, email, phone, address } = req.body;

      const business = await prisma.business.create({
        data: {
          ownerId: req.userId!,
          name,
          email,
          phone,
          address,
        },
      });

      res.status(201).json({ business });
    } catch (error) {
      res.status(500).json({ error: "Failed to create business" });
    }
  }
);

router.put(
  "/:id",
  authenticate,
  [
    body("name").optional().trim().notEmpty(),
    body("email").optional().isEmail().normalizeEmail(),
    body("phone").optional().trim().notEmpty(),
    body("address").optional().trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, phone, address } = req.body;
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

      const existing = await prisma.business.findFirst({
        where: { id, ownerId: req.userId },
      });

      if (!existing) {
        return res.status(404).json({ error: "Business not found" });
      }

      const business = await prisma.business.update({
        where: { id },
        data: { name, email, phone, address },
      });

      res.json({ business });
    } catch (error) {
      res.status(500).json({ error: "Failed to update business" });
    }
  }
);

router.delete("/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await prisma.business.findFirst({
      where: { id, ownerId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Business not found" });
    }

    await prisma.business.delete({ where: { id } });

    res.json({ message: "Business deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete business" });
  }
});

export default router;