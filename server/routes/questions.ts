import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { refreshExamStats } from "../helpers";

const router = Router();

// POST /api/questions
router.post("/", (req: Request, res: Response) => {
  try {
    const { examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints } = req.body;
    if (!examId || !questionText) {
      return res.status(400).json({ error: "examId dan teks pertanyaan wajib diisi." });
    }

    const db = getDb();
    const maxOrder = db.prepare("SELECT MAX(orderNo) as maxO FROM questions WHERE examId = ?").get(examId) as { maxO: number | null };
    const nextOrder = (maxOrder.maxO || 0) + 1;

    db.prepare(
      "INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(examId, category || "Umum", questionText, optionA || "Pilihan A", optionB || "Pilihan B", optionC || "Pilihan C", optionD || "Pilihan D", optionE || "Pilihan E", String(correctOption || "A").trim().toUpperCase(), Number(scorePoints) || 4, nextOrder);

    refreshExamStats(examId);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PUT /api/questions/:id
router.put("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints } = req.body;

    const db = getDb();
    const q = db.prepare("SELECT examId FROM questions WHERE id = ?").get(id) as { examId: number } | undefined;
    if (!q) {
      return res.status(404).json({ error: "Soal tidak ditemukan." });
    }

    db.prepare(
      "UPDATE questions SET category = ?, questionText = ?, optionA = ?, optionB = ?, optionC = ?, optionD = ?, optionE = ?, correctOption = ?, scorePoints = ? WHERE id = ?"
    ).run(category || "Umum", questionText, optionA, optionB, optionC, optionD, optionE, String(correctOption).trim().toUpperCase(), Number(scorePoints) || 4, id);

    refreshExamStats(q.examId);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// DELETE /api/questions/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const q = db.prepare("SELECT examId FROM questions WHERE id = ?").get(id) as { examId: number } | undefined;
    if (!q) {
      return res.status(404).json({ error: "Soal tidak ditemukan." });
    }

    db.prepare("DELETE FROM questions WHERE id = ?").run(id);
    refreshExamStats(q.examId);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
