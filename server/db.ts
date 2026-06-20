import Database from "better-sqlite3";

let dbPath = "ujian.db";
if (process.env.VERCEL) {
  dbPath = "/tmp/ujian.db";
}

const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

export function getDb(): Database.Database {
  return db;
}

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL,
      questionsCount INTEGER DEFAULT 0,
      passingGrade INTEGER DEFAULT 60,
      maxScore INTEGER DEFAULT 100,
      startDate TEXT,
      endDate TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examId INTEGER NOT NULL,
      category TEXT,
      questionText TEXT NOT NULL,
      optionA TEXT NOT NULL,
      optionB TEXT NOT NULL,
      optionC TEXT NOT NULL,
      optionD TEXT NOT NULL,
      optionE TEXT NOT NULL,
      correctOption TEXT NOT NULL,
      scorePoints INTEGER NOT NULL,
      orderNo INTEGER NOT NULL,
      FOREIGN KEY(examId) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examId INTEGER NOT NULL,
      studentName TEXT NOT NULL,
      studentEmail TEXT NOT NULL,
      guardianEmail TEXT NOT NULL,
      startedAt TEXT NOT NULL,
      submittedAt TEXT,
      score INTEGER DEFAULT 0,
      maxScore INTEGER DEFAULT 0,
      isPassed INTEGER DEFAULT 0,
      answersJson TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ongoing',
      offlineSync INTEGER DEFAULT 0,
      FOREIGN KEY(examId) REFERENCES exams(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sent_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      examId INTEGER,
      submissionId INTEGER,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      bodyHtml TEXT NOT NULL,
      sentAt TEXT NOT NULL,
      status TEXT NOT NULL,
      logs TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      fullName TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      guardianEmail TEXT
    );
  `);

  // Schema migrations
  const migrations = [
    "ALTER TABLE exams ADD COLUMN startDate TEXT",
    "ALTER TABLE exams ADD COLUMN endDate TEXT",
    "ALTER TABLE questions ADD COLUMN category TEXT",
  ];

  for (const sql of migrations) {
    try {
      db.prepare(sql).run();
    } catch {
      // Column might already exist
    }
  }
}
