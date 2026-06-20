import { Router, Request, Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/mail-logs
router.get("/logs", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const logs = db.prepare("SELECT * FROM sent_emails ORDER BY id DESC").all();
    res.json(logs);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
