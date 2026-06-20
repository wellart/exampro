import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { encryptText } from "../helpers";
import { refreshExamStats } from "../helpers";

const router = Router();

// GET /api/exams
router.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const list = db.prepare("SELECT * FROM exams ORDER BY id ASC").all();
    res.json(list);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// DELETE /api/exams/:id
router.delete("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const exam = db.prepare("SELECT id FROM exams WHERE id = ?").get(id);
    if (!exam) {
      return res.status(404).json({ error: "Ujian tidak ditemukan." });
    }
    db.prepare("DELETE FROM exams WHERE id = ?").run(id);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/exams/:id/questions (admin - includes answers)
router.get("/:id/questions", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    const questions = db.prepare("SELECT * FROM questions WHERE examId = ? ORDER BY orderNo ASC").all(id);
    res.json({ exam, questions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/exams/:id/start (student view - no correct answers, encrypted)
router.get("/:id/start", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!exam) {
      return res.status(404).json({ error: "Ujian tidak ditemukan." });
    }

    const questions = db.prepare(
      "SELECT id, examId, questionText, optionA, optionB, optionC, optionD, optionE, scorePoints, orderNo FROM questions WHERE examId = ? ORDER BY orderNo ASC"
    ).all(id) as Array<Record<string, unknown>>;

    const secureQuestions = questions.map((q) => ({
      id: q.id,
      examId: q.examId,
      questionText: encryptText(q.questionText as string),
      optionA: encryptText(q.optionA as string),
      optionB: encryptText(q.optionB as string),
      optionC: encryptText(q.optionC as string),
      optionD: encryptText(q.optionD as string),
      optionE: encryptText(q.optionE as string),
      scorePoints: q.scorePoints,
      orderNo: q.orderNo,
    }));

    res.json({ exam, questions: secureQuestions, encryptionSecret: "REVERSED_BASE64" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/exams/:id/questions/bulk
router.post("/:id/questions/bulk", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Kumpulan list soal kosong." });
    }

    const db = getDb();
    const exam = db.prepare("SELECT id FROM exams WHERE id = ?").get(id);
    if (!exam) {
      return res.status(404).json({ error: "Exam tidak ditemukan." });
    }

    const maxOrder = db.prepare("SELECT MAX(orderNo) as maxO FROM questions WHERE examId = ?").get(id) as { maxO: number | null };
    let startOrder = (maxOrder.maxO || 0) + 1;

    const stmtQ = db.prepare(
      "INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    const transaction = db.transaction((qs: Array<Record<string, unknown>>) => {
      qs.forEach((q) => {
        stmtQ.run(
          id,
          (q.category as string) || "Umum",
          (q.questionText as string) || "Pertanyaan Baru",
          (q.optionA as string) || "Pilihan A",
          (q.optionB as string) || "Pilihan B",
          (q.optionC as string) || "Pilihan C",
          (q.optionD as string) || "Pilihan D",
          (q.optionE as string) || "Pilihan E",
          String(q.correctOption || "A").trim().toUpperCase(),
          Number(q.scorePoints) || 4,
          startOrder++
        );
      });
    });

    transaction(questions);
    refreshExamStats(Number(id));

    res.json({ success: true, count: questions.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/exams/import
router.post("/import", (req: Request, res: Response) => {
  try {
    const { title, description, duration, passingGrade, questions, startDate, endDate } = req.body;
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Judul ujian dan susunan list soal wajib diunggah." });
    }

    const db = getDb();
    const calculatedMaxScore = questions.reduce((acc: number, q: Record<string, unknown>) => acc + (Number(q.scorePoints) || 4), 0);
    const now = new Date().toISOString();

    const result = db.prepare(
      "INSERT INTO exams (title, description, duration, questionsCount, passingGrade, maxScore, startDate, endDate, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(title, description || `Hasil impor massal - ${questions.length} butir soal`, Number(duration) || 60, questions.length, Number(passingGrade) || 60, calculatedMaxScore, startDate || null, endDate || null, now);

    const newExamId = result.lastInsertRowid;

    const stmtQ = db.prepare(
      "INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    questions.forEach((q: Record<string, unknown>, idx: number) => {
      stmtQ.run(
        newExamId,
        (q.category as string) || "Umum",
        (q.questionText as string) || `Contoh Soal Pilihan Ganda ke-${idx + 1}`,
        (q.optionA as string) || "Pilihan A",
        (q.optionB as string) || "Pilihan B",
        (q.optionC as string) || "Pilihan C",
        (q.optionD as string) || "Pilihan D",
        (q.optionE as string) || "Pilihan E",
        String(q.correctOption || "A").trim().toUpperCase(),
        Number(q.scorePoints) || 4,
        idx + 1
      );
    });

    res.json({ success: true, examId: newExamId, title, questionsCount: questions.length, maxScore: calculatedMaxScore });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/exams/:id/export
router.get("/:id/export", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const submissions = db.prepare("SELECT * FROM submissions WHERE examId = ? AND status = 'completed' ORDER BY id DESC").all(id) as Array<Record<string, unknown>>;

    let csvContent = "﻿ID Submisi,Nama Siswa,Email Siswa,Email Wali,Skor Perolehan,Skor Maksimum,Persentase,Status Kelulusan,Tanggal Ujian,Kanal Sinkronisasi\n";

    submissions.forEach((sub) => {
      const score = Number(sub.score);
      const maxScore = Number(sub.maxScore);
      const pct = Math.round((score / maxScore) * 100);
      const cleanName = String(sub.studentName).replace(/"/g, '""');
      csvContent += `"${sub.id}","${cleanName}","${sub.studentEmail}","${sub.guardianEmail}",${score},${maxScore},"${pct}%","${sub.isPassed === 1 ? "LULUS" : "TIDAK LULUS"}","${sub.submittedAt}","${sub.offlineSync === 1 ? "Offline Sync" : "Online"}"\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="Export-Nilai-${String(exam.title).replace(/\s+/g, "-")}.csv"`);
    res.send(csvContent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
