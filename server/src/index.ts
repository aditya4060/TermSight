import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "./env.js";
import { pool } from "./db.js";
import healthRouter from "./routes/health.js";
import analyzeRouter from "./routes/analyze.js";
import adminRouter from "./routes/admin.js";

// Export app separately so Vercel's serverless handler can import it
export const app = express();

app.use(
  cors({
    origin: config.EXTENSION_ORIGIN === "*" ? "*" : config.EXTENSION_ORIGIN,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Rate limiting — prevent abuse of the analysis endpoint
const analyzeLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute window
  max: 20,                    // 20 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment before analyzing more sites." },
  skip: (req) => req.path === "/health", // never limit health checks
});

// Routes
app.use("/", healthRouter);
app.use("/api", analyzeLimiter, analyzeRouter);
app.use("/admin", adminRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

// Only start the HTTP server when running directly (not on Vercel)
if (process.env.VERCEL !== "1") {
  async function start() {
    try {
      await pool.query("SELECT 1");
      console.log("[db] Connected to PostgreSQL");
    } catch (err) {
      console.error("[db] Could not connect to PostgreSQL:", (err as Error).message);
      console.error("Make sure DATABASE_URL is set and the database is running.");
      process.exit(1);
    }

    app.listen(config.PORT, () => {
      console.log(`[server] Privacy Facts API running on http://localhost:${config.PORT}`);
      console.log(`[server] Mock mode: ${config.MOCK_MODE || !config.FIRECRAWL_API_KEY ? "ON" : "OFF"}`);
    });
  }
  start();
}
