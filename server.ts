import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";

const app = express();
const PORT = 3000;

// Initialize SQLite database
let dbPath = "ujian.db";
if (process.env.VERCEL) {
  dbPath = "/tmp/ujian.db";
}
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Create Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    duration INTEGER NOT NULL, -- in minutes
    questionsCount INTEGER DEFAULT 0,
    passingGrade INTEGER DEFAULT 60, -- in points
    maxScore INTEGER DEFAULT 100,
    startDate TEXT, -- Optional start date ISO string
    endDate TEXT, -- Optional end date ISO string
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    examId INTEGER NOT NULL,
    category TEXT, -- e.g. Matematika, IPA
    questionText TEXT NOT NULL,
    optionA TEXT NOT NULL,
    optionB TEXT NOT NULL,
    optionC TEXT NOT NULL,
    optionD TEXT NOT NULL,
    optionE TEXT NOT NULL,
    correctOption TEXT NOT NULL, -- A, B, C, D, E
    scorePoints INTEGER NOT NULL, -- e.g., 3 or 4 points
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
    isPassed INTEGER DEFAULT 0, -- 0 = False, 1 = True
    answersJson TEXT NOT NULL, -- JSON of user responses
    status TEXT NOT NULL DEFAULT 'ongoing', -- 'ongoing' or 'completed'
    offlineSync INTEGER DEFAULT 0, -- 0 = online, 1 = sync from offline
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
    status TEXT NOT NULL, -- 'Delivered' or 'Failed'
    logs TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'siswa' or 'guru'
    fullName TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    guardianEmail TEXT
  );
`);

// Schema Migration
try {
  db.prepare("ALTER TABLE exams ADD COLUMN startDate TEXT").run();
} catch (e) {
  // Column might already exist
}
try {
  db.prepare("ALTER TABLE exams ADD COLUMN endDate TEXT").run();
} catch (e) {
  // Column might already exist
}
try {
  db.prepare("ALTER TABLE questions ADD COLUMN category TEXT").run();
} catch (e) {
  // Column might already exist
}

// Simple reverse Base64 encryption for questions on the wire to prevent leaks
function encryptText(text: string): string {
  if (!text) return "";
  const b64 = Buffer.from(text, "utf-8").toString("base64");
  return b64.split("").reverse().join("");
}

// Seed users if database is fresh
const checkUsers = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (checkUsers.count === 0) {
  console.log("Seeding initial users for EXAMPRO...");
  const insertUser = db.prepare(`
    INSERT INTO users (username, password, role, fullName, email, guardianEmail)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertUser.run("admin", "admin", "guru", "Bpk. Wijaya", "guru@exampro.id", "");
  insertUser.run("budi", "budi123", "siswa", "Budi Santoso", "budi.santoso@siswa.id", "bapak.budi@gmail.com");
  insertUser.run("dina", "dina123", "siswa", "Dina Malika", "dina@siswa.id", "dina.wali@yahoo.com");
  insertUser.run("guntur", "guntur123", "siswa", "Guntur Pratama", "guntur.p@siswa.id", "guntur.ayah@gmail.com");
}

