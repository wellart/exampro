import { Router, Request, Response } from "express";
import { getDb } from "../db";

const router = Router();

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
