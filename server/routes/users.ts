import { Router, Request, Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/users — list all users
router.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const users = db.prepare("SELECT id, username, role, fullName, email, guardianEmail FROM users ORDER BY id ASC").all();
    res.json(users);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PUT /api/users/:id — edit user (identity + optional password reset)
router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, password, fullName, email, guardianEmail, role } = req.body;

    const db = getDb();
    const existing = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    if (!existing) {
      return res.status(404).json({ error: "Pengguna tidak ditemukan." });
    }

    // Check uniqueness for username/email
    if (username) {
      const dupUser = db.prepare("SELECT id FROM users WHERE username = ? AND id != ?").get(username, id) as Record<string, unknown> | undefined;
      if (dupUser) return res.status(400).json({ error: "Username sudah dipakai pengguna lain." });
    }
    if (email) {
      const dupEmail = db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, id) as Record<string, unknown> | undefined;
      if (dupEmail) return res.status(400).json({ error: "Email sudah dipakai pengguna lain." });
    }

    if (password) {
      db.prepare(
        "UPDATE users SET username = COALESCE(?, username), password = ?, fullName = COALESCE(?, fullName), email = COALESCE(?, email), guardianEmail = COALESCE(?, guardianEmail), role = COALESCE(?, role) WHERE id = ?"
      ).run(username || null, password, fullName || null, email || null, guardianEmail ?? null, role || null, id);
    } else {
      db.prepare(
        "UPDATE users SET username = COALESCE(?, username), fullName = COALESCE(?, fullName), email = COALESCE(?, email), guardianEmail = COALESCE(?, guardianEmail), role = COALESCE(?, role) WHERE id = ?"
      ).run(username || null, fullName || null, email || null, guardianEmail ?? null, role || null, id);
    }

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/users/bulk
router.post("/bulk", (req: Request, res: Response) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "Data pengguna tidak valid atau kosong." });
    }

    const db = getDb();
    const insertUser = db.prepare(
      "INSERT INTO users (username, password, role, fullName, email, guardianEmail) VALUES (?, ?, ?, ?, ?, ?)"
    );

    let importedCount = 0;
    const errors: string[] = [];

    users.forEach((u: Record<string, unknown>, idx: number) => {
      try {
        if (!u.username || !u.password || !u.fullName || !u.email) {
          throw new Error(`Data tidak lengkap pada baris ke-${idx + 1}`);
        }
        insertUser.run(
          String(u.username).trim(),
          u.password as string,
          (u.role as string) || "siswa",
          u.fullName as string,
          String(u.email).trim(),
          (u.guardianEmail as string) || ""
        );
        importedCount++;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        errors.push(`Baris ke-${idx + 1} (${u.username || "unknown"}): ${msg}`);
      }
    });

    res.json({
      success: true,
      message: `${importedCount} akun pengguna berhasil diimpor.`,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
