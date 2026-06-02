import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import prisma from "../lib/prisma.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";

const router = Router();

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || "Tracla";
const TERMII_BASE_URL = process.env.TERMII_BASE_URL || "https://v3.api.termii.com";
const MESSAGE_CHARGE = 10; // 10 Naira per message

async function psRequest(method: string, path: string, body?: Record<string, unknown>) {
  const baseUrl = "https://api.paystack.co";
  const sec = process.env.PAYSTACK_SECRET_KEY;
  if (!sec) throw new Error("PAYSTACK_SECRET_KEY missing");

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${sec}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    const err = new Error(json?.message || `Paystack API ${method} ${path} failed`);
    // @ts-ignore
    err.data = json;
    throw err;
  }
  return json;
}

// Get message balance for the user
router.get("/balance", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await (prisma.user as any).findUnique({
      where: { id: req.userId as string },
      select: { messageBalance: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ balance: (user as any).messageBalance });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Initialize top-up
router.post(
  "/initialize-topup",
  authenticate,
  [
    body("amount").isInt({ min: 100 }).withMessage("Minimum top-up is 100 Naira"),
    body("email").isEmail().withMessage("Valid email is required"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg });
      }

      const { amount, email } = req.body;

      const frontendUrl = req.get("origin") || process.env.FRONTEND_URL || "http://localhost:5173";
      const callbackUrl = `${frontendUrl.replace(/\/$/, "")}/dashboard/message`;

      const transaction = await psRequest("POST", "/transaction/initialize", {
        email,
        amount: amount * 100,
        currency: "NGN",
        callback_url: callbackUrl,
        metadata: {
          userId: req.userId,
          type: "message_topup",
          payerEmail: email
        }
      });

      res.json({
        authorizationUrl: transaction.data.authorization_url,
        reference: transaction.data.reference
      });
    } catch (error: any) {
      console.error("Topup init error:", error);
      res.status(500).json({ error: error.message || "Failed to initialize top-up" });
    }
  }
);

// Verify top-up
router.post(
  "/verify-topup",
  authenticate,
  [body("reference").notEmpty().withMessage("Reference is required")],
  async (req: AuthRequest, res: Response) => {
    try {
      const { reference } = req.body;
      const transaction = await psRequest("GET", `/transaction/verify/${reference}`);

      if (!transaction.status || transaction.data.status !== "success") {
        return res.status(400).json({ error: "Payment not successful" });
      }

      const { userId, type } = transaction.data.metadata;
      if (type !== "message_topup") {
        return res.status(400).json({ error: "Invalid payment type" });
      }

      const amount = Math.round(transaction.data.amount / 100);
      const smsCredits = Math.floor(amount / MESSAGE_CHARGE);

      const user = await (prisma.user as any).update({
        where: { id: userId as string },
        data: {
          messageBalance: { increment: smsCredits }
        }
      });

      res.json({ success: true, newBalance: (user as any).messageBalance });
    } catch (error: any) {
      console.error("Topup verify error:", error);
      res.status(500).json({ error: error.message || "Failed to verify top-up" });
    }
  }
);

// Send bulk messages
router.post(
  "/send-bulk",
  authenticate,
  [
    body("businessId").notEmpty().withMessage("Business ID is required"),
    body("message").notEmpty().withMessage("Message content is required"),
    body("recipients").isArray().withMessage("Recipients must be an array of phone numbers"),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0]?.msg });
      }

      const { message, recipients } = req.body;
      const numRecipients = recipients.length;
      const totalCharge = numRecipients; // Charge is 1 credit per recipient

      const user = await (prisma.user as any).findUnique({
        where: { id: req.userId as string },
        select: { messageBalance: true }
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if ((user as any).messageBalance < totalCharge) {
        return res.status(400).json({ 
          error: `Insufficient SMS credits. Required: ${totalCharge}, Current: ${(user as any).messageBalance}` 
        });
      }

      // Termii API Call
      const termiiPayload = {
        api_key: TERMII_API_KEY,
        to: recipients.join(","),
        from: TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic"
      };

      const termiiRes = await fetch(`${TERMII_BASE_URL}/api/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(termiiPayload)
      });

      const termiiData = await termiiRes.json();

      if (!termiiRes.ok) {
        console.error("Termii error:", termiiData);
        return res.status(400).json({ error: "Failed to send messages via Termii", details: termiiData });
      }

      // Deduct balance from user
      await (prisma.user as any).update({
        where: { id: req.userId as string },
        data: {
          messageBalance: { decrement: totalCharge }
        }
      });

      res.json({ 
        success: true, 
        message: `Successfully sent ${numRecipients} messages`,
        termiiResponse: termiiData
      });

    } catch (error: any) {
      console.error("Send bulk error:", error);
      res.status(500).json({ error: error.message || "Failed to send messages" });
    }
  }
);

// Get all customer phone numbers for a business
router.get("/customers/:businessId", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { businessId } = req.params;
    const business = await prisma.business.findFirst({
      where: { id: businessId as string, ownerId: req.userId as string }
    });

    if (!business) {
      return res.status(404).json({ error: "Business not found" });
    }

    const customers = await prisma.customer.findMany({
      where: { businessId: businessId as string },
      select: { phone: true, name: true }
    });

    res.json({ customers });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

export default router;