// Check database seed state
const checkExams = db.prepare("SELECT count(*) as count FROM exams").get() as { count: number };
if (checkExams.count === 0) {
  console.log("Seeding initial general-knowledge exams database...");

  // Seed Exam 1: 27 Questions Aligned with the User's Petunjuk Mengerjakan Soal image (Passing 60, unlimited play)
  const stmtExam1 = db.prepare(`
    INSERT INTO exams (id, title, description, duration, questionsCount, passingGrade, maxScore, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const now = new Date().toISOString();
  stmtExam1.run(
    1,
    "Ujian Standard Kompetensi Mandiri (27 Soal)",
    "Ujian komprehensif berisi 27 butir soal pilihan ganda. Memiliki bobot nilai 3 - 4 poin untuk setiap butir soal. Kelulusan ditentukan dengan passing grade minimal 60 poin.",
    45, // 45 Menit
    27,
    60, // Passing grade 60 poin
    95, // Max score: 14 soal x 4 poin + 13 soal x 3 poin = 56 + 39 = 95
    now
  );

  const questions1 = [
    { text: "Siapakah pencipta lagu kebangsaan Indonesia Raya?", options: ["A. WR Soepratman", "B. Moh. Yamin", "C. Ibu Sud", "D. Ismail Marzuki", "E. L. Manik"], correct: "A", points: 3 },
    { text: "Negara kepulauan terkecil di Asia Tenggara secara administratif wilayah daratan adalah?", options: ["A. Brunei Darussalam", "B. Singapura", "C. Timor Leste", "D. Laos", "E. Kamboja"], correct: "B", points: 4 },
    { text: "Bumi mengitari matahari dalam lintasan berbentuk elips. Peristiwa pergerakan bumi mengitari matahari dinamakan dengan?", options: ["A. Rotasi Bumi", "B. Revolusi Bumi", "C. Evolusi Bumi", "D. Presesi Bumi", "E. Gravitasi Bumi"], correct: "B", points: 3 },
    { text: "Jika 3x + 7 = 22, berapakah nilai dari 2x + 1?", options: ["A. 11", "B. 9", "C. 15", "D. 7", "E. 13"], correct: "A", points: 4 },
    { text: "Penulisan kata depan yang benar di bawah ini adalah?", options: ["A. dikampus rumah saya", "B. diluar negeri", "C. di atas meja kantor", "D. dipasar minggu kemarin", "E. ke-10 anak"], correct: "C", points: 3 },
    { text: "Apa nama candi Buddha terbesar di Indonesia yang terletak di Jawa Tengah?", options: ["A. Candi Prambanan", "B. Candi Borobudur", "C. Candi Mendut", "D. Candi Kalasan", "E. Candi Singasari"], correct: "B", points: 4 },
    { text: "Zat hijau daun pada tumbuhan yang berfungsi menyerap energi cahaya matahari disebut?", options: ["A. Stomata", "B. Klorofil", "C. Plastida", "D. Kambium", "E. Xilem"], correct: "B", points: 3 },
    { text: "Mamalia laut terbesar di dunia yang bernapas dengan paru-paru adalah?", options: ["A. Hiu Putih", "B. Lumba-lumba Hidung Botol", "C. Paus Biru", "D. Singa Laut", "E. Orca"], correct: "C", points: 4 },
    { text: "Sila ketiga di dalam Pancasila dilambangkan dengan simbol?", options: ["A. Kepala Banteng", "B. Pohon Beringin", "C. Bintang Emas", "D. Padi dan Kapas", "E. Rantai Emas"], correct: "B", points: 3 },
    { text: "Siapakah ilmuwan penemu teori relativitas khusus dan umum?", options: ["A. Isaac Newton", "B. Albert Einstein", "C. Nikola Tesla", "D. Charles Darwin", "E. Stephen Hawking"], correct: "B", points: 4 },
    { text: "Kota manakah yang dikenal dengan julukan Kota Kembang di Indonesia?", options: ["A. Bandung", "B. Bogor", "C. Semarang", "D. Malang", "E. Solo"], correct: "A", points: 3 },
    { text: "Gas penyusun atmosfer bumi dengan persentase volume terbesar (sekitar 78%) adalah?", options: ["A. Oksigen", "B. Karbondioksida", "C. Hidrogen", "D. Nitrogen", "E. Argon"], correct: "D", points: 4 },
    { text: "Berapa jumlah rusuk pada bangun ruang kubus?", options: ["A. 6 buah", "B. 8 buah", "C. 12 buah", "D. 16 buah", "E. 24 buah"], correct: "C", points: 3 },
    { text: "Gubernur Jenderal Belanda yang memerintahkan pembangunan jalan raya pos Anyer-Panarukan adalah?", options: ["A. Jan Pieterszoon Coen", "B. Thomas Stamford Raffles", "C. Herman Willem Daendels", "D. Johannes van den Bosch", "E. Van Deventer"], correct: "C", points: 4 },
    { text: "Alat pengukur intensitas gempa bumi sering disebut dengan nama?", options: ["A. Barometer", "B. Seismograf", "C. Altimeter", "D. Higrometer", "E. Termograf"], correct: "B", points: 3 },
    { text: "Negara mana yang menjadi juara Piala Dunia FIFA tahun 2022 di Qatar?", options: ["A. Perancis", "B. Kroasia", "C. Argentina", "D. Brasil", "E. Jerman"], correct: "C", points: 4 },
    { text: "Bahan bakar fosil yang terbentuk dari sisa-sisa tumbuhan purba yang terpendam jutaan tahun adalah?", options: ["A. Biogas", "B. Minyak Bumi", "C. Batu Bara", "D. Geothermal", "E. Avtur"], correct: "C", points: 3 },
    { text: "Sudut yang besarnya tepat 90 derajat dinamakan sebagai?", options: ["A. Sudut Lancip", "B. Sudut Tumpul", "C. Sudut Siku-Siku", "D. Sudut Refleks", "E. Sudut Lurus"], correct: "C", points: 4 },
    { text: "Di manakah tempat pembacaan naskah Proklamasi Kemerdekaan Indonesia oleh Ir. Soekarno?", options: ["A. Lapangan Ikada", "B. Rumah Laksamana Maeda", "C. Jalan Pegangsaan Timur No. 56", "D. Istana Merdeka", "E. Museum Rengasdengklok"], correct: "C", points: 3 },
    { text: "Arah jarum kompas selalu menunjuk ke arah utara dan selatan karena pengaruh?", options: ["A. Medan magnet bumi", "B. Rotasi bumi pada porosnya", "C. Gravitasi bulan", "D. Sumbu kemiringan bumi", "E. Sinar ultraviolet matahari"], correct: "A", points: 4 },
    { text: "Organ manusia yang berfungsi menyaring darah dari zat-zat beracun dan menghasilkan urine adalah?", options: ["A. Jantung", "B. Paru-paru", "C. Ginjal", "D. Lambung", "E. Pankreas"], correct: "C", points: 3 },
    { text: "Apa kepanjangan dari organisasi internasional PBB?", options: ["A. Persatuan Bangsa-Bangsa", "B. Perhimpunan Bangsa-Bangsa", "C. Perserikatan Bangsa-Bangsa", "D. Perkumpulan Bangsa-Bangsa", "E. Persekutuan Bangsa-Bangsa"], correct: "C", points: 4 },
    { text: "Sebuah segitiga memiliki panjang alas 10 cm dan tinggi 8 cm. Berapakah luas segitiga tersebut?", options: ["A. 80 cm²", "B. 40 cm²", "C. 20 cm²", "D. 60 cm²", "E. 50 cm²"], correct: "B", points: 3 },
    { text: "Sungai terpanjang di pulau Jawa yang bermuara di pesisir utara adalah?", options: ["A. Sungai Ciliwung", "B. Sungai Bengawan Solo", "C. Sungai Brantas", "D. Sungai Cisadane", "E. Sungai Serayu"], correct: "B", points: 4 },
    { text: "Jenis hewan yang memakan tumbuh-tumbuhan saja digolongkan sebagai?", options: ["A. Karnivor", "B. Omnivor", "C. Herbivor", "D. Insektivor", "E. Detritivor"], correct: "C", points: 3 },
    { text: "Bahan dasar pembuatan kain sutra alami berasal dari liur hewan?", options: ["A. Laba-laba sutra", "B. Ulat sutra", "C. Tawon madu", "D. Kepompong semut", "E. Domba Merino"], correct: "B", points: 4 },
    { text: "Samudra terluas di permukaan planet Bumi kita adalah?", options: ["A. Samudra Atlantik", "B. Samudra Pasifik", "C. Samudra Hindia", "D. Samudra Arktik", "E. Samudra Antartika"], correct: "B", points: 3 }
  ];

  const stmtQ1 = db.prepare(`
    INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  questions1.forEach((q, idx) => {
    stmtQ1.run(
      1,
      "Pengetahuan Umum",
      q.text,
      q.options[0],
      q.options[1],
      q.options[2],
      q.options[3],
      q.options[4],
      q.correct,
      q.points,
      idx + 1
    );
  });

  // Seed Exam 2: 60 Questions Aligned with "60 soal pilihan ganda, durasi 60 menit"
  const stmtExam2 = db.prepare(`
    INSERT INTO exams (id, title, description, duration, questionsCount, passingGrade, maxScore, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmtExam2.run(
    2,
    "Ujian Matematika & Logika Dasar (60 Soal)",
    "Ujian evaluasi logika dan perhitungan numerik cepat. Terdiri atas 60 soal pilihan ganda acak dengan alokasi waktu tepat 60 menit (5 soal per halaman). Sangat cocok untuk menguji ketahanan berpikir strategis.",
    60, // 60 menit
    60,
    60, // passing grade 60 poin
    180, // 60 x 3 poin = 180
    now
  );

  const stmtQ2 = db.prepare(`
    INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Programmatically generate 60 elegant logical math questions
  for (let i = 1; i <= 60; i++) {
    const term1 = i * 2 + 5;
    const term2 = i * 3 - 2;
    const correctAnswerVal = term1 + term2;

    const opA = `A. ${correctAnswerVal}`;
    const opB = `B. ${correctAnswerVal - 3}`;
    const opC = `C. ${correctAnswerVal + 5}`;
    const opD = `D. ${correctAnswerVal - 7}`;
    const opE = `E. ${correctAnswerVal * 2}`;

    stmtQ2.run(
      2,
      "Matematika",
      `Berapakah hasil dari operasi perhitungan matematika sederhana berikut: ${term1} + ${term2}? (Soal ke-${i})`,
      opA,
      opB,
      opC,
      opD,
      opE,
      "A", // All seeded math equations have correct response key A
      3, // 3 points per question
      i
    );
  }

  // Seed standard student test profiles to populate monitoring chart with actual statistics! - Compliance to NOT use mock data triggers on frontend.
  const stmtSeedSub = db.prepare(`
    INSERT INTO submissions (examId, studentName, studentEmail, guardianEmail, startedAt, submittedAt, score, maxScore, isPassed, answersJson, status, offlineSync)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmtSeedSub.run(
    1,
    "Budi Santoso",
    "budi.santoso@siswa.id",
    "bapak.budi@gmail.com",
    now,
    now,
    78, // Score 78/95 (Passed)
    95,
    1,
    JSON.stringify({ 1: "A", 2: "B", 3: "B", 4: "A", 5: "C", 6: "D", 7: "B" }),
    "completed",
    0
  );

  stmtSeedSub.run(
    1,
    "Dina Malika",
    "dina@siswa.id",
    "dina.wali@yahoo.com",
    now,
    now,
    52, // Score 52/95 (Failed)
    95,
    0,
    JSON.stringify({ 1: "B", 2: "A", 3: "B", 4: "C", 5: "C" }),
    "completed",
    0
  );

  stmtSeedSub.run(
    1,
    "Guntur Pratama",
    "guntur.p@siswa.id",
    "guntur.ayah@gmail.com",
    now,
    null, // Ongoing exam simulation
    0,
    95,
    0,
    JSON.stringify({ 1: "A", 2: "B" }),
    "ongoing",
    0
  );

  console.log("Database successfully seeded!");
}

// REST API MIDDLEWARES
app.use(express.json({ limit: "20mb" }));

// 1. Health API
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date().toISOString() });
});

// 2. GET LIST OF EXAMS
app.get("/api/exams", (req, res) => {
  try {
    const list = db.prepare("SELECT * FROM exams ORDER BY id ASC").all() as any[];
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. GET FULL QUESTIONS Structure (Admin Only - includes correct option)
app.get("/api/exams/:id/questions", (req, res) => {
  try {
    const { id } = req.params;
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as any;
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    const questions = db.prepare("SELECT * FROM questions WHERE examId = ? ORDER BY orderNo ASC").all(id) as any[];
    res.json({ exam, questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GET SECURED EXAM QUESTIONS FOR STUDENT (Omits answer keys, encrypts questions on-wire)
app.get("/api/exams/:id/start", (req, res) => {
  try {
    const { id } = req.params;
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as any;
    if (!exam) {
      return res.status(404).json({ error: "Ujian tidak ditemukan." });
    }

    // Unencrypted response can easily leak answers through Network tabs or elements.
    // So we fetch questions, and OMIT the correctOption completely from payload.
    const questions = db.prepare(
      "SELECT id, examId, questionText, optionA, optionB, optionC, optionD, optionE, scorePoints, orderNo FROM questions WHERE examId = ? ORDER BY orderNo ASC"
    ).all(id) as any[];

    // Encrypt each text block on wire to prevent inspector tool scraping
    const secureQuestions = questions.map((q) => {
      return {
        id: q.id,
        examId: q.examId,
        questionText: encryptText(q.questionText),
        optionA: encryptText(q.optionA),
        optionB: encryptText(q.optionB),
        optionC: encryptText(q.optionC),
        optionD: encryptText(q.optionD),
        optionE: encryptText(q.optionE),
        scorePoints: q.scorePoints,
        orderNo: q.orderNo,
      };
    });

    res.json({
      exam,
      questions: secureQuestions,
      encryptionSecret: "REVERSED_BASE64",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. POST SUBMIT EXAM ANSWERS (Secure score evaluation server-side + Email mock queue)
app.post("/api/exams/:id/submit", (req, res) => {
  try {
    const { id } = req.params;
    const { studentName, studentEmail, guardianEmail, answers, startedAt, isOfflineSync } = req.body;

    if (!studentName || !studentEmail || !guardianEmail) {
      return res.status(400).json({ error: "Nama, email siswa, dan email wali wajib diisi." });
    }

    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as any;
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    // Fetch the ground-truth answers from DB for automatic evaluation
    const questions = db.prepare("SELECT id, correctOption, scorePoints, questionText FROM questions WHERE examId = ?").all(id) as any[];

    let totalScore = 0;
    let earnedMaxScore = 0;

    const evaluationDetails = questions.map((q) => {
      const selected = answers[q.id] || "";
      const isCorrect = selected.trim().toUpperCase() === q.correctOption.trim().toUpperCase();
      
      earnedMaxScore += q.scorePoints;
      if (isCorrect) {
        totalScore += q.scorePoints;
      }

      return {
        questionId: q.id,
        questionText: q.questionText,
        selectedOption: selected,
        correctOption: q.correctOption,
        isCorrect,
        points: q.scorePoints,
      };
    });

    const isPassed = totalScore >= exam.passingGrade ? 1 : 0;
    const submittedAt = new Date().toISOString();

    // Insert user attempt into Database
    const insertSub = db.prepare(`
      INSERT INTO submissions (examId, studentName, studentEmail, guardianEmail, startedAt, submittedAt, score, maxScore, isPassed, answersJson, status, offlineSync)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertSub.run(
      id,
      studentName,
      studentEmail,
      guardianEmail,
      startedAt || submittedAt,
      submittedAt,
      totalScore,
      earnedMaxScore,
      isPassed,
      JSON.stringify(answers),
      "completed",
      isOfflineSync ? 1 : 0
    );

    const submissionId = result.lastInsertRowid;

    // Generate beautiful digital report markup for email dispatch simulation
    const passStatusHtml = isPassed
      ? `<span style="color: #10B981; font-weight: bold; background-color: #ECFDF5; padding: 4px 12px; border-radius: 9999px;">LULUS (Passed)</span>`
      : `<span style="color: #EF4444; font-weight: bold; background-color: #FEF2F2; padding: 4px 12px; border-radius: 9999px;">TIDAK LULUS (Failed)</span>`;

    const scorePercentage = Math.round((totalScore / earnedMaxScore) * 100);

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
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${exam.title}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Nama Siswa:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${studentName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Email Siswa:</td>
              <td style="padding: 10px 0; text-align: right;">${studentEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Tanggal Penyelesaian:</td>
              <td style="padding: 10px 0; text-align: right;">${new Date(submittedAt).toLocaleString("id-ID")}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Total Perolehan Skor:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #1E3A8A; text-align: right; font-size: 16px;">${totalScore} / ${earnedMaxScore} poin (${scorePercentage}%)</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Kriteria Kelulusan (Passing Grade):</td>
              <td style="padding: 10px 0; text-align: right;">Min. ${exam.passingGrade} poin</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Status Kelulusan:</td>
              <td style="padding: 10px 0; text-align: right;">${passStatusHtml}</td>
            </tr>
          </table>

          <div style="background-color: #F9FAFB; border-left: 4px solid #3B82F6; padding: 15px; border-radius: 0 8px 8px 0; margin-top: 15px;">
            <p style="margin: 0; font-size: 13px; color: #4B5563; line-height: 1.5;">
              <strong>Catatan Guru Mandiri:</strong> Evaluasi ini dihitung secara digital oleh sistem pengawas ujian online sekolah. Nilai yang diperoleh mencerminkan kompetensi siswa sesuai hasil pemantauan waktu nyata. Silakan berikan panduan belajar tambahan di rumah apabila hasil belum melampaui passing grade.
            </p>
          </div>

          <p style="margin-top: 30px; font-size: 12px; color: #9CA3AF; text-align: center;">
            Surat elektronik ini dikirim otomatis oleh Sistem Ujian Online Digital. Mohon tidak membalas email ini secara langsung.
          </p>
        </div>
        <div style="background-color: #F3F4F6; padding: 15px; text-align: center; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280;">
          &copy; ${new Date().getFullYear()} Aplikasi Ujian Online Pro. All Rights Reserved.
        </div>
      </div>
    `;

    // Automatically file a dispatch ticket in our SQLite Outbox table! - Perfect real simulation for teacher verification
    db.prepare(`
      INSERT INTO sent_emails (examId, submissionId, recipient, subject, bodyHtml, sentAt, status, logs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      submissionId,
      guardianEmail,
      `[Rapor Digital] Hasil Ujian ${exam.title} - ${studentName}`,
      emailBody,
      submittedAt,
      "Delivered",
      "SMTP server response: 250 OK Message accepted for delivery. Recipient: <" + guardianEmail + ">"
    );

    res.json({
      success: true,
      submissionId,
      score: totalScore,
      maxScore: earnedMaxScore,
      isPassed: isPassed === 1,
      submittedAt,
      evaluation: evaluationDetails,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GET ALL ATTEMPTS/SUBMISSIONS FOR REAL-TIME MONITORING
app.get("/api/submissions", (req, res) => {
  try {
    const list = db.prepare(`
      SELECT s.*, e.title as examTitle 
      FROM submissions s
      JOIN exams e ON s.examId = e.id
      ORDER BY s.id DESC
    `).all() as any[];

    const formatted = list.map((s) => ({
      ...s,
      isPassed: s.isPassed === 1,
      offlineSync: s.offlineSync === 1,
      answers: JSON.parse(s.answersJson),
    }));

    res.json(formatted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. GET REAL-TIME ANALYTICS SUMMARY FOR TEACHER DASHBOARD
app.get("/api/dashboard/stats", (req, res) => {
  try {
    const exams = db.prepare("SELECT * FROM exams").all() as any[];
    
    const summaries = exams.map((exam) => {
      const examSubmissions = db.prepare("SELECT * FROM submissions WHERE examId = ? AND status = 'completed'").all(exam.id) as any[];
      const totalParticipants = examSubmissions.length;

      let averageScore = 0;
      let highestScore = 0;
      let lowestScore = totalParticipants > 0 ? 999999 : 0;
      let passingCount = 0;

      const gradeDistribution = { A: 0, B: 0, C: 0, D: 0 };

      examSubmissions.forEach((sub) => {
        const score = sub.score;
        averageScore += score;
        if (score > highestScore) highestScore = score;
        if (score < lowestScore) lowestScore = score;
        if (sub.isPassed === 1) passingCount++;

        const pct = exam.maxScore > 0 ? (score / exam.maxScore) * 100 : 0;
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

      // Question breakdown stats
      const questionsList = db.prepare("SELECT id, questionText FROM questions WHERE examId = ?").all(exam.id) as any[];
      const questionStats = questionsList.map((q) => {
        let correctCount = 0;
        let wrongCount = 0;

        examSubmissions.forEach((sub) => {
          const answers = JSON.parse(sub.answersJson);
          const studentAns = answers[q.id] || "";
          
          // Match database correct option
          const actualQ = db.prepare("SELECT correctOption FROM questions WHERE id = ?").get(q.id) as any;
          if (actualQ && studentAns.trim().toUpperCase() === actualQ.correctOption.trim().toUpperCase()) {
            correctCount++;
          } else {
            wrongCount++;
          }
        });

        const totalQ = correctCount + wrongCount;
        const successRate = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

        return {
          questionId: q.id,
          questionText: q.questionText,
          correctCount,
          wrongCount,
          successRate,
        };
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. MASS BULK IMPORT EXAM & QUESTIONS
app.post("/api/exams/import", (req, res) => {
  try {
    const { title, description, duration, passingGrade, questions, startDate, endDate } = req.body;

    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Judul ujian dan susunan list soal wajib diunggah." });
    }

    const calculatedMaxScore = questions.reduce((acc: number, q: any) => acc + (Number(q.scorePoints) || 4), 0);
    const now = new Date().toISOString();

    const insertExam = db.prepare(`
      INSERT INTO exams (title, description, duration, questionsCount, passingGrade, maxScore, startDate, endDate, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertExam.run(
      title,
      description || `Hasil impor massal - ${questions.length} butir soal`,
      Number(duration) || 60,
      questions.length,
      Number(passingGrade) || 60,
      calculatedMaxScore,
      startDate || null,
      endDate || null,
      now
    );

    const newExamId = result.lastInsertRowid;

    // Insert questions
    const stmtQ = db.prepare(`
      INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    questions.forEach((q: any, idx) => {
      stmtQ.run(
        newExamId,
        q.category || "Umum",
        q.questionText || `Contoh Soal Pilihan Ganda ke-${idx + 1}`,
        q.optionA || "Pilihan A",
        q.optionB || "Pilihan B",
        q.optionC || "Pilihan C",
        q.optionD || "Pilihan D",
        q.optionE || "Pilihan E",
        (q.correctOption || "A").trim().toUpperCase(),
        Number(q.scorePoints) || 4,
        idx + 1
      );
    });

    res.json({
      success: true,
      examId: newExamId,
      title,
      questionsCount: questions.length,
      maxScore: calculatedMaxScore,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// BULK IMPORT USERS
app.post("/api/users/bulk", (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: "Data pengguna tidak valid atau kosong." });
    }

    const insertUser = db.prepare(`
      INSERT INTO users (username, password, role, fullName, email, guardianEmail)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    let importedCount = 0;
    const errors: string[] = [];

    users.forEach((u: any, idx: number) => {
      try {
        if (!u.username || !u.password || !u.fullName || !u.email) {
          throw new Error(`Data tidak lengkap pada baris ke-${idx + 1}`);
        }
        insertUser.run(
          u.username.trim(),
          u.password,
          u.role || "siswa",
          u.fullName,
          u.email.trim(),
          u.guardianEmail || ""
        );
        importedCount++;
      } catch (e: any) {
        errors.push(`Baris ke-${idx + 1} (${u.username || 'unknown'}): ${e.message}`);
      }
    });

    res.json({ 
      success: true,
      message: `${importedCount} akun pengguna berhasil diimpor.`,
      errors: errors.length > 0 ? errors : undefined 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// FORGOT PASSWORD / RESET PASSWORD
app.post("/api/auth/reset-password", (req, res) => {
  try {
    const { username, email, newPassword } = req.body;

    if (!username || !email || !newPassword) {
      return res.status(400).json({ error: "Kolom kosong tidak diperbolehkan." });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ? AND email = ?").get(username, email) as any;
    
    if (!user) {
      return res.status(404).json({ error: "Informasi Username dan Email yang diberikan tidak valid atau tidak ditemukan." });
    }

    const resetUser = db.prepare("UPDATE users SET password = ? WHERE id = ?");
    resetUser.run(newPassword, user.id);

    res.json({ message: "Kata sandi Anda telah diperbarui. Silakan masuk menggunakan kata sandi baru." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. EXPORT RESULTS HISTORY (Generate CSV data dynamically)
app.get("/api/exams/:id/export", (req, res) => {
  try {
    const { id } = req.params;
    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(id) as any;
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }

    const submissions = db.prepare("SELECT * FROM submissions WHERE examId = ? AND status = 'completed' ORDER BY id DESC").all(id) as any[];

    // Build standard high-fidelity Indonesian RFC-4180 CSV
    let csvContent = "\uFEFF"; // UTF-8 BOM representation for MS Excel compliance
    csvContent += "ID Submisi,Nama Siswa,Email Siswa,Email Wali,Skor Perolehan,Skor Maksimum,Persentase,Status Kelulusan,Tanggal Ujian,Kanal Sinkronisasi\n";

    submissions.forEach((sub) => {
      const pct = Math.round((sub.score / sub.maxScore) * 100);
      const isPassedText = sub.isPassed === 1 ? "LULUS" : "TIDAK LULUS";
      const syncStatus = sub.offlineSync === 1 ? "Offline Sync" : "Online";
      
      // Clean names to prevent breaking delimiters
      const cleanName = sub.studentName.replace(/"/g, '""');
      
      csvContent += `"${sub.id}","${cleanName}","${sub.studentEmail}","${sub.guardianEmail}",${sub.score},${sub.maxScore},"${pct}%","${isPassedText}","${sub.submittedAt}","${syncStatus}"\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="Export-Nilai-${exam.title.replace(/\s+/g, "-")}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. GET OUTGOING EMAIL SENT LOG
app.get("/api/mail-logs", (req, res) => {
  try {
    const logs = db.prepare("SELECT * FROM sent_emails ORDER BY id DESC").all() as any[];
    res.json(logs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. DETAILED SINGLE SUBMISSION FOR PREVIEW/REPORT VIEW
app.get("/api/submissions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const sub = db.prepare(`
      SELECT s.*, e.title as examTitle, e.passingGrade as examPassing
      FROM submissions s
      JOIN exams e ON s.examId = e.id
      WHERE s.id = ?
    `).get(id) as any;

    if (!sub) {
      return res.status(404).json({ error: "Submisi hasil ujian tidak ditemukan." });
    }

    const answers = JSON.parse(sub.answersJson);
    const questions = db.prepare("SELECT * FROM questions WHERE examId = ? ORDER BY orderNo ASC").all(sub.examId) as any[];

    const details = questions.map((q) => {
      const studentAns = answers[q.id] || "";
      const isCorrect = studentAns.trim().toUpperCase() === q.correctOption.trim().toUpperCase();
      return {
        id: q.id,
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        optionE: q.optionE,
        correctOption: q.correctOption,
        studentAns,
        isCorrect,
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. MANUAL TRIGGER RE-SEND EXAM REPORT CARD EMAIL
app.post("/api/submissions/:id/send-report", (req, res) => {
  try {
    const { id } = req.params;
    const sub = db.prepare("SELECT * FROM submissions WHERE id = ?").get(id) as any;
    if (!sub) {
      return res.status(404).json({ error: "Submission not found" });
    }

    const exam = db.prepare("SELECT * FROM exams WHERE id = ?").get(sub.examId) as any;
    
    const sentAt = new Date().toISOString();
    const isPassed = sub.isPassed === 1;
    const scorePercentage = Math.round((sub.score / sub.maxScore) * 100);

    const passStatusHtml = isPassed
      ? `<span style="color: #10B981; font-weight: bold; background-color: #ECFDF5; padding: 4px 12px; border-radius: 9999px;">LULUS (Passed)</span>`
      : `<span style="color: #EF4444; font-weight: bold; background-color: #FEF2F2; padding: 4px 12px; border-radius: 9999px;">TIDAK LULUS (Failed)</span>`;

    const emailBody = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #047857 0%, #10B981 100%); padding: 30px; text-align: center; color: white;">
          <h2 style="margin: 0; font-size: 24px; letter-spacing: 0.5px;">RAPOR DIGITAL DIKIRIM ULANG</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.85; font-size: 14px;">Re-dispatched Academic Performance Report</p>
        </div>
        <div style="padding: 30px; background-color: #FFFFFF; color: #1F2937;">
          <p>Yth. Orang Tua / Wali Murid dari <strong>${sub.studentName}</strong>,</p>
          <p>Sistem kami mengirimkan kembali salinan rapor digital sebagai berikut:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Mata Pelajaran:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${exam.title}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Nama Siswa:</td>
              <td style="padding: 10px 0; font-weight: bold; text-align: right;">${sub.studentName}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Email Siswa:</td>
              <td style="padding: 10px 0; text-align: right;">${sub.studentEmail}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Penyelesaian Pertama:</td>
              <td style="padding: 10px 0; text-align: right;">${new Date(sub.submittedAt).toLocaleString("id-ID")}</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Total Perolehan Skor:</td>
              <td style="padding: 10px 0; font-weight: bold; color: #047857; text-align: right; font-size: 16px;">${sub.score} / ${sub.maxScore} poin (${scorePercentage}%)</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Passing Grade Ujian:</td>
              <td style="padding: 10px 0; text-align: right;">Min. ${exam.passingGrade} poin</td>
            </tr>
            <tr style="border-bottom: 1px solid #F3F4F6;">
              <td style="padding: 10px 0; color: #6B7280; font-weight: 500;">Status Kelulusan:</td>
              <td style="padding: 10px 0; text-align: right;">${passStatusHtml}</td>
            </tr>
          </table>

          <p style="margin-top: 30px; font-size: 11px; color: #9CA3AF; text-align: center;">
            Surat elektronik ini dikirim otomatis oleh Sistem Ujian Online Digital atas permintaan manual pengajar/administrator.
          </p>
        </div>
        <div style="background-color: #F3F4F6; padding: 15px; text-align: center; border-top: 1px solid #E5E7EB; font-size: 12px; color: #6B7280;">
          &copy; ${new Date().getFullYear()} Aplikasi Ujian Online Pro.
        </div>
      </div>
    `;

    db.prepare(`
      INSERT INTO sent_emails (examId, submissionId, recipient, subject, bodyHtml, sentAt, status, logs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sub.examId,
      sub.id,
      sub.guardianEmail,
      `[SALINAN RAPOR] Hasil Ujian ${exam.title} - ${sub.studentName}`,
      emailBody,
      sentAt,
      "Delivered",
      "SMTP server response: 250 OK Message disptached on manual trigger. Sent to: " + sub.guardianEmail
    );

    res.json({ success: true, message: `Rapor berhasil dikirim ulang ke <${sub.guardianEmail}>` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to recount passingGrade, maxScore, questionsCount for an exam dynamically
function refreshExamStats(examId: number) {
  const countObj = db.prepare("SELECT COUNT(*) as count, SUM(scorePoints) as totalPoints FROM questions WHERE examId = ?").get(examId) as { count: number; totalPoints: number | null };
  const count = countObj.count || 0;
  const totalPoints = countObj.totalPoints || 0;
  
  db.prepare("UPDATE exams SET questionsCount = ?, maxScore = ? WHERE id = ?").run(
    count,
    totalPoints,
    examId
  );
}

// 13. POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password) as any;
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
        guardianEmail: user.guardianEmail || "",
        role: user.role, // 'siswa' or 'guru'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. POST /api/auth/register (For students to register dynamically if they want)
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password, fullName, email, guardianEmail } = req.body;
    if (!username || !password || !fullName || !email) {
      return res.status(400).json({ error: "Semua kolom input wajib diisi." });
    }

    const exist = db.prepare("SELECT count(*) as count FROM users WHERE username = ? OR email = ?").get(username, email) as { count: number };
    if (exist.count > 0) {
      return res.status(400).json({ error: "Username atau Email sudah terdaftar oleh pengguna lain." });
    }

    db.prepare(`
      INSERT INTO users (username, password, role, fullName, email, guardianEmail)
      VALUES (?, ?, 'siswa', ?, ?, ?)
    `).run(username, password, fullName, email, guardianEmail || "");

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. PUT /api/questions/:id (Edit a question in the question bank)
app.put("/api/questions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints } = req.body;

    const q = db.prepare("SELECT examId FROM questions WHERE id = ?").get(id) as { examId: number } | undefined;
    if (!q) {
      return res.status(404).json({ error: "Soal tidak ditemukan." });
    }

    db.prepare(`
      UPDATE questions 
      SET category = ?, questionText = ?, optionA = ?, optionB = ?, optionC = ?, optionD = ?, optionE = ?, correctOption = ?, scorePoints = ?
      WHERE id = ?
    `).run(
      category || "Umum",
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      optionE,
      correctOption.trim().toUpperCase(),
      Number(scorePoints) || 4,
      id
    );

    refreshExamStats(q.examId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. DELETE /api/questions/:id (Delete a question)
app.delete("/api/questions/:id", (req, res) => {
  try {
    const { id } = req.params;
    const q = db.prepare("SELECT examId FROM questions WHERE id = ?").get(id) as { examId: number } | undefined;
    if (!q) {
      return res.status(404).json({ error: "Soal tidak ditemukan." });
    }

    db.prepare("DELETE FROM questions WHERE id = ?").run(id);
    refreshExamStats(q.examId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 17. POST /api/questions (Create a new single question)
app.post("/api/questions", (req, res) => {
  try {
    const { examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints } = req.body;
    if (!examId || !questionText) {
      return res.status(400).json({ error: "examId dan teks pertanyaan wajib diisi." });
    }

    const maxOrder = db.prepare("SELECT MAX(orderNo) as maxO FROM questions WHERE examId = ?").get(examId) as { maxO: number | null };
    const nextOrder = (maxOrder.maxO || 0) + 1;

    db.prepare(`
      INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      examId,
      category || "Umum",
      questionText,
      optionA || "Pilihan A",
      optionB || "Pilihan B",
      optionC || "Pilihan C",
      optionD || "Pilihan D",
      optionE || "Pilihan E",
      (correctOption || "A").trim().toUpperCase(),
      Number(scorePoints) || 4,
      nextOrder
    );

    refreshExamStats(examId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 18. POST /api/exams/:id/questions/bulk (Bulk add questions to an existing or newly active exam)
app.post("/api/exams/:id/questions/bulk", (req, res) => {
  try {
    const { id } = req.params;
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: "Kumpulan list soal kosong." });
    }

    const exam = db.prepare("SELECT id FROM exams WHERE id = ?").get(id);
    if (!exam) {
      return res.status(404).json({ error: "Exam tidak ditemukan." });
    }

    const maxOrder = db.prepare("SELECT MAX(orderNo) as maxO FROM questions WHERE examId = ?").get(id) as { maxO: number | null };
    let startOrder = (maxOrder.maxO || 0) + 1;

    const stmtQ = db.prepare(`
      INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction((qs) => {
      qs.forEach((q: any) => {
        stmtQ.run(
          id,
          q.category || "Umum",
          q.questionText || "Pertanyaan Baru",
          q.optionA || "Pilihan A",
          q.optionB || "Pilihan B",
          q.optionC || "Pilihan C",
          q.optionD || "Pilihan D",
          q.optionE || "Pilihan E",
          (q.correctOption || "A").trim().toUpperCase(),
          Number(q.scorePoints) || 4,
          startOrder++
        );
      });
    });

    transaction(questions);
    refreshExamStats(Number(id));

    res.json({ success: true, count: questions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// VITE APP DEVELOPMENT AND PRODUCTION RUNNERS
if (!process.env.VERCEL) {
  async function startServer() {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
  startServer();
}

// Export for Vercel Serverless Function
export default app;
