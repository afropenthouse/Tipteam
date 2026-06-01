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

    // Proactively deactivate expired customers
    await prisma.customer.updateMany({
      where: {
        businessId: { in: businessIds },
        subscriptionStatus: "ACTIVE",
        activationExpiry: {
          lt: new Date()
        }
      },
      data: {
        subscriptionStatus: "INACTIVE"
      }
    });

    const customers = await prisma.customer.findMany({
      where: {
        businessId: { in: businessIds },
      },
      include: {
        checkIns: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        business: {
          select: { name: true }
        }
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

      const { businessId, customers, status, expiryDate } = req.body;

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
              subscriptionStatus: status || "PENDING",
              activationExpiry: (status === "ACTIVE" && expiryDate) ? new Date(expiryDate) : null
            } as any,
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

// Activate customer subscription with optional expiry
router.put("/customers/:id/activate", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { expiryDate } = req.body;

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
      data: { 
        subscriptionStatus: "ACTIVE",
        activationExpiry: expiryDate ? new Date(expiryDate) : null
      } as any,
    });

    res.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Error activating customer:", error);
    res.status(500).json({ error: "Failed to activate customer" });
  }
});

// Deactivate customer
router.put("/customers/:id/deactivate", authenticate, async (req: AuthRequest, res: Response) => {
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
      data: { 
        subscriptionStatus: "INACTIVE",
        activationExpiry: null
      } as any,
    });

    res.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Error deactivating customer:", error);
    res.status(500).json({ error: "Failed to deactivate customer" });
  }
});

// Bulk update customer status
router.post("/customers/bulk-status", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, status, expiryDate } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "IDs must be a non-empty array" });
    }

    // Verify all customers belong to businesses owned by the user
    const customers = await prisma.customer.findMany({
      where: {
        id: { in: ids },
        business: { ownerId: req.userId }
      }
    });

    if (customers.length !== ids.length) {
      return res.status(403).json({ error: "One or more customers not found or not owned by user" });
    }

    await prisma.customer.updateMany({
      where: { id: { in: ids } },
      data: {
        subscriptionStatus: status,
        activationExpiry: status === "ACTIVE" && expiryDate ? new Date(expiryDate) : null
      } as any
    });

    res.json({ message: `Bulk updated ${ids.length} customers to ${status}` });
  } catch (error) {
    console.error("Error bulk updating customers:", error);
    res.status(500).json({ error: "Failed to bulk update customers" });
  }
});

// Public check-in for customers
router.post("/public/:businessId", async (req, res) => {
  try {
    const { businessId } = req.params;
    const { name, phone } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone number are required for check-in" });
    }

    // Check if business allows check-in
    const businessResult = await prisma.$queryRaw`
      SELECT id, "allowCheckin" FROM businesses WHERE id = ${businessId}
    ` as any[];
    
    const business = businessResult[0];

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (!business.allowCheckin) {
      return res.status(403).json({ error: "Check-in is not enabled for this business" });
    }

    // Find active customer by name and phone
    const customer = await prisma.customer.findFirst({
      where: {
        businessId,
        name: {
          equals: name,
          mode: 'insensitive'
        },
        phone: {
          contains: phone // Use contains to handle different formats if necessary, or equals for exact match
        },
        subscriptionStatus: "ACTIVE"
      }
    });

    if (!customer) {
      return res.status(403).json({ 
        success: false, 
        message: "Check-in failed. You are not an active member of this business." 
      });
    }

    // Check expiry
    if (customer.activationExpiry && new Date(customer.activationExpiry) < new Date()) {
      // Automatically deactivate if expired
      await prisma.customer.update({
        where: { id: customer.id },
        data: { subscriptionStatus: "INACTIVE" }
      });

      return res.status(403).json({ 
        success: false, 
        message: "Check-in failed. Your membership has expired." 
      });
    }

    // Record check-in
    await prisma.checkIn.create({
      data: {
        customerId: customer.id
      }
    });

    res.json({ 
      success: true, 
      message: `Welcome, ${customer.name}! Check-in successful.` 
    });
  } catch (error) {
    console.error("Public check-in error:", error);
    res.status(500).json({ error: "Failed to process check-in" });
  }
});

// Record a check-in (authenticated - for business owner to manually check-in someone)
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

// Delete a customer
router.delete("/customers/:id", authenticate, async (req: AuthRequest, res: Response) => {
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

    await prisma.customer.delete({
      where: { id },
    });

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error("Error deleting customer:", error);
    res.status(500).json({ error: "Failed to delete customer" });
  }
});

// Clear check-in history for a customer
router.delete("/customers/:id/history", authenticate, async (req: AuthRequest, res: Response) => {
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

    await prisma.checkIn.deleteMany({
      where: { customerId: id },
    });

    res.json({ message: "Check-in history cleared" });
  } catch (error) {
    console.error("Error clearing history:", error);
    res.status(500).json({ error: "Failed to clear history" });
  }
});

export default router;
