// Reverse-then-Base64 encode/decode for transport obfuscation
export function encryptText(text: string): string {
  if (!text) return "";
  const b64 = Buffer.from(text, "utf-8").toString("base64");
  return b64.split("").reverse().join("");
}

export function decodeBase64(text: string): string {
  try {
    const reversed = text.split("").reverse().join("");
    return Buffer.from(reversed, "base64").toString("utf-8");
  } catch {
    return text;
  }
}

// Refresh exam aggregate stats after question changes
import { getDb } from "./db";

export function refreshExamStats(examId: number): void {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count, SUM(scorePoints) as totalPoints FROM questions WHERE examId = ?"
    )
    .get(examId) as { count: number; totalPoints: number | null };
  db.prepare("UPDATE exams SET questionsCount = ?, maxScore = ? WHERE id = ?").run(
    row.count,
    row.totalPoints ?? 0,
    examId
  );
}
