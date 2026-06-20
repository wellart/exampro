import { Router, Request, Response } from "express";
import { getDb } from "../db";

const router = Router();

// GET /api/dashboard/stats
router.get("/stats", (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const exams = db.prepare("SELECT * FROM exams").all() as Array<Record<string, unknown>>;

    const summaries = exams.map((exam) => {
      const examSubmissions = db.prepare("SELECT * FROM submissions WHERE examId = ? AND status = 'completed'").all(exam.id) as Array<Record<string, unknown>>;
      const totalParticipants = examSubmissions.length;

      let averageScore = 0;
      let highestScore = 0;
      let lowestScore = totalParticipants > 0 ? 999999 : 0;
      let passingCount = 0;
      const gradeDistribution = { A: 0, B: 0, C: 0, D: 0 };

      examSubmissions.forEach((sub) => {
        const score = Number(sub.score);
        averageScore += score;
        if (score > highestScore) highestScore = score;
        if (score < lowestScore) lowestScore = score;
        if (sub.isPassed === 1) passingCount++;

        const pct = Number(exam.maxScore) > 0 ? (score / Number(exam.maxScore)) * 100 : 0;
        if (pct >= 85) gradeDistribution.A++;
        else if (pct >= 70) gradeDistribution.B++;
        else if (pct >= 60) gradeDistribution.C++;
        else gradeDistribution.D++;
      });

      if (totalParticipants > 0) {
        averageScore = parseFloat((averageScore / totalParticipants).toFixed(1));
      } else {
        lowestScore = 0;
      }

      const passingPercentage = totalParticipants > 0 ? Math.round((passingCount / totalParticipants) * 100) : 0;

      const questionsList = db.prepare("SELECT id, questionText FROM questions WHERE examId = ?").all(exam.id) as Array<Record<string, unknown>>;
      const questionStats = questionsList.map((q) => {
        let correctCount = 0;
        let wrongCount = 0;

        examSubmissions.forEach((sub) => {
          const answers = JSON.parse(sub.answersJson as string) as Record<string, string>;
          const studentAns = answers[String(q.id)] || "";
          const actualQ = db.prepare("SELECT correctOption FROM questions WHERE id = ?").get(q.id) as { correctOption: string } | undefined;
          if (actualQ && studentAns.trim().toUpperCase() === actualQ.correctOption.trim().toUpperCase()) {
            correctCount++;
          } else {
            wrongCount++;
          }
        });

        const totalQ = correctCount + wrongCount;
        const successRate = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

        return { questionId: q.id, questionText: q.questionText, correctCount, wrongCount, successRate };
      });

      return {
        examId: exam.id,
        examTitle: exam.title,
        questionsCount: exam.questionsCount,
        maxScore: exam.maxScore,
        passingGrade: exam.passingGrade,
        totalParticipants,
        averageScore,
        highestScore,
        lowestScore,
        passingCount,
        passingPercentage,
        gradeDistribution,
        questionStats,
      };
    });

    res.json(summaries);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
