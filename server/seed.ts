import { getDb } from "./db";

export function seedIfEmpty(): void {
  const db = getDb();

  const userCount = (db.prepare("SELECT count(*) as count FROM users").get() as { count: number }).count;
  if (userCount === 0) {
    console.log("Seeding initial users...");
    const insert = db.prepare(
      "INSERT INTO users (username, password, role, fullName, email, guardianEmail) VALUES (?, ?, ?, ?, ?, ?)"
    );
    insert.run("admin", "admin", "guru", "Bpk. Wijaya", "guru@exampro.id", "");
    insert.run("budi", "budi123", "siswa", "Budi Santoso", "budi.santoso@siswa.id", "bapak.budi@gmail.com");
    insert.run("dina", "dina123", "siswa", "Dina Malika", "dina@siswa.id", "dina.wali@yahoo.com");
    insert.run("guntur", "guntur123", "siswa", "Guntur Pratama", "guntur.p@siswa.id", "guntur.ayah@gmail.com");
  }

  const examCount = (db.prepare("SELECT count(*) as count FROM exams").get() as { count: number }).count;
  if (examCount > 0) return;

  console.log("Seeding exams and questions...");
  const now = new Date().toISOString();

  // Seed Exam 1: 27 questions
  db.prepare(
    "INSERT INTO exams (id, title, description, duration, questionsCount, passingGrade, maxScore, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(1, "Ujian Standard Kompetensi Mandiri (27 Soal)", "Ujian komprehensif berisi 27 butir soal pilihan ganda.", 45, 27, 60, 95, now);

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
    { text: "Samudra terluas di permukaan planet Bumi kita adalah?", options: ["A. Samudra Atlantik", "B. Samudra Pasifik", "C. Samudra Hindia", "D. Samudra Arktik", "E. Samudra Antartika"], correct: "B", points: 3 },
  ];

  const insertQ = db.prepare(
    "INSERT INTO questions (examId, category, questionText, optionA, optionB, optionC, optionD, optionE, correctOption, scorePoints, orderNo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  questions1.forEach((q, i) => {
    insertQ.run(1, "Pengetahuan Umum", q.text, q.options[0], q.options[1], q.options[2], q.options[3], q.options[4], q.correct, q.points, i + 1);
  });

  // Seed Exam 2: 60 math questions
  db.prepare(
    "INSERT INTO exams (id, title, description, duration, questionsCount, passingGrade, maxScore, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(2, "Ujian Matematika & Logika Dasar (60 Soal)", "Ujian evaluasi logika dan perhitungan numerik cepat.", 60, 60, 60, 180, now);

  for (let i = 1; i <= 60; i++) {
    const term1 = i * 2 + 5;
    const term2 = i * 3 - 2;
    const correct = term1 + term2;
    insertQ.run(
      2, "Matematika",
      `Berapakah hasil dari operasi perhitungan matematika sederhana berikut: ${term1} + ${term2}? (Soal ke-${i})`,
      `A. ${correct}`, `B. ${correct - 3}`, `C. ${correct + 5}`, `D. ${correct - 7}`, `E. ${correct * 2}`,
      "A", 3, i
    );
  }

  // Seed sample submissions
  const insertSub = db.prepare(
    "INSERT INTO submissions (examId, studentName, studentEmail, guardianEmail, startedAt, submittedAt, score, maxScore, isPassed, answersJson, status, offlineSync) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  insertSub.run(1, "Budi Santoso", "budi.santoso@siswa.id", "bapak.budi@gmail.com", now, now, 78, 95, 1, JSON.stringify({ 1: "A", 2: "B", 3: "B", 4: "A", 5: "C", 6: "D", 7: "B" }), "completed", 0);
  insertSub.run(1, "Dina Malika", "dina@siswa.id", "dina.wali@yahoo.com", now, now, 52, 95, 0, JSON.stringify({ 1: "B", 2: "A", 3: "B", 4: "C", 5: "C" }), "completed", 0);
  insertSub.run(1, "Guntur Pratama", "guntur.p@siswa.id", "guntur.ayah@gmail.com", now, null, 0, 95, 0, JSON.stringify({ 1: "A", 2: "B" }), "ongoing", 0);

  console.log("Database seeded.");
}
