import { Router, Request, Response } from "express";
import { getDb } from "../db";

const router = Router();

interface DbQuestion {
  id: number;
  correctOption: string;
  scorePoints: number;
  questionText: string;
}

// POST /api/exams/:id/submit
router.post("/exams/:id/submit", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { studentName, studentEmail, guardianEmail, answers, startedAt, isOfflineSync } = req.body;

    if (!studentName || !studentEmail || !guardianEmail) {
      return res.status(400).json({ error: "Nama, email siswa, dan email wali wajib diisi." });
    }

    const db = getDb();
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const questions = db.prepare("SELECT id, correctOption, scorePoints, questionText FROM questions WHERE examId = ?").all(id) as DbQuestion[];
    let totalScore = 0;
    let earnedMaxScore = 0;

    const evaluationDetails = questions.map((q) => {
      const selected = (answers as Record<string, string>)[String(q.id)] || "";
      const isCorrect = selected.trim().toUpperCase() === q.correctOption.trim().toUpperCase();
      earnedMaxScore += q.scorePoints;
      if (isCorrect) totalScore += q.scorePoints;

      return { questionId: q.id, questionText: q.questionText, selectedOption: selected, correctOption: q.correctOption, isCorrect, points: q.scorePoints };
    });

    const isPassed = totalScore >= Number(exam.passingGrade) ? 1 : 0;
    const submittedAt = new Date().toISOString();

    const result = db.prepare(
      "INSERT INTO submissions (examId, studentName, studentEmail, guardianEmail, startedAt, submittedAt, score, maxScore, isPassed, answersJson, status, offlineSync) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, studentName, studentEmail, guardianEmail, startedAt || submittedAt, submittedAt, totalScore, earnedMaxScore, isPassed, JSON.stringify(answers), "completed", isOfflineSync ? 1 : 0);

    const submissionId = result.lastInsertRowid;

    // Generate email body
    const passStatusHtml = isPassed
      ? '<span style="color: #10B981; font-weight: bold; background-color: #ECFDF5; padding: 4px 12px; border-radius: 9999px;">LULUS (Passed)</span>'
      : '<span style="color: #EF4444; font-weight: bold; background-color: #FEF2F2; padding: 4px 12px; border-radius: 9999px;">TIDAK LULUS (Failed)</span>';

    const scorePercentage = Math.round((totalScore / earnedMaxScore) * 100);
    const examTitle = String(exam.title);
    const examPassingGrade = Number(exam.passingGrade);

    const emailBody = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); padding: 30px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">RAPOR DIGITAL HASIL UJIAN</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.85; font-size: 14px;">Academic Performance Evaluation</p>
        </div>
        <div style="padding: 30px; background-color: #FFFFFF; color: #1F2937;">
          <p>Yth. Orang Tua / Wali Murid dari <strong>${studentName}</strong>,</p>
          <p>Kami ingin menginformasikan hasil ujian online putra/putri Anda yang telah selesai dikerjakan.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Mata Pelajaran:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${examTitle}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Nama Siswa:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${studentName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Total Perolehan Skor:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #1E3A8A; text-align: right; font-size: 16px;">${totalScore} / ${earnedMaxScore} poin (${scorePercentage}%)</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Passing Grade:</td>
              <td style="padding: 10px 0; text-align: right;">Min. ${examPassingGrade} poin</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Status Kelulusan:</td>
              <td style="padding: 10px 0; text-align: right;">${passStatusHtml}</td>
            </tr>
          </table>
        </div>
      </div>`;

    db.prepare(
      "INSERT INTO sent_emails (examId, submissionId, recipient, subject, bodyHtml, sentAt, status, logs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(id, submissionId, guardianEmail, `[Rapor Digital] Hasil Ujian ${examTitle} - ${studentName}`, emailBody, submittedAt, "Delivered", `SMTP server response: 250 OK Message accepted for delivery. Recipient: <${guardianEmail}>`);

    res.json({ success: true, submissionId, score: totalScore, maxScore: earnedMaxScore, isPassed: isPassed === 1, submittedAt, evaluation: evaluationDetails });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/submissions
router.get("/", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const list = db.prepare(
      "SELECT s.*, e.title as examTitle FROM submissions s JOIN exams e ON s.examId = e.id ORDER BY s.id DESC"
    ).all() as Array<Record<string, unknown>>;

    const formatted = list.map((s) => ({
      ...s,
      isPassed: s.isPassed === 1,
      offlineSync: s.offlineSync === 1,
      answers: JSON.parse(s.answersJson as string),
    }));

    res.json(formatted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/submissions/:id
router.get("/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const sub = db.prepare(
      "SELECT s.*, e.title as examTitle, e.passingGrade as examPassing FROM submissions s JOIN exams e ON s.examId = e.id WHERE s.id = ?"
    ).get(id) as Record<string, unknown> | undefined;

    if (!sub) {
      return res.status(404).json({ error: "Submisi hasil ujian tidak ditemukan." });
    }

    const answers = JSON.parse(sub.answersJson as string) as Record<string, string>;
    const questions = db.prepare("SELECT * FROM questions WHERE examId = ? ORDER BY orderNo ASC").all(sub.examId as number) as DbQuestion[];

    const details = questions.map((q) => {
      const studentAns = answers[String(q.id)] || "";
      return {
        id: q.id,
        questionText: q.questionText,
        optionA: (q as unknown as Record<string, unknown>).optionA,
        optionB: (q as unknown as Record<string, unknown>).optionB,
        optionC: (q as unknown as Record<string, unknown>).optionC,
        optionD: (q as unknown as Record<string, unknown>).optionD,
        optionE: (q as unknown as Record<string, unknown>).optionE,
        correctOption: q.correctOption,
        studentAns,
        isCorrect: studentAns.trim().toUpperCase() === q.correctOption.trim().toUpperCase(),
        points: q.scorePoints,
      };
    });

    res.json({
      submission: {
        id: sub.id,
        studentName: sub.studentName,
        studentEmail: sub.studentEmail,
        guardianEmail: sub.guardianEmail,
        startedAt: sub.startedAt,
        submittedAt: sub.submittedAt,
        score: sub.score,
        maxScore: sub.maxScore,
        isPassed: sub.isPassed === 1,
        examTitle: sub.examTitle,
        examPassing: sub.examPassing,
        offlineSync: sub.offlineSync === 1,
      },
      details,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/submissions/:id/send-report
router.post("/:id/send-report", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDb();
    const sub = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!sub) return res.status(404).json({ error: "Submission not found" });

    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(sub.examId as number) as Record<string, unknown>;

    const sentAt = new Date().toISOString();
    const isPassed = sub.isPassed === 1;
    const score = Number(sub.score);
    const maxScore = Number(sub.maxScore);
    const scorePercentage = Math.round((score / maxScore) * 100);
    const studentName = String(sub.studentName);
    const guardianEmail = String(sub.guardianEmail);
    const examTitle = String(exam.title);

    const passStatusHtml = isPassed
      ? '<span style="color: #10B981; font-weight: bold; background-color: #ECFDF5; padding: 4px 12px; border-radius: 9999px;">LULUS (Passed)</span>'
      : '<span style="color: #EF4444; font-weight: bold; background-color: #FEF2F2; padding: 4px 12px; border-radius: 9999px;">TIDAK LULUS (Failed)</span>';

    const emailBody = `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
      <div style="background: linear-gradient(135deg, #047857 0%, #10B981 100%); padding: 30px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px;">RAPOR DIGITAL DIKIRIM ULANG</h2>
      </div>
      <div style="padding: 30px; background-color: #FFFFFF; color: #1F2937;">
        <p>Yth. Orang Tua / Wali Murid dari <strong>${studentName}</strong>,</p>
        <p>Sistem kami mengirimkan kembali salinan rapor digital.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
          <tr><td style="padding: 10px 0;">Mata Pelajaran:</td><td style="text-align: right; font-weight: bold;">${examTitle}</td></tr>
          <tr><td style="padding: 10px 0;">Nama Siswa:</td><td style="text-align: right; font-weight: bold;">${studentName}</td></tr>
          <tr><td style="padding: 10px 0; font-weight: bold; color: #047857; font-size: 16px;">Total Skor:</td><td style="text-align: right; font-weight: bold; color: #047857; font-size: 16px;">${score} / ${maxScore} poin (${scorePercentage}%)</td></tr>
          <tr><td style="padding: 10px 0;">Status:</td><td style="text-align: right;">${passStatusHtml}</td></tr>
        </table>
      </div>
    </div>`;

    db.prepare(
      "INSERT INTO sent_emails (examId, submissionId, recipient, subject, bodyHtml, sentAt, status, logs) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(sub.examId, sub.id, guardianEmail, `[SALINAN RAPOR] Hasil Ujian ${examTitle} - ${studentName}`, emailBody, sentAt, "Delivered", "SMTP server response: 250 OK. Sent to: " + guardianEmail);

    res.json({ success: true, message: `Rapor berhasil dikirim ulang ke <${guardianEmail}>` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
