import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, service: "privacy-facts-api", db: "connected" });
  } catch {
    res.status(503).json({ ok: false, service: "privacy-facts-api", db: "error" });
  }
});

export default router;
