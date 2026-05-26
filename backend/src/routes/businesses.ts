import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import multer from "multer";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

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
    body("website").optional({ checkFalsy: true }).isURL().withMessage("Must be a valid URL"),
    body("googleBusinessUrl").optional({ checkFalsy: true }).isURL().withMessage("Must be a valid URL"),
    body("allowTipping").optional().isBoolean().withMessage("Allow tipping must be a boolean"),
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

      const { name, email, phone, address, website, googleBusinessUrl, allowTipping } = req.body;

      // Use raw query to handle allowTipping field until Prisma client is properly updated
      const businessResult = await prisma.$queryRaw`
        INSERT INTO businesses (id, "ownerId", name, email, phone, address, website, "googleBusinessUrl", "allowTipping", "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${req.userId}, ${name}, ${email}, ${phone}, ${address}, ${website || null}, ${googleBusinessUrl || null}, ${allowTipping || false}, NOW(), NOW())
        RETURNING *
      `;
      const business = Array.isArray(businessResult) ? businessResult[0] : businessResult;

      res.status(201).json({ business });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to create business",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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
    body("website").optional({ checkFalsy: true }).isURL().withMessage("Must be a valid URL"),
    body("googleBusinessUrl").optional().custom((value: string) => {
      if (value === "" || value === null || value === undefined) return true;
      return /\S+/.test(value) && (value.startsWith("http://") || value.startsWith("https://"));
    }).withMessage("Must be a valid URL"),
    body("allowTipping").optional().isBoolean().withMessage("Allow tipping must be a boolean"),
  ],
  async (req: AuthRequest, res: Response) => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, phone, address, website, googleBusinessUrl, allowTipping } = req.body;

      // Check ownership first
      const existing = await prisma.business.findFirst({
        where: { id, ownerId: req.userId },
      });
      
      if (!existing) {
        return res.status(404).json({ error: "Business not found" });
      }

      // Build update data - only include fields that are defined
      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (website !== undefined) updateData.website = website || null;
      if (googleBusinessUrl !== undefined) updateData.googleBusinessUrl = googleBusinessUrl || null;
      if (allowTipping !== undefined) updateData.allowTipping = allowTipping;

      const business = await prisma.business.update({
        where: { id },
        data: updateData,
      });

      res.json({ business });
    } catch (error) {
      res.status(500).json({ 
        error: "Failed to update business",
        details: error instanceof Error ? error.message : "Unknown error"
      });
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

    // Use raw query to handle allowTipping field until Prisma client is properly updated
    const businessResult = await prisma.$queryRaw`
      SELECT 
        b.id, b.name, b.email, b.phone, b.address, b.website, b."googleBusinessUrl", b."allowTipping", b."createdAt",
        COALESCE(
          json_agg(
            json_build_object(
              'id', m.id,
              'name', m.name,
              'publicId', m."publicId",
              'createdAt', m."createdAt"
            )
            ORDER BY m."createdAt" DESC
          ) FILTER (WHERE m.id IS NOT NULL),
          '[]'::json
        ) as menus
      FROM businesses b
      LEFT JOIN LATERAL (
        SELECT id, name, "publicId", "createdAt"
        FROM menus 
        WHERE "businessId" = b.id 
        ORDER BY "createdAt" DESC
      ) m ON true
      WHERE b.id = ${id}
      GROUP BY b.id, b.name, b.email, b.phone, b.address, b.website, b."googleBusinessUrl", b."allowTipping", b."createdAt"
    `;
    const business = Array.isArray(businessResult) && businessResult.length > 0 ? businessResult[0] : null;

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    res.json({ business });
  } catch (error) {
    res.status(500).json({ error: "Failed to get business" });
  }
});

// Serve PDF file directly from database
router.get("/menu/:publicId/pdf", async (req: AuthRequest, res: Response) => {
  try {
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;

    const menu = await prisma.menu.findFirst({
      where: { publicId },
      select: {
        id: true,
        name: true,
        pdf: true,
      }
    });

    if (!menu || !menu.pdf) {
      return res.status(404).json({ error: "Menu not found or PDF missing" });
    }

    // Send PDF buffer directly with proper headers for inline display
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${menu.name}.pdf"`);
    res.setHeader('Content-Length', menu.pdf.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.send(Buffer.from(menu.pdf));
  } catch (error) {
    res.status(500).json({ error: "Failed to serve PDF" });
  }
});

// Get menu by publicId (public - no auth required for QR code access)
router.get("/menu/:publicId", async (req: AuthRequest, res: Response) => {
  try {
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;

    // Use raw query to handle allowTipping field until Prisma client is properly updated
    const menuResult = await prisma.$queryRaw`
      SELECT 
        m.id, m.name, m."businessId", m."createdAt", m."publicId",
        json_build_object(
          'name', b.name,
          'email', b.email,
          'phone', b.phone,
          'address', b.address,
          'website', b.website,
          'googleBusinessUrl', b."googleBusinessUrl",
          'allowTipping', b."allowTipping"
        ) as business
      FROM menus m
      JOIN businesses b ON m."businessId" = b.id
      WHERE m."publicId" = ${publicId}
      LIMIT 1
    `;
    const menu = Array.isArray(menuResult) && menuResult.length > 0 ? menuResult[0] : null;

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

    // Return menus without the pdf binary data
    const menusWithoutPdf = business.menus.map(({ pdf, ...rest }) => rest);
    res.json({ menus: menusWithoutPdf });
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

    // Generate a unique publicId for the menu
    const generatePublicId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 16; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const menuPublicId = generatePublicId();

    // Store PDF directly in database as binary
    const menu = await prisma.menu.create({
      data: {
        businessId: id,
        name: name || 'Menu',
        publicId: menuPublicId,
        pdf: Buffer.from(req.file.buffer),
      },
    });

    const customMenuUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/menu/${menuPublicId}`;

    res.json({
      message: "Menu uploaded successfully",
      menu: {
        id: menu.id,
        name: menu.name,
        publicId: menu.publicId,
        createdAt: menu.createdAt,
      },
      menuUrl: customMenuUrl
    });
  } catch (error) {
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

    await prisma.menu.delete({ where: { id: menuId } });

    res.json({ message: "Menu deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete menu" });
  }
});

// Update a menu (name and/or PDF)
router.patch("/:id/menus/:menuId", authenticate, upload.single('menu'), async (req: AuthRequest, res: Response) => {
  try {
    const businessId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const menuId = Array.isArray(req.params.menuId) ? req.params.menuId[0] : req.params.menuId;
    const { name } = req.body;

    // Verify business ownership
    const business = await prisma.business.findFirst({
      where: { id: businessId, ownerId: req.userId },
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Find the menu
    const menu = await prisma.menu.findFirst({
      where: { id: menuId, businessId },
    });

    if (!menu) {
      return res.status(404).json({ error: "Menu not found" });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) {
      updateData.name = name || 'Menu';
    }
    if (req.file) {
      updateData.pdf = Buffer.from(req.file.buffer);
    }

    // Ensure something is being updated
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "No updates provided" });
    }

    const updatedMenu = await prisma.menu.update({
      where: { id: menuId },
      data: updateData,
    });

    // Return without pdf
    const { pdf, ...rest } = updatedMenu;
    res.json({ menu: rest });
  } catch (error) {
    console.error("Menu update error:", error);
    res.status(500).json({ error: "Failed to update menu" });
  }
});

export default router;