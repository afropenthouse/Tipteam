import { Router, Response } from "express";
import { Readable } from "stream";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.js";
import cloudinary from "../lib/cloudinary.js";
import fetch from "node-fetch";

const router = Router();

// Get menu by publicId (public - no auth required for QR code access)
router.get("/:publicId", async (req: AuthRequest, res: Response) => {
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

// Serve PDF proxy - streams PDF from Cloudinary through backend
router.get("/:publicId/pdf", async (req: AuthRequest, res: Response) => {
  try {
    const publicId = Array.isArray(req.params.publicId) ? req.params.publicId[0] : req.params.publicId;

    console.log('PDF proxy request for publicId:', publicId);

    const menu = await prisma.menu.findFirst({
      where: { publicId },
    });

    if (!menu || !menu.cloudinaryUrl) {
      console.log('Menu not found, cloudinaryUrl:', menu?.cloudinaryUrl);
      return res.status(404).json({ error: "Menu not found" });
    }

    console.log('Stored cloudinaryUrl:', menu.cloudinaryUrl);

    // Extract Cloudinary public_id from stored value
    let cloudinaryPublicId = menu.cloudinaryUrl;
    if (cloudinaryPublicId.startsWith('http')) {
      const url = new URL(cloudinaryPublicId);
      const parts = url.pathname.split('/');
      // parts: ['', 'raw', 'upload', 'vVERSION', 'folder', 'filename.pdf']
      const publicIdWithExt = parts.slice(4).join('/');
      cloudinaryPublicId = publicIdWithExt.replace(/\.pdf$/, '');
    } else {
      // Remove .pdf extension if present, since format=pdf will add it
      cloudinaryPublicId = cloudinaryPublicId.replace(/\.pdf$/, '');
    }

    console.log('Extracted Cloudinary public_id:', cloudinaryPublicId);

    // Generate a signed URL using Cloudinary SDK (valid for 1 hour)
    const signedUrl = cloudinary.url(cloudinaryPublicId, {
      resource_type: 'raw',
      format: 'pdf',
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    });

    console.log('Generated signed URL:', signedUrl);

    // Fetch PDF from Cloudinary using signed URL
    const pdfResponse = await fetch(signedUrl);

    console.log('Cloudinary fetch status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      console.error('Failed to fetch PDF from Cloudinary:', pdfResponse.status, pdfResponse.statusText);
      return res.status(502).json({ error: "Failed to fetch PDF from storage" });
    }

    // Set headers for PDF display
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${menu.name}.pdf"`);

    // Stream PDF directly to client
    if (pdfResponse.body) {
      Readable.fromWeb(pdfResponse.body as any).pipe(res);
    } else {
      throw new Error("No PDF body received");
    }
  } catch (error) {
    console.error('PDF proxy error:', error);
    res.status(500).json({ error: "Failed to serve PDF" });
  }
});

export default router;
