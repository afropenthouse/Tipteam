import { Router, Response } from "express";
import prisma from "../../lib/prisma.js";
import { adminAuth, AdminRequest } from "../../middleware/admin.js";

const router = Router();

// Get all businesses with owner, feedback count, and wallet summary
router.get("/", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const businesses = await prisma.$queryRaw`
      SELECT 
        b.id, b.name, b.email, b.phone, b.address, b.website, b."googleBusinessUrl", b."allowTipping",
        b."createdAt", b."updatedAt",
        o.id as "ownerId", o."fullName" as "ownerName", o.email as "ownerEmail",
        (SELECT COUNT(*) FROM menus WHERE "businessId" = b.id) as "menuCount",
        (SELECT COUNT(*) FROM feedbacks WHERE "businessId" = b.id) as "feedbackCount",
        COALESCE((SELECT SUM("tipAmount") FROM feedbacks WHERE "businessId" = b.id), 0) as "totalEarned",
        COALESCE((SELECT SUM(amount) FROM withdrawals WHERE "businessId" = b.id AND status = 'COMPLETED'), 0) as "totalWithdrawn"
      FROM businesses b
      LEFT JOIN users o ON b."ownerId" = o.id
      ORDER BY b."createdAt" DESC
    `;

    // Convert BigInt fields to string or number for JSON serialization
    const result = (businesses as any[]).map((b) => {
      const safe = { ...b };
      for (const key in safe) {
        if (typeof safe[key] === 'bigint') {
          // Convert to number if safe, else string
          const asNumber = Number(safe[key]);
          safe[key] = Number.isSafeInteger(asNumber) ? asNumber : safe[key].toString();
        }
      }
      return {
        ...safe,
        availableBalance: Number(safe.totalEarned) - Number(safe.totalWithdrawn),
      };
    });
    res.json({ businesses: result });
  } catch (error) {
    console.error("Get businesses error:", error);
    res.status(500).json({ error: "Failed to get businesses" });
  }
});

// Get single business with full details
router.get("/:id", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Get business with owner
    const businessResult = await prisma.$queryRaw`
      SELECT 
        b.*, 
        o.id as "ownerId", o."fullName" as "ownerName", o.email as "ownerEmail", o.phone as "ownerPhone",
        o."isVerified" as "ownerVerified"
      FROM businesses b
      LEFT JOIN users o ON b."ownerId" = o.id
      WHERE b.id = ${id}
    `;

    const business = Array.isArray(businessResult) && businessResult.length > 0 ? businessResult[0] : null;

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    // Get menus
    const menus = await prisma.menu.findMany({
      where: { businessId: id },
      select: { id: true, name: true, publicId: true, createdAt: true },
    });

    // Get feedbacks
    const feedbacks = await prisma.feedback.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
    });

    // Get withdrawals
    const withdrawals = await prisma.withdrawal.findMany({
      where: { businessId: id },
      orderBy: { createdAt: "desc" },
    });

    const totalEarned = feedbacks.reduce((sum: number, f: any) => sum + (f.tipAmount || 0), 0);
    const totalWithdrawn = withdrawals.filter((w: any) => w.status === "COMPLETED").reduce((sum: number, w: any) => sum + w.amount, 0);

    res.json({
      business,
      menus,
      feedbacks,
      withdrawals,
      wallet: {
        totalEarned,
        totalWithdrawn,
        availableBalance: totalEarned - totalWithdrawn,
      },
    });
  } catch (error) {
    console.error("Get business error:", error);
    res.status(500).json({ error: "Failed to get business" });
  }
});

// Update business
router.put("/:id", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, email, phone, address, googleBusinessUrl, allowTipping } = req.body;

    const business = await prisma.business.findFirst({ where: { id } });
    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (googleBusinessUrl !== undefined) updateData.googleBusinessUrl = googleBusinessUrl || null;
    if (allowTipping !== undefined) updateData.allowTipping = allowTipping;

    const updated = await prisma.business.update({ where: { id }, data: updateData });
    res.json({ business: updated });
  } catch (error) {
    console.error("Update business error:", error);
    res.status(500).json({ error: "Failed to update business" });
  }
});

// Delete business
router.delete("/:id", adminAuth, async (req: AdminRequest, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await prisma.business.delete({ where: { id } });
    res.json({ message: "Business deleted" });
  } catch (error) {
    console.error("Delete business error:", error);
    res.status(500).json({ error: "Failed to delete business" });
  }
});

export default router;