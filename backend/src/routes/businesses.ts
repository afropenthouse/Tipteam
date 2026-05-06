import { Router, Response } from "express";
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
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

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

// Get business by id (public - no auth required for rating link access)
router.get("/public/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const business = await prisma.business.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
      }
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json({ business });
  } catch (error) {
    res.status(500).json({ error: "Failed to get business" });
  }
});

// Get menu by publicId (public - no auth required for QR code access)
router.get("/menu/:publicId", async (req: AuthRequest, res: Response) => {
  try {
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;

    const menu = await prisma.menu.findFirst({
      where: { publicId },
      include: {
        business: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true
          }
        }
      }
    });

    if (!menu) {
      return res.status(404).json({ error: "Menu not found" });
    }

    res.json({ menu });
  } catch (error) {
    res.status(500).json({ error: "Failed to get menu" });
  }
});

// Get all menus for a business
router.get("/:id/menus", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    const business = await prisma.business.findFirst({
      where: { id, ownerId: req.userId },
      include: { menus: { orderBy: { createdAt: 'desc' } } }
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json({ menus: business.menus });
  } catch (error) {
    res.status(500).json({ error: "Failed to get menus" });
  }
});

// Upload menu PDF and generate QR code
router.post("/:id/menus", authenticate, upload.single('menu'), async (req: AuthRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name } = req.body;

    const existing = await prisma.business.findFirst({
      where: { id, ownerId: req.userId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Business not found" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Generate a unique URL-safe public ID for the menu
    const generatePublicId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const menuPublicId = generatePublicId();

    // Upload PDF to Cloudinary as a private raw file
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'business-menus',
          public_id: menuPublicId,
          format: 'pdf',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file!.buffer);
    });

    // Cloudinary returns the full public_id with folder
    const cloudinaryPublicId = result.public_id;

    // Store the Cloudinary public_id in DB (not the URL)
    const menu = await prisma.menu.create({
      data: {
        businessId: id,
        name: name || 'Menu',
        cloudinaryUrl: cloudinaryPublicId,
        publicId: menuPublicId,
      },
    });

    const customMenuUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/menu/${menuPublicId}`;

    res.json({
      message: "Menu uploaded successfully",
      menu,
      menuUrl: customMenuUrl
    });
  } catch (error) {
    console.error('Menu upload error:', error);
    res.status(500).json({ error: "Failed to upload menu" });
  }
});

// Delete a menu
router.delete("/:id/menus/:menuId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const businessId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
    
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const menu = await prisma.menu.findFirst({
      where: { id: menuId, businessId },
    });

    if (!menu) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // Delete from database (skip Cloudinary deletion for now)
    await prisma.menu.delete({ where: { id: menuId } });

    res.json({ message: "Menu deleted successfully" });
  } catch (error) {
    console.error('Menu delete error:', error);
    res.status(500).json({ error: "Failed to delete menu" });
  }
});

export default router;