import { Router, Request, Response } from "express";
import { getDb } from "../db";

const router = Router();

// POST /api/auth/login
router.post("/login", (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as Record<string, unknown> | undefined;

    if (!user) {
      return res.status(401).json({ error: "Kredensial salah. Pastikan kembali username / password Anda." });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        guardianEmail: (user.guardianEmail as string) || "",
        role: user.role,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/auth/register
router.post("/register", (req: Request, res: Response) => {
  try {
    const { username, password, fullName, email, guardianEmail } = req.body;
    if (!username || !password || !fullName || !email) {
      return res.status(400).json({ error: "Semua kolom input wajib diisi." });
    }

    const db = getDb();
    const exist = db.prepare("SELECT count(*) as count FROM users WHERE username = ? OR email = ?").get(username, email) as { count: number };
    if (exist.count > 0) {
      return res.status(400).json({ error: "Username atau Email sudah terdaftar oleh pengguna lain." });
    }

    db.prepare(
      "INSERT INTO users (username, password, role, fullName, email, guardianEmail) VALUES (?, ?, 'siswa', ?, ?, ?)"
    ).run(username, password, fullName, email, guardianEmail || "");

    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", (req: Request, res: Response) => {
  try {
    const { username, email, newPassword } = req.body;
    if (!username || !email || !newPassword) {
      return res.status(400).json({ error: "Kolom kosong tidak diperbolehkan." });
    }

    const db = getDb();
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND email = ?").get(username, email) as Record<string, unknown> | undefined;
    if (!user) {
      return res.status(404).json({ error: "Informasi Username dan Email yang diberikan tidak valid atau tidak ditemukan." });
    }

    db.prepare("UPDATE users SET password = ? WHERE id = ?").run(newPassword, user.id as number);
    res.json({ message: "Kata sandi Anda telah diperbarui. Silakan masuk menggunakan kata sandi baru." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
