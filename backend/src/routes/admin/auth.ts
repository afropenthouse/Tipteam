import { Router, Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { generateAdminToken } from "../../lib/jwt.js";

const router = Router();

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail().withMessage("Valid email is required"), body("password").notEmpty().withMessage("Password is required")],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (!adminEmail || !adminPassword) {
        return res.status(500).json({ error: "Admin credentials not configured" });
      }

      if (email !== adminEmail || password !== adminPassword) {
        return res.status(401).json({ error: "Invalid admin credentials" });
      }

      const token = generateAdminToken();

      res.json({
        token,
        user: {
          id: "admin",
          fullName: "Admin",
          email: adminEmail,
          isAdmin: true,
        },
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({ error: "Failed to sign in" });
    }
  }
);

export default router;