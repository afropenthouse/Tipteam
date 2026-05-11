import { Router, Request, Response } from "express";
import { body } from "express-validator";
import prisma from "../lib/prisma.js";
import { sendFeedbackNotificationEmail } from "../lib/email.js";

const router = Router();

router.get("/:businessId", async (req: Request, res: Response) => {
  try {
    console.log("Fetching feedback for businessId:", req.params.businessId);
    const businessId = Array.isArray(req.params.businessId) ? req.params.businessId[0] : req.params.businessId;
    const feedbacks = await prisma.feedback.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
    });
    console.log("Found feedbacks:", feedbacks.length);
    res.json({ feedbacks });
  } catch (error) {
    console.error("Error fetching feedback:", error);
    res.status(500).json({ error: "Failed to get feedback" });
  }
});

router.post(
  "/",
  [
    body("businessId").notEmpty().withMessage("Business ID is required"),
    body("rating").optional().isInt({ min: 1, max: 5 }).withMessage("Rating must be 1-5"),
    body("experience").optional().trim(),
    body("phone").optional().trim(),
    body("tipAmount").optional().isInt({ min: 0 }),
    body("paystackRef").optional(),
  ],
  async (req: any, res: Response) => {
    try {
      let { businessId, rating, experience, phone, tipAmount, paystackRef } = req.body;

      // Treat rating of 0 as no rating (for tip-only flows)
      if (rating === 0) rating = undefined;

      const business = await prisma.business.findUnique({ 
        where: { id: businessId },
        include: { owner: true }
      });
      if (!business) {
        return res.status(404).json({ error: "Business not found" });
      }

      const feedback = await prisma.feedback.create({
        data: {
          businessId,
          rating: rating ?? null,
          experience,
          phone,
          tipAmount: tipAmount || 0,
          paystackRef,
        },
      });

      // Send email notification to business owner
      try {
        await sendFeedbackNotificationEmail(
          business.owner.email,
          business.owner.fullName,
          {
            businessName: business.name,
            rating: rating ?? undefined,
            experience: experience ?? undefined,
            complaint: experience && experience.toLowerCase().includes('complaint') ? experience : undefined,
            customerPhone: phone ?? undefined,
            tipAmount: tipAmount && tipAmount > 0 ? tipAmount : undefined,
          }
        );
        console.log("Feedback notification email sent to:", business.owner.email);
      } catch (emailError) {
        console.error("Failed to send feedback notification email:", emailError);
        // Continue with response even if email fails
      }

      res.status(201).json({ feedback });
    } catch (error) {
      console.error("Feedback error:", error);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  }
);

export default router;