import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import businessRoutes from "./routes/businesses.js";
import feedbackRoutes from "./routes/feedback.js";
import withdrawalRoutes from "./routes/withdrawals.js";
import paystackRoutes from "./routes/paystack.js";

dotenv.config();

const app = express();

const allowedOrigins = new Set(
  [process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"].filter(
    (origin): origin is string => Boolean(origin)
  )
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      if (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/businesses", businessRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/withdrawals", withdrawalRoutes);
app.use("/api/paystack", paystackRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
