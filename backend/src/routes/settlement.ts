import { Router, Response, Request } from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import cloudinary from "../lib/cloudinary.js";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper to check for premium subscription
const checkPremiumAccess = async (userId: string) => {
  const activeSubscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
      endDate: { gt: new Date() },
      planType: "PREMIUM" as any
    },
  });
  return !!activeSubscription;
};

// --- Staff Endpoints ---

// Get all staff for a business
router.get("/:businessId/staff", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isPremium = await checkPremiumAccess(req.userId!);
    if (!isPremium) {
      return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
    }

    const businessId = req.params.businessId as string;
    
    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const staff = await (prisma as any).staff.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ staff });
  } catch (error) {
    res.status(500).json({ error: "Failed to get staff" });
  }
});

// Add new staff
router.post(
  "/:businessId/staff",
  authenticate,
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("role").trim().notEmpty().withMessage("Role is required"),
    body("commission").isFloat({ min: 0, max: 100 }).withMessage("Commission must be between 0 and 100"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const isPremium = await checkPremiumAccess(req.userId!);
      if (!isPremium) {
        return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
      }

      const businessId = req.params.businessId as string;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.userId },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const { name, role, commission } = req.body;
      const staff = await (prisma as any).staff.create({
        data: {
          businessId,
          name,
          role,
          commission: parseFloat(commission),
        },
      });

      res.status(201).json({ staff });
    } catch (error) {
      res.status(500).json({ error: "Failed to create staff" });
    }
  }
);

// Delete staff
router.delete("/staff/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isPremium = await checkPremiumAccess(req.userId!);
    if (!isPremium) {
      return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
    }

    const id = req.params.id as string;
    const staff = await (prisma as any).staff.findFirst({
      where: { id },
      include: { business: true },
    });

    if (!staff || staff.business.ownerId !== req.userId) {
      return res.status(404).json({ error: "Staff member not found" });
    }

    await (prisma as any).staff.delete({ where: { id } });
    res.json({ message: "Staff member deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete staff" });
  }
});

// Update staff
router.put(
  "/staff/:id",
  authenticate,
  [
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("role").optional().trim().notEmpty().withMessage("Role cannot be empty"),
    body("commission").optional().isFloat({ min: 0, max: 100 }).withMessage("Commission must be between 0 and 100"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const isPremium = await checkPremiumAccess(req.userId!);
      if (!isPremium) {
        return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
      }

      const id = req.params.id as string;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify business ownership via staff relation
      const staff = await (prisma as any).staff.findFirst({
        where: { id },
        include: { business: true },
      });

      if (!staff || staff.business.ownerId !== req.userId) {
        return res.status(404).json({ error: "Staff member not found" });
      }

      const { name, role, commission } = req.body;
      const updatedStaff = await (prisma as any).staff.update({
        where: { id },
        data: {
          name: name !== undefined ? name : staff.name,
          role: role !== undefined ? role : staff.role,
          commission: commission !== undefined ? parseFloat(commission) : staff.commission,
        },
      });

      res.json({ staff: updatedStaff });
    } catch (error) {
      res.status(500).json({ error: "Failed to update staff" });
    }
  }
);

// --- Service Endpoints ---

// Get all services for a business
router.get("/:businessId/services", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isPremium = await checkPremiumAccess(req.userId!);
    if (!isPremium) {
      return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
    }

    const businessId = req.params.businessId as string;
    
    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const services = await (prisma as any).service.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: "Failed to get services" });
  }
});

// Add new service
router.post(
  "/:businessId/services",
  authenticate,
  [
    body("name").trim().notEmpty().withMessage("Service name is required"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const isPremium = await checkPremiumAccess(req.userId!);
      if (!isPremium) {
        return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
      }

      const businessId = req.params.businessId as string;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.userId },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const { name, amount } = req.body;
      const service = await (prisma as any).service.create({
        data: {
          businessId,
          name,
          amount: parseFloat(amount),
        },
      });

      res.status(201).json({ service });
    } catch (error) {
      res.status(500).json({ error: "Failed to create service" });
    }
  }
);

// Delete service
router.delete("/services/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isPremium = await checkPremiumAccess(req.userId!);
    if (!isPremium) {
      return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
    }

    const id = req.params.id as string;
    const service = await (prisma as any).service.findFirst({
      where: { id },
      include: { business: true },
    });

    if (!service || service.business.ownerId !== req.userId) {
      return res.status(404).json({ error: "Service not found" });
    }

    await (prisma as any).service.delete({ where: { id } });
    res.json({ message: "Service deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete service" });
  }
});

// --- Receipt Endpoints ---

// Get all receipts for a business
router.get("/:businessId/receipts", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const isPremium = await checkPremiumAccess(req.userId!);
    if (!isPremium) {
      return res.status(403).json({ error: "Premium subscription required for Staff Settlement features" });
    }

    const businessId = req.params.businessId as string;
    
    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const receipts = await (prisma as any).receipt.findMany({
      where: { businessId },
      include: {
        staff: { select: { name: true } },
        service: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ receipts });
  } catch (error) {
    res.status(500).json({ error: "Failed to get receipts" });
  }
});

// Add new receipt
router.post(
  "/:businessId/receipts",
  authenticate,
  [
    body("staffId").isUUID().withMessage("Valid staff ID is required"),
    body("serviceId").isUUID().withMessage("Valid service ID is required"),
    body("amount").isFloat({ min: 0 }).withMessage("Amount must be a positive number"),
    body("date").isISO8601().withMessage("Valid date is required"),
    body("imageUrl").optional({ checkFalsy: true }).isURL().withMessage("Must be a valid URL"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const businessId = req.params.businessId as string;
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Verify business ownership
      const business = await prisma.business.findFirst({
        where: { id: businessId, ownerId: req.userId },
      });

      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const { staffId, serviceId, amount, date, imageUrl } = req.body;
      const receipt = await (prisma as any).receipt.create({
        data: {
          businessId,
          staffId,
          serviceId,
          amount: parseFloat(amount),
          date: new Date(date),
          imageUrl: imageUrl || null,
        },
        include: {
          staff: { select: { name: true } },
          service: { select: { name: true } },
        },
      });

      res.status(201).json({ receipt });
    } catch (error) {
      res.status(500).json({ error: "Failed to create receipt" });
    }
  }
);

// Delete receipt
router.delete("/receipts/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const receipt = await (prisma as any).receipt.findFirst({
      where: { id },
      include: { business: true },
    });

    if (!receipt || receipt.business.ownerId !== req.userId) {
      return res.status(404).json({ error: "Receipt not found" });
    }

    await (prisma as any).receipt.delete({ where: { id } });
    res.json({ message: "Receipt deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete receipt" });
  }
});

// Get all staff for a business (public)
router.get("/public/:businessId/staff", async (req: Request, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const staff = await (prisma as any).staff.findMany({
      where: { businessId },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json({ staff });
  } catch (error) {
    res.status(500).json({ error: "Failed to get staff" });
  }
});

// Get all services for a business (public)
router.get("/public/:businessId/services", async (req: Request, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const services = await (prisma as any).service.findMany({
      where: { businessId },
      select: { id: true, name: true, amount: true },
      orderBy: { name: "asc" },
    });
    res.json({ services });
  } catch (error) {
    res.status(500).json({ error: "Failed to get services" });
  }
});

// Submit a receipt (public)
router.post("/public/:businessId/receipts", upload.single('receipt'), async (req: Request, res: Response) => {
  try {
    const businessId = req.params.businessId as string;
    const { staffId, serviceId, amount, date } = req.body;
    
    console.log("Public receipt submission:", { businessId, staffId, serviceId, amount, date, hasFile: !!req.file });

    // Minimal validation for public submission
    if (!staffId || !serviceId || !amount || !date) {
      console.warn("Missing fields in public receipt submission:", { staffId, serviceId, amount, date });
      return res.status(400).json({ error: "Missing required fields" });
    }

    let imageUrl = null;
    if (req.file) {
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: 'receipts',
              resource_type: 'auto',
              type: 'upload',
              access_mode: 'public',
              // Force inline display in the browser instead of automatic download
              content_disposition: 'inline'
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file!.buffer);
        });
        imageUrl = (uploadResult as any).secure_url;
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        throw new Error(`Cloudinary upload failed: ${cloudinaryError instanceof Error ? cloudinaryError.message : 'Unknown error'}`);
      }
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount)) {
      return res.status(400).json({ error: "Invalid amount provided" });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid date provided" });
    }

    if (!(prisma as any).receipt) {
      console.error("Prisma 'receipt' model is not available in the client. Please run 'npx prisma generate'.");
      return res.status(500).json({ error: "Server configuration error: Receipt model missing" });
    }

    const receipt = await (prisma as any).receipt.create({
      data: {
        businessId,
        staffId,
        serviceId,
        amount: parsedAmount,
        date: parsedDate,
        imageUrl,
      },
      include: {
        staff: { select: { name: true } },
        service: { select: { name: true } },
      },
    });

    res.status(201).json({ receipt });
  } catch (error) {
    console.error("Public receipt submission error:", error);
    res.status(500).json({ 
      error: "Failed to submit receipt", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;
