import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Get all customers for the user's businesses
router.get("/customers", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businesses = await prisma.business.findMany({
      where: { ownerId: req.userId },
      select: { id: true },
    });

    const businessIds = businesses.map((b) => b.id);

    const customers = await prisma.customer.findMany({
      where: {
        businessId: { in: businessIds },
      },
      include: {
        checkIns: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Format customers to include lastCheckIn date
    const formattedCustomers = customers.map((c) => ({
      ...c,
      lastCheckIn: c.checkIns[0]?.createdAt || null,
    }));

    res.json({ customers: formattedCustomers });
  } catch (error) {
    console.error("Error getting customers:", error);
    res.status(500).json({ error: "Failed to get customers" });
  }
});

// Add a new customer
router.post(
  "/customers",
  authenticate,
  [
    body("businessId").trim().notEmpty().withMessage("Business ID is required"),
    body("customers").isArray({ min: 1 }).withMessage("Customers list must be an array with at least one customer"),
    body("customers.*.name").trim().notEmpty().withMessage("Customer name is required"),
    body("customers.*.phone").trim().notEmpty().withMessage("Phone number is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { businessId, customers } = req.body;

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.userId },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found or not owned by user" });
      }

      const createdCustomers = await Promise.all(
        customers.map(async (c: { name: string; phone: string }) => {
          return await prisma.customer.create({
            data: {
              name: c.name,
              phone: c.phone,
              businessId,
              subscriptionStatus: "PENDING",
            },
          });
        })
      );

      res.status(201).json({ customers: createdCustomers });
    } catch (error) {
      console.error("Error creating customers:", error);
      res.status(500).json({ error: "Failed to create customers" });
    }
  }
);

// Activate customer subscription
router.put("/customers/:id/activate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership through business
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        business: { ownerId: req.userId },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: { subscriptionStatus: "ACTIVE" },
    });

    res.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Error activating customer:", error);
    res.status(500).json({ error: "Failed to activate customer" });
  }
});

// Record a check-in
router.post("/customers/:id/checkin", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Verify ownership through business
    const customer = await prisma.customer.findFirst({
      where: {
        id,
        business: { ownerId: req.userId },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const checkIn = await prisma.checkIn.create({
      data: {
        customerId: id,
      },
    });

    res.status(201).json({ checkIn });
  } catch (error) {
    console.error("Error recording check-in:", error);
    res.status(500).json({ error: "Failed to record check-in" });
  }
});

export default router;
