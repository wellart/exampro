import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  BarChart3,
  Download,
  UploadCloud,
  Mail,
  RefreshCw,
  PlusCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  FileText,
  Trash2,
  Lock,
  Search,
  ChevronRight,
  Eye
} from "lucide-react";
import { formatDate } from "../utils";

export default function TeacherDashboard() {
  const [exams, setExams] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [mailLogs, setMailLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"stats" | "submissions" | "import" | "emails" | "exams" | "questions" | "users">("stats");
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExamId, setSelectedExamId] = useState<string>("all");
  
  // Import states
  const [importJson, setImportJson] = useState("");
  const [importTitle, setImportTitle] = useState("");
  const [importDuration, setImportDuration] = useState("60");
  const [importPassGrade, setImportPassGrade] = useState("60");
  const [importStartDate, setImportStartDate] = useState("");
  const [importEndDate, setImportEndDate] = useState("");
  const [importStatus, setImportStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  // User Import State
  const [importUsersJson, setImportUsersJson] = useState("");
  const [importUsersStatus, setImportUsersStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });

  // Questions Bank Tab States
  const [manageExamId, setManageExamId] = useState<string>("");
  const [manageQuestions, setManageQuestions] = useState<any[]>([]);
  const [manageQuestionsLoading, setManageQuestionsLoading] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState<boolean>(false);
  
  // Single question form states
  const [newQCategory, setNewQCategory] = useState("Umum");
  const [newQText, setNewQText] = useState("");
  const [newQOptA, setNewQOptA] = useState("");
  const [newQOptB, setNewQOptB] = useState("");
  const [newQOptC, setNewQOptC] = useState("");
  const [newQOptD, setNewQOptD] = useState("");
  const [newQOptE, setNewQOptE] = useState("");
  const [newQCorrect, setNewQCorrect] = useState("A");
  const [newQPts, setNewQPts] = useState("4");

  const fetchManageQuestions = async (examId: string) => {
    if (!examId) {
      setManageQuestions([]);
      return;
    }
    setManageQuestionsLoading(true);
    try {
      const res = await fetch(`/api/exams/${examId}/questions`);
      if (res.ok) {
        const data = await res.json();
        setManageQuestions(data.questions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setManageQuestionsLoading(false);
    }
  };

  useEffect(() => {
    if (manageExamId) {
      fetchManageQuestions(manageExamId);
    }
  }, [manageExamId]);

  const handleDeleteQuestion = async (qId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus soal ini? Data nilai KKM akan disesuaikan otomatis di database SQLite.")) return;
    try {
      const res = await fetch(`/api/questions/${qId}`, { method: "DELETE" });
      if (res.ok) {
        fetchManageQuestions(manageExamId);
        setRefreshTrigger((prev) => !prev);
      } else {
        alert("Gagal menghapus soal.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion) return;
    try {
      const res = await fetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: editingQuestion.category || "Umum",
          questionText: editingQuestion.questionText,
          optionA: editingQuestion.optionA,
          optionB: editingQuestion.optionB,
          optionC: editingQuestion.optionC,
          optionD: editingQuestion.optionD,
          optionE: editingQuestion.optionE,
          correctOption: editingQuestion.correctOption.trim().toUpperCase(),
          scorePoints: Number(editingQuestion.scorePoints),
        }),
      });

      if (res.ok) {
        setEditingQuestion(null);
        fetchManageQuestions(manageExamId);
        setRefreshTrigger((prev) => !prev);
        alert("Soal berhasil diperbarui di database SQLite!");
      } else {
        const errData = await res.json();
        alert(`Gagal memperbarui soal: ${errData.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manageExamId) return;
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: Number(manageExamId),
          category: newQCategory,
          questionText: newQText,
          optionA: newQOptA,
          optionB: newQOptB,
          optionC: newQOptC,
          optionD: newQOptD,
          optionE: newQOptE,
          correctOption: newQCorrect,
          scorePoints: Number(newQPts),
        }),
      });

      if (res.ok) {
        setShowAddQuestionForm(false);
        setNewQCategory("Umum");
        setNewQText("");
        setNewQOptA("");
        setNewQOptB("");
        setNewQOptC("");
        setNewQOptD("");
        setNewQOptE("");
        setNewQCorrect("A");
        setNewQPts("4");
        fetchManageQuestions(manageExamId);
        setRefreshTrigger((prev) => !prev);
        alert("Soal baru berhasil ditambahkan!");
      } else {
        const errData = await res.json();
        alert(`Gagal membuat soal: ${errData.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic client-side CSV parser
  const parseCSV = (text: string) => {
    const lines: string[] = [];
    let row = [""];
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // skip next quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push("");
      } else if (char === ';' && !insideQuote) {
        row.push("");
      } else if (char === '\n' && !insideQuote) {
        lines.push(JSON.stringify(row));
        row = [""];
      } else if (char === '\r' && !insideQuote) {
        // skip carriage return
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(JSON.stringify(row));
    }
    
    if (lines.length < 2) return [];
    
    const parsedRows = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return [];
      }
    }).filter(r => r.length > 0);
    
    const headers = parsedRows[0].map((h: string) => h.toLowerCase().trim());
    
    // Find indices based on common header names
    const idxText = headers.findIndex((h: string) => h.includes("soal") || h.includes("question") || h.includes("text"));
    const idxA = headers.findIndex((h: string) => h === "a" || h.includes("pilihan a") || h.includes("option a") || h.includes("opt a"));
    const idxB = headers.findIndex((h: string) => h === "b" || h.includes("pilihan b") || h.includes("option b") || h.includes("opt b"));
    const idxC = headers.findIndex((h: string) => h === "c" || h.includes("pilihan c") || h.includes("option c") || h.includes("opt c"));
    const idxD = headers.findIndex((h: string) => h === "d" || h.includes("pilihan d") || h.includes("option d") || h.includes("opt d"));
    const idxE = headers.findIndex((h: string) => h === "e" || h.includes("pilihan e") || h.includes("option e") || h.includes("opt e"));
    const idxCorrect = headers.findIndex((h: string) => h.includes("kunci") || h.includes("jawaban") || h.includes("correct") || h.includes("answer") || h === "key" || h === "correctoption");
    const idxPoints = headers.findIndex((h: string) => h.includes("poin") || h.includes("score") || h.includes("points") || h === "points" || h === "scorepoints");
    
    const finalQuestions = [];
    for (let i = 1; i < parsedRows.length; i++) {
      const r = parsedRows[i];
      if (r.length < 3) continue;
      
      const questionText = idxText !== -1 ? r[idxText] : r[0];
      const optionA = idxA !== -1 ? r[idxA] : r[1] || "";
      const optionB = idxB !== -1 ? r[idxB] : r[2] || "";
      const optionC = idxC !== -1 ? r[idxC] : r[3] || "";
      const optionD = idxD !== -1 ? r[idxD] : r[4] || "";
      const optionE = idxE !== -1 ? r[idxE] : r[5] || "";
      const correctOption = idxCorrect !== -1 ? r[idxCorrect] : r[6] || "A";
      const scorePoints = idxPoints !== -1 ? parseInt(r[idxPoints]) || 4 : 4;
      
      if (questionText && optionA && optionB) {
        finalQuestions.push({
          questionText,
          optionA,
          optionB,
          optionC,
          optionD,
          optionE,
          correctOption: correctOption.toString().trim().toUpperCase().substring(0, 1),
          scorePoints
        });
      }
    }
    return finalQuestions;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const rawVal = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const cleanTitle = rawVal.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    setImportTitle(cleanTitle);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          setImportJson(JSON.stringify(parsed, null, 2));
          setImportStatus({ type: "success", message: `Berhasil menguraikan berkas JSON: "${file.name}".` });
        } catch {
          setImportStatus({ type: "error", message: "Gagal mengurai file JSON. Format JSON tidak valid." });
        }
      } else if (file.name.endsWith(".csv")) {
        try {
          const parsed = parseCSV(text);
          if (parsed.length === 0) {
            throw new Error("File CSV kosong atau kolom header tidak cocok.");
          }
          setImportJson(JSON.stringify(parsed, null, 2));
          setImportStatus({
            type: "success",
            message: `Excel/CSV berhasil terurai! Mengekstrak ${parsed.length} butir soal dari "${file.name}". Teks dump JSON telah diisi di bawah.`,
          });
        } catch (err: any) {
          setImportStatus({ type: "error", message: `Gagal membaca file CSV: ${err.message}` });
        }
      } else {
        setImportStatus({ type: "error", message: "Format tidak didukung. Harap gunakan ekspor .csv atau fail .json." });
      }
    };
    reader.readAsText(file);
  };

  // Custom Exam state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newExamTitle, setNewExamTitle] = useState("");
  const [newExamDesc, setNewExamDesc] = useState("");
  const [newExamDur, setNewExamDur] = useState("45");
  const [newExamPass, setNewExamPass] = useState("60");

  const [previewEmail, setPreviewEmail] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [examsRes, subsRes, mailRes, statsRes] = await Promise.all([
        fetch("/api/exams"),
        fetch("/api/submissions"),
        fetch("/api/mail-logs"),
        fetch("/api/dashboard/stats"),
      ]);

      if (examsRes.ok) setExams(await examsRes.json());
      if (subsRes.ok) setSubmissions(await subsRes.json());
      if (mailRes.ok) setMailLogs(await mailRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error("Gagal memuat status pengajar:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Live polling simulation to inspect student progress in real-time every 8 seconds
    const interval = setInterval(() => {
      loadData();
    }, 8000);

    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleDeleteExam = async (id: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus ujian ini beserta seluruh soal dan nilai siswa di dalamnya?")) return;
    try {
      const res = await fetch(`/api/exams/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRefreshTrigger((prev) => !prev);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCustomExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExamTitle) return;

    // Default seed 5 logic questions for customized exam to start with
    const defaultBatch = [
      { questionText: "Manakah ibukota negara Republik Indonesia?", optionA: "Jakarta", optionB: "Bandung", optionC: "Surabaya", optionD: "Medan", optionE: "Kalimantan", correctOption: "E", scorePoints: 20 },
      { questionText: "Hasil dari 12 x 12 adalah?", optionA: "124", optionB: "144", optionC: "134", optionD: "154", optionE: "244", correctOption: "B", scorePoints: 20 },
      { questionText: "Planet ketiga terdekat dari matahari adalah?", optionA: "Merkurius", optionB: "Venus", optionC: "Bumi", optionD: "Mars", optionE: "Jupiter", correctOption: "C", scorePoints: 20 },
      { questionText: "Benua terbesar di planet Bumi adalah?", optionA: "Asia", optionB: "Afrika", optionC: "Eropa", optionD: "Amerika", optionE: "Australia", correctOption: "A", scorePoints: 20 },
      { questionText: "Bahan penyusun utama kaca adalah?", optionA: "Pasir kuarsa", optionB: "Batu kapur", optionC: "Serat selulosa", optionD: "Besi baja", optionE: "Batubara", correctOption: "A", scorePoints: 20 }
    ];

    try {
      const res = await fetch("/api/exams/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newExamTitle,
          description: newExamDesc || "Ujian khusus buatan pengajar.",
          duration: Number(newExamDur),
          passingGrade: Number(newExamPass),
          questions: defaultBatch,
        }),
      });

      if (res.ok) {
        setShowCreateForm(false);
        setNewExamTitle("");
        setNewExamDesc("");
        setRefreshTrigger((prev) => !prev);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualTriggerMail = async (submissionId: number) => {
    try {
      const res = await fetch(`/api/submissions/${submissionId}/send-report`, {
        method: "POST",
      });
      if (res.ok) {
        alert("Rapor berhasil dikirim ulang ke alamat email wali murid secara instan.");
        setRefreshTrigger((prev) => !prev);
      }
    } catch {
      alert("Gagal memproses pengiriman rapor ulang.");
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportStatus({ type: null, message: "" });

    if (!importTitle) {
      setImportStatus({ type: "error", message: "Judul ujian wajib diisi." });
      return;
    }

    try {
      const parsedQuestions = JSON.parse(importJson);
      if (!Array.isArray(parsedQuestions) || parsedQuestions.length === 0) {
        throw new Error("Format isian JSON salah. Harus berupa list array minimal 1 soal.");
      }

      // Quick validate properties
      for (const q of parsedQuestions) {
        if (!q.questionText || !q.optionA || !q.optionB || !q.correctOption) {
          throw new Error("Setiap soal wajib memiliki properti questionText, optionA, optionB, dan correctOption (A/B/C/D/E).");
        }
      }

      const res = await fetch("/api/exams/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: importTitle,
          description: `Impor massal manual pada ${new Date().toLocaleDateString("id-ID")}`,
          duration: Number(importDuration),
          passingGrade: Number(importPassGrade),
          startDate: importStartDate || null,
          endDate: importEndDate || null,
          questions: parsedQuestions,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan ujian baru ke database SQLite.");
      }

      const outcome = await res.json();
      setImportStatus({
        type: "success",
        message: `Ujian "${outcome.title}" berhasil dibuat dengan ${outcome.questionsCount} butir soal pilihan ganda di SQLite.`,
      });
      setImportTitle("");
      setImportJson("");
      setRefreshTrigger((prev) => !prev);
    } catch (err: any) {
      setImportStatus({ type: "error", message: err.message });
    }
  };

  const handleImportUsersSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportUsersStatus({ type: null, message: "" });
    try {
      const parsedUsers = JSON.parse(importUsersJson);
      if (!Array.isArray(parsedUsers) || parsedUsers.length === 0) {
        throw new Error("Format input JSON salah. Harus berupa list array pengguna.");
      }
      for (const u of parsedUsers) {
        if (!u.username || !u.password || !u.fullName || !u.email) {
          throw new Error("Terdapat akun yang tidak memiliki properti username, password, fullName, atau email.");
        }
      }
      const res = await fetch("/api/users/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users: parsedUsers }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal membuat akun siswa massal.");
      }
      setImportUsersStatus({ type: "success", message: data.message });
      setImportUsersJson("");
    } catch (err: any) {
      setImportUsersStatus({ type: "error", message: err.message });
    }
  };

  const loadSampleUsersTemplate = () => {
    setImportUsersJson(
      JSON.stringify(
        [
          {
            username: "siswa01",
            password: "password123",
            role: "siswa",
            fullName: "Andi Susanto",
            email: "andi@sma1.id",
            guardianEmail: "ortu.andi@gmail.com"
          },
          {
            username: "siswa02",
            password: "password123",
            role: "siswa",
            fullName: "Budi Santoso",
            email: "budi@sma1.id",
            guardianEmail: ""
          }
        ],
        null,
        2
      )
    );
  };

  const parseUsersCSV = (text: string) => {
    const lines: string[] = [];
    let row = [""];
    let insideQuote = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          row[row.length - 1] += '"';
          i++; // skip next quote
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === ',' && !insideQuote) {
        row.push("");
      } else if (char === ';' && !insideQuote) {
        row.push("");
      } else if (char === '\n' && !insideQuote) {
        lines.push(JSON.stringify(row));
        row = [""];
      } else if (char === '\r' && !insideQuote) {
        // skip carriage return
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(JSON.stringify(row));
    }
    
    if (lines.length < 2) return [];
    
    const parsedRows = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return [];
      }
    }).filter(r => r.length > 0);
    
    const headers = parsedRows[0].map((h: string) => h.toLowerCase().trim());
    
    const idxUsername = headers.findIndex((h: string) => h === "username");
    const idxPassword = headers.findIndex((h: string) => h === "password");
    const idxFullName = headers.findIndex((h: string) => h === "fullname" || h === "nama" || h === "nama lengkap" || h === "name");
    const idxEmail = headers.findIndex((h: string) => h === "email");
    const idxRole = headers.findIndex((h: string) => h === "role" || h === "peran");
    const idxGuardianStr = headers.findIndex((h: string) => h.includes("guardian") || h.includes("wali") || h.includes("ortu"));
    
    const finalUsers = [];
    for (let i = 1; i < parsedRows.length; i++) {
      const r = parsedRows[i];
      if (r.length < 3) continue;
      
      const username = idxUsername !== -1 ? r[idxUsername] : r[0];
      const password = idxPassword !== -1 ? r[idxPassword] : r[1] || "";
      const fullName = idxFullName !== -1 ? r[idxFullName] : r[2] || "";
      const email = idxEmail !== -1 ? r[idxEmail] : r[3] || "";
      const role = idxRole !== -1 ? r[idxRole] : "siswa";
      const guardianEmail = idxGuardianStr !== -1 ? r[idxGuardianStr] : r[4] || "";
      
      if (username && password && email) {
        finalUsers.push({
          username,
          password,
          fullName,
          email,
          role,
          guardianEmail
        });
      }
    }
    return finalUsers;
  };

  const handleUsersFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          setImportUsersJson(JSON.stringify(parsed, null, 2));
          setImportUsersStatus({ type: "success", message: `Berhasil menguraikan JSON pengguna: "${file.name}".` });
        } catch {
          setImportUsersStatus({ type: "error", message: "Gagal mengurai file JSON." });
        }
      } else if (file.name.endsWith(".csv")) {
        try {
          const parsed = parseUsersCSV(text);
          if (parsed.length === 0) {
            throw new Error("File CSV kosong atau kolom header tidak cocok.");
          }
          setImportUsersJson(JSON.stringify(parsed, null, 2));
          setImportUsersStatus({
            type: "success",
            message: `Excel/CSV berhasil terurai! Mengekstrak ${parsed.length} data pengguna.`,
          });
        } catch (err: any) {
          setImportUsersStatus({ type: "error", message: `Gagal membaca file CSV: ${err.message}` });
        }
      } else {
        setImportUsersStatus({ type: "error", message: "Format tidak didukung. Harap gunakan ekspor .csv atau .json." });
      }
    };
    reader.readAsText(file);
  };

  const loadSampleQuestionsTemplate = () => {
    const sample = [
      {
        questionText: "Dari manakah makanan khas Rendang berasal?",
        optionA: "Yogyakarta",
        optionB: "Padang, Sumatera Barat",
        optionC: "Denpasar, Bali",
        optionD: "Medan, Sumatera Utara",
        optionE: "Surabaya",
        correctOption: "B",
        scorePoints: 10
      },
      {
        questionText: "Berapa jam bumi membutuhkan waktu waktu melakukan sekali rotasi?",
        optionA: "12 jam",
        optionB: "24 jam",
        optionC: "36 jam",
        optionD: "48 jam",
        optionE: "168 jam",
        correctOption: "B",
        scorePoints: 15
      },
      {
        questionText: "Nama danau vulkanik terbesar di Asia Tenggara yang terletak di pulau Sumatera adalah?",
        optionA: "Danau Toba",
        optionB: "Danau Singkarak",
        optionC: "Danau Maninjau",
        optionD: "Danau Poso",
        optionE: "Danau Sentani",
        correctOption: "A",
        scorePoints: 15
      }
    ];
    setImportJson(JSON.stringify(sample, null, 2));
    setImportTitle("Ujian Muatan Lokal Keanekaragaman Wisata");
  };

  // Filtering Logic
  const filteredSubmissions = submissions.filter((sub) => {
    const matchesSearch =
      sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.studentEmail.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesExam = selectedExamId === "all" || sub.examId === Number(selectedExamId);
    return matchesSearch && matchesExam;
  });

  return (
    <div className="space-y-4 animate-fade-in no-print text-xs">
      
      {/* 1. Header Overview Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 text-white p-4 rounded shadow-sm border border-slate-800">
        <div>
          <h1 className="text-base font-bold tracking-tight uppercase">KONTROL PANEL PROKTOR</h1>
          <p className="text-[10px] text-slate-400 mt-0.5 leading-none">
            Analisis real-time, audit rapor otomatis, dan manipulasi database ujian SQLite.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setRefreshTrigger((prev) => !prev)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded transition cursor-pointer border border-slate-700"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Sinkron Real-time
          </button>
          
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded transition cursor-pointer border border-blue-500"
          >
            <PlusCircle className="w-3 h-3" />
            Buat Ujian Baru
          </button>
        </div>
      </div>

      {/* Quick Custom Exam Form Modal */}
      {showCreateForm && (
        <form onSubmit={handleCreateCustomExam} className="p-4 bg-blue-50/40 border border-blue-200 rounded gap-3 space-y-2.5">
          <h3 className="font-bold text-blue-900 text-xs">Formulir Pembuatan Ujian Khusus (Instant SQLite Setup)</h3>
          <div className="grid md:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-700 mb-1">Mata Pelajaran (Judul)</label>
              <input
                type="text"
                required
                placeholder="cth: Biologi SMA Kelas XII"
                value={newExamTitle}
                onChange={(e) => setNewExamTitle(e.target.value)}
                className="w-full text-xs p-2 border border-blue-200 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-700 mb-1">Deskripsi Ringkas</label>
              <input
                type="text"
                placeholder="cth: Bab Fotosintesis"
                value={newExamDesc}
                onChange={(e) => setNewExamDesc(e.target.value)}
                className="w-full text-xs p-2 border border-blue-200 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-700 mb-1">Durasi (Menit)</label>
              <input
                type="number"
                min="5"
                value={newExamDur}
                onChange={(e) => setNewExamDur(e.target.value)}
                className="w-full text-xs p-2 border border-blue-200 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-700 mb-1">Kelulusan (Passing Grade)</label>
              <input
                type="number"
                min="10"
                value={newExamPass}
                onChange={(e) => setNewExamPass(e.target.value)}
                className="w-full text-xs p-2 border border-blue-200 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-2.5 py-1 border border-slate-300 rounded text-slate-600 text-[11px] font-bold hover:bg-slate-50 cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-blue-600 text-white text-[11px] font-bold rounded hover:bg-blue-700 cursor-pointer"
            >
              Simpan & Hubungkan SQLite
            </button>
          </div>
          <p className="text-[9px] text-blue-700 italic">
            *Catatan: Sistem akan menyertakan 5 butir soal logika matematika standar pembuka secara otomatis pada ujian baru ini.
          </p>
        </form>
      )}

      {/* 2. Bento Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <BookOpen className="w-5 h-5 text-blue-500 shrink-0" />
          <div>
            <span className="text-slate-450 font-bold text-[9px] uppercase block leading-none">TOTAL EXAM</span>
            <span className="text-lg font-black text-slate-900 block mt-1">{exams.length}</span>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <Users className="w-5 h-5 text-indigo-500 shrink-0" />
          <div>
            <span className="text-slate-450 font-bold text-[9px] uppercase block leading-none">PARTISIPAN SELESAI</span>
            <span className="text-lg font-black text-slate-900 block mt-1">
              {submissions.filter((s) => s.status === "completed").length}
            </span>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <span className="text-slate-450 font-bold text-[9px] uppercase block leading-none">KELULUSAN RATA2</span>
            <span className="text-lg font-black text-slate-900 block mt-1">
              {submissions.filter((s) => s.status === "completed").length > 0
                ? `${Math.round(
                    (submissions.filter((s) => s.status === "completed" && s.isPassed).length /
                      submissions.filter((s) => s.status === "completed").length) *
                      100
                  )}%`
                : "0%"}
            </span>
          </div>
        </div>
        <div className="bg-white p-3.5 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <Mail className="w-5 h-5 text-amber-500 shrink-0" />
          <div>
            <span className="text-slate-450 font-bold text-[9px] uppercase block leading-none">EMAIL TERKIRIM</span>
            <span className="text-lg font-black text-slate-900 block mt-1">
              {mailLogs.filter((m) => m.status === "Delivered").length}
            </span>
          </div>
        </div>
      </div>

      {/* Main Layout: Sidebar & Content */}
      <div className="flex flex-col md:flex-row gap-6 mt-6 items-start">
        
        {/* 3. Sidebar Navigation Tabs */}
        <div className="w-full md:w-64 shrink-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <h3 className="font-black text-slate-800 text-sm">Navigasi Utama</h3>
          </div>
          <nav className="flex flex-col p-2 space-y-1">
            <button
              onClick={() => setActiveTab("stats")}
              className={`w-full flex items-center px-4 py-3 text-xs md:text-sm font-bold rounded-lg transition ${
                activeTab === "stats"
                  ? "bg-blue-50 text-blue-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-md"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analisis Kompetensi
            </button>
            <button
              onClick={() => setActiveTab("submissions")}
              className={`w-full flex items-center px-4 py-3 text-xs md:text-sm font-bold rounded-lg transition ${
                activeTab === "submissions"
                  ? "bg-blue-50 text-blue-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-md"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Pemantauan Waktu Nyata
            </button>
            <button
              onClick={() => setActiveTab("import")}
              className={`w-full flex items-center px-4 py-3 text-xs md:text-sm font-bold rounded-lg transition ${
                activeTab === "import"
                  ? "bg-blue-50 text-blue-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-md"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Impor Soal Baru
            </button>
            <button
              onClick={() => setActiveTab("emails")}
              className={`w-full flex items-center px-4 py-3 text-xs md:text-sm font-bold rounded-lg transition ${
                activeTab === "emails"
                  ? "bg-blue-50 text-blue-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-md"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Outbox Rapor ({mailLogs.length})
            </button>
            <button
              onClick={() => setActiveTab("exams")}
              className={`w-full flex items-center px-4 py-3 text-xs md:text-sm font-bold rounded-lg transition ${
                activeTab === "exams"
                  ? "bg-blue-50 text-blue-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-md"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Lock className="w-4 h-4 mr-2" />
              Katalog Ujian
            </button>
            <button
              onClick={() => {
                setActiveTab("questions");
                if (!manageExamId && exams.length > 0) {
                  setManageExamId(exams[0].id.toString());
                }
              }}
              className={`w-full flex items-center px-4 py-3 text-xs md:text-sm font-bold rounded-lg transition ${
                activeTab === "questions"
                  ? "bg-blue-50 text-blue-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-md"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Kelola Bank Soal
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center px-4 py-3 text-xs md:text-sm font-bold rounded-lg transition ${
                activeTab === "users"
                  ? "bg-blue-50 text-blue-700 relative before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-blue-600 before:rounded-r-md"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Kelola Pengguna Baru
            </button>
          </nav>
        </div>

        {/* 4. Tab Contents */}
        <div className="flex-1 min-w-0">
          {/* TAB 1: ANALISIS NILAI OTOMATIS */}
          {activeTab === "stats" && (
        <div className="space-y-6">
          {stats.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-xl border text-slate-400">
              Belum ada data pengerjaan ujian untuk dianalisis.
            </div>
          ) : (
            stats.map((examStat) => (
              <div key={examStat.examId} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{examStat.examTitle}</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Jumlah: {examStat.questionsCount} Butir Soal &bull; Max Score: {examStat.maxScore} Poin &bull; Passing KKM: {examStat.passingGrade}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-slate-600 mr-2">Siswa Diuji: <strong>{examStat.totalParticipants} orang</strong></span>
                    <a
                      href={`/api/exams/${examStat.examId}/export`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                      title="Ekspor sejarah nilai ini ke Microsoft Excel / CSV"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      Ekspor Excel
                    </a>
                  </div>
                </div>

                {examStat.totalParticipants === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Belum ada siswa yang merampungkan ujian ini. Data statistik akademis akan muncul secara instan setelah siswa klik Selesai.
                  </div>
                ) : (
                  <div className="p-6 space-y-6">
                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-50 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nilai Rata-Rata</span>
                        <p className="text-2xl font-black text-blue-600">{examStat.averageScore}</p>
                        <span className="text-[9px] text-slate-400">Perolehan poin Kelas</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nilai Tertinggi</span>
                        <p className="text-2xl font-black text-emerald-600">{examStat.highestScore}</p>
                        <span className="text-[9px] text-slate-400">Skor maksimum duga</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Persentase Lulus</span>
                        <p className="text-2xl font-black text-indigo-600">{examStat.passingPercentage}%</p>
                        <span className="text-[9px] text-slate-400">{examStat.passingCount} dari {examStat.totalParticipants} lulus</span>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl text-center space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Distribusi Mutu</span>
                        <div className="flex justify-center gap-2 text-xs font-bold pt-1.5">
                          <span className="text-emerald-600" title="Skor >=85%">A:{examStat.gradeDistribution.A}</span>
                          <span className="text-blue-600" title="Skor 70-84%">B:{examStat.gradeDistribution.B}</span>
                          <span className="text-amber-600" title="Skor 60-69%">C:{examStat.gradeDistribution.C}</span>
                          <span className="text-rose-600" title="Skor <60%">D:{examStat.gradeDistribution.D}</span>
                        </div>
                      </div>
                    </div>

                    {/* Question Specific Success Rates (Automatic Analysis highlights) */}
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-600 mb-3 tracking-wide">
                        Indeks Kerawanan Kelulusan per Soal (Diagnostic Analysis)
                      </h4>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {examStat.questionStats.slice(0, 8).map((q: any, i: number) => {
                          const rate = q.successRate;
                          let barColor = "bg-emerald-500";
                          let textStyle = "text-emerald-700";
                          if (rate < 40) {
                            barColor = "bg-rose-500 animate-pulse";
                            textStyle = "text-rose-700";
                          } else if (rate < 70) {
                            barColor = "bg-amber-500";
                            textStyle = "text-amber-700";
                          }

                          return (
                            <div key={q.questionId} className="p-3 border border-slate-100 rounded-xl hover:border-slate-200 transition space-y-2">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Soal {i + 1}</span>
                                <span className={`text-[11px] font-bold ${textStyle}`}>{rate}% Benar</span>
                              </div>
                              <p className="text-xs text-slate-700 font-medium line-clamp-2" title={q.questionText}>
                                {q.questionText}
                              </p>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${barColor}`} style={{ width: `${rate}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-slate-400 italic text-right mt-2">
                        *Warna merah berkedip mengindikasikan bab soal tertentu yang memiliki tingkat keberhasilan siswa di bawah 40% (Butuh Remidi).
                      </p>
                    </div>

                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: PEMANTAUAN PROGRES NILAI SISWA REAL-TIME */}
      {activeTab === "submissions" && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3 justify-between items-center">
            
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <div className="relative w-full sm:w-60">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari siswa atau email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="text-xs border border-slate-200 bg-slate-50 p-2 rounded-xl"
              >
                <option value="all">Semua Mata Pelajaran</option>
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.title}</option>
                ))}
              </select>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Menampilkan {filteredSubmissions.length} baris
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="p-4">Siswa / Email</th>
                    <th className="p-4">Mata Pelajaran</th>
                    <th className="p-4">Tanggal / Waktu</th>
                    <th className="p-4">Skor Diperoleh</th>
                    <th className="p-4">Kelulusan</th>
                    <th className="p-4 text-center">Aksi / Rapor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubmissions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400">
                        Tidak ada catatan pengerjaan nilai siswa yang sesuai kriteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSubmissions.map((sub) => {
                      const pct = Math.round((sub.score / sub.maxScore) * 100);
                      return (
                        <tr key={sub.id} className="hover:bg-slate-50/45 transition">
                          <td className="p-4">
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              {sub.studentName}
                              {sub.offlineSync && (
                                <span className="text-[8px] bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                  Sync Offline
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 font-mono text-[10px] mt-0.5">{sub.studentEmail}</div>
                          </td>
                          <td className="p-4 font-semibold text-slate-700">{sub.examTitle}</td>
                          <td className="p-4 text-slate-500">{formatDate(sub.submittedAt)}</td>
                          <td className="p-4 text-slate-800">
                            <strong>{sub.score}</strong> / {sub.maxScore} Poin
                            <span className="text-[10px] text-slate-400 block mt-0.5">Akurasi {pct}%</span>
                          </td>
                          <td className="p-4">
                            {sub.isPassed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 max-w-max uppercase">
                                Lulus
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-50 text-rose-600 border border-rose-100 max-w-max uppercase">
                                Tidak Lulus
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex gap-1.5 justify-center">
                              <button
                                onClick={() => handleManualTriggerMail(sub.id)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 cursor-pointer"
                                title="Paksa kirim ulang digital report ke wali murid"
                              >
                                Kirim Rapor
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMPOR MASSAL DARI CSV, EXCEL ATAU JSON */}
      {activeTab === "import" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Halaman Pembuat Ujian Massal</h3>
              <p className="text-xs text-slate-500 mt-1">
                Gunakan editor input teks JSON prapraktis di bawah ini atau impor csv untuk membuat modul exam custom dengan bobot nilai fleksibel sesuai gambar acuan.
              </p>
            </div>

            {/* File Drag and Drop / Selector Panel for CSV or JSON */}
            <div className="p-4.5 bg-slate-55 border border-slate-200 rounded-xl space-y-3">
              <label className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Unggah Berkas Spreadsheet (.CSV atau .JSON)</label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3.5 file:py-1.5 file:px-3 file:rounded file:border file:border-slate-350 file:text-[10px] file:font-extrabold file:uppercase file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer"
                />
              </div>
              <p className="text-[9px] text-slate-450 leading-tight italic">
                *Tips Excel: Simpan lembar kerja Anda sebagai format Comma Separated (.csv) sebelum diunggah ke sini.
              </p>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Judul Ujian Baru *</label>
                  <input
                    type="text"
                    required
                    placeholder="cth: Ujian Harian Kimia Organik"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min="1"
                    value={importDuration}
                    onChange={(e) => setImportDuration(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Minimal Passing Grade Kelulusan</label>
                <input
                  type="number"
                  min="0"
                  value={importPassGrade}
                  onChange={(e) => setImportPassGrade(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Mulai (Opsional)</label>
                  <input
                    type="datetime-local"
                    value={importStartDate}
                    onChange={(e) => setImportStartDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tanggal Berakhir (Opsional)</label>
                  <input
                    type="datetime-local"
                    value={importEndDate}
                    onChange={(e) => setImportEndDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Susunan Array Soal (JSON format) *
                  </label>
                  <button
                    type="button"
                    onClick={loadSampleQuestionsTemplate}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    Gunakan Templat Sampel
                  </button>
                </div>
                <textarea
                  required
                  rows={8}
                  placeholder={`[\n  {\n    "questionText": "Siapakah...",\n    "optionA": "Opsi A",\n    "optionB": "Opsi B",\n    ...\n    "correctOption": "A",\n    "scorePoints": 4\n  }\n]`}
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  className="w-full text-xs p-2.5 font-mono border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none h-44"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5 shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                Validasi & Unggah ke SQLite
              </button>

              {importStatus.type && (
                <div
                  className={`p-3.5 rounded-lg text-xs font-semibold ${
                    importStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}
                >
                  {importStatus.message}
                </div>
              )}
            </form>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 font-sans uppercase">Panduan Impor Excel / CSV & JSON</h3>
            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <p>
                Aplikasi mendukung pembuatan paket ujian instan langsung dari berkas spreadsheet Anda. Buat lembar kerja di Microsoft Excel, Google Sheets, atau Numbers dengan kolom header berikut:
              </p>
              
              <div className="overflow-x-auto border border-slate-200 rounded-lg bg-slate-50 p-2.5 font-mono text-[9px] text-slate-705">
                <table className="min-w-full text-center divide-y divide-slate-200">
                  <thead>
                    <tr className="bg-slate-100 font-bold uppercase">
                      <th className="px-2 py-1 border border-slate-250">Soal / Question</th>
                      <th className="px-2 py-1 border border-slate-250">Pilihan A</th>
                      <th className="px-2 py-1 border border-slate-250">Pilihan B ... E</th>
                      <th className="px-2 py-1 border border-slate-250">Kunci / Answer</th>
                      <th className="px-2 py-1 border border-slate-250">Poin / Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="px-2 py-1 border border-slate-200 text-left truncate max-w-[120px]">Berapakah hasil 12x12?</td>
                      <td className="px-2 py-1 border border-slate-200">124</td>
                      <td className="px-2 py-1 border border-slate-200">144 (kolom B), dst</td>
                      <td className="px-2 py-1 border border-slate-200">B</td>
                      <td className="px-2 py-1 border border-slate-200">4</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-500">
                <li><strong>Kolom Header yang dikenali:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">Soal</code> (atau <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">questionText</code>), <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">Pilihan A</code> s/d <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">Pilihan E</code> (atau <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">optionA</code> s/d <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">optionE</code>), <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">Kunci</code> (atau <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">correctOption</code>), dan <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">Poin</code> (atau <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600">scorePoints</code>).</li>
                <li><strong>Bobot Nilai:</strong> Poin nilai (berupa angka) digunakan untuk menetapkan skor kompetensi per butir soal.</li>
                <li><strong>Opsi Pilihan:</strong> Kolom E opsional. Kunci jawaban berisi karakter tunggal opsi (A, B, C, D, atau E).</li>
              </ul>
              
              <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl space-y-2">
                <p className="font-extrabold text-blue-900 text-xs">Uji Coba dengan Templat Otomatis or Unduh Templat:</p>
                <p className="text-[11px] leading-relaxed">
                  Gunakan tombol biru <span className="font-bold text-blue-700">"Gunakan Templat Sampel"</span> di atas untuk memuat data pengujian default ke kotak editor secara instan sebelum mencoba mengunggah fail Anda sendiri.
                </p>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,Soal,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,Kunci,Poin\n\"Apa ibukota Indonesia?\",\"Jakarta\",\"Bandung\",\"Surabaya\",\"Medan\",\"Yogyakarta\",\"A\",4\n\"Siapakah penemu bola lampu?\",\"Albert Einstein\",\"Thomas Edison\",\"Nikola Tesla\",\"Isaac Newton\",\"Galileo\",\"B\",3";
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "template_bank_soal.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex text-[10px] items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 font-bold rounded-lg hover:bg-blue-200 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Templat CSV
                  </button>
                  <button
                    onClick={() => {
                      const csvContent = "data:application/vnd.ms-excel;charset=utf-8,Soal,Pilihan A,Pilihan B,Pilihan C,Pilihan D,Pilihan E,Kunci,Poin\n\"Apa ibukota Indonesia?\",\"Jakarta\",\"Bandung\",\"Surabaya\",\"Medan\",\"Yogyakarta\",\"A\",4";
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "template_bank_soal.xls");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex text-[10px] items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 font-bold rounded-lg hover:bg-green-200 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Templat Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ELECTRONIC MAIL RAPOR OUTBOX LOGS */}
      {activeTab === "emails" && (
        <div className="space-y-4">
          <div className="bg-white p-4.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Daftar Antrean Surat Keluar Digital (Email Outbox Queue)</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Semua rapor elektronik otomatis yang terkirim ke email orang tua wali murid diarsip permanen di sini.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
              {mailLogs.length} Terkirim
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase">
                    <th className="p-3.5">Wali Murid / Inbox</th>
                    <th className="p-3.5">Judul Subjek Rapor</th>
                    <th className="p-3.5">Dispatch Waktu</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mailLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Belum ada arsip rapor digital terkirim di outbox.
                      </td>
                    </tr>
                  ) : (
                    mailLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/40 transition">
                        <td className="p-3.5">
                          <span className="font-bold text-slate-800">{log.recipient}</span>
                        </td>
                        <td className="p-3.5 font-medium text-slate-600 line-clamp-1 mt-2">{log.subject}</td>
                        <td className="p-3.5 text-slate-400">{formatDate(log.sentAt)}</td>
                        <td className="p-3.5 text-center">
                          <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black rounded-full uppercase">
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <button
                            onClick={() => setPreviewEmail(log)}
                            className="p-1 text-blue-600 hover:text-blue-800 hover:bg-slate-100 rounded cursor-pointer"
                            title="Buka Pratinjau Desain Surat"
                          >
                            <ChevronRight className="w-4 h-4 ml-auto mr-auto" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Email Canvas Previewer */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner flex flex-col justify-between">
              {previewEmail ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="border-b pb-3 border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">PENGIRIM: POSTMASTER_DAK_SERVER</span>
                    <span className="text-xs font-bold text-slate-700 block mt-1">Siswa: {previewEmail.recipient}</span>
                    <span className="text-xs text-slate-500 block">Subjek: {previewEmail.subject}</span>
                  </div>

                  {/* HTML Box */}
                  <div 
                    className="flex-1 overflow-y-auto max-h-[290px] border border-slate-200 rounded-xl bg-white p-4.5 text-[11px] scale-95 origin-top"
                    dangerouslySetInnerHTML={{ __html: previewEmail.bodyHtml }}
                  />

                  <div className="pt-2">
                    <button
                      onClick={() => setPreviewEmail(null)}
                      className="w-full text-center text-[10px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      Buka Tutup Pratinjau
                    </button>
                  </div>
                </div>
              ) : (
                <div className="my-auto text-center space-y-2 py-12">
                  <Eye className="w-7 h-7 text-slate-300 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Pratinjau Rapor Terkirim</p>
                  <p className="text-[10px] text-slate-400 max-w-[170px] mx-auto">
                    Klik tombol anak panah pada baris outbox email untuk meninjau secara langsung layout HTML digital report card yang diterima wali murid.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: KATALOG ENKRIPSI EXAM */}
      {activeTab === "exams" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800">Sistem Keamanan Soal & Kunci</h3>
              <p className="text-xs text-slate-500 mt-1">
                Data ujian diamankan menggunakan sistem filtrasi server-side dan enkripsi dinamis reversed-base64 pada lalu lintas jaringan.
              </p>
            </div>

            <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
              <div className="border border-slate-100 p-4.5 rounded-xl space-y-2 bg-slate-50/50">
                <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5 leading-none">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  Perlindungan Kebocoran Ujian Aktif:
                </h4>
                <ul className="list-disc pl-4 space-y-1 text-slate-500">
                  <li><strong>Filtrasi Kunci Jawaban:</strong> Pertanyaan dikirim tanpa data 'correctOption' sehingga inspeksi data JSON di peramban siswa tidak menghasilkan bocoran konten.</li>
                  <li><strong>Enkripsi Transportasi Data:</strong> Seluruh butir teks pertanyaan dan lembar opsi dikonversi dalam format reversed base64 string saat mengalir di jaringan internet.</li>
                  <li><strong>Anti-Snooping lokal:</strong> Skrip ditiadakan dari akses direct-eval, menjamin kerahasiaan murni.</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800">Manajemen Ujian Kunci SQLite</h3>
            <div className="divide-y divide-slate-100">
              {exams.map((exam) => (
                <div key={exam.id} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block text-xs md:text-sm">{exam.title}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Durasi: {exam.duration} Menit &bull; {exam.questionsCount} Soal &bull; ID: SQLT-0{exam.id}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDeleteExam(exam.id)}
                      className="p-1 px-2 border hover:bg-rose-50 text-rose-500 hover:text-rose-700 hover:border-rose-200 rounded border-slate-200 cursor-pointer"
                      title="Hapus Ujian Permanen dari Database"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: KELOLA BANK SOAL (CRUD) */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-105 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 border-slate-100">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-tight">Manajemen Soal & Rubrik Ujian (SQLite)</h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih paket ujian, edit pertanyaan, tambahkan soal baru, atau hapus butir pertanyaan secara real-time.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={manageExamId}
                  onChange={(e) => {
                    setManageExamId(e.target.value);
                    setEditingQuestion(null);
                    setShowAddQuestionForm(false);
                  }}
                  className="text-xs p-2 border border-slate-350 bg-white rounded-lg focus:outline-none focus:border-blue-500 font-bold text-slate-700"
                >
                  <option value="">-- Pilih Paket Ujian --</option>
                  {exams.map((exam) => (
                    <option key={exam.id} value={exam.id.toString()}>
                      {exam.title} ({exam.questionsCount} Soal)
                    </option>
                  ))}
                </select>

                {manageExamId && (
                  <button
                    onClick={() => {
                      setShowAddQuestionForm(!showAddQuestionForm);
                      setEditingQuestion(null);
                    }}
                    className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Tambah Soal
                  </button>
                )}
              </div>
            </div>

            {/* FORM TAMBAH SOAL BARU */}
            {showAddQuestionForm && manageExamId && (
              <form onSubmit={handleCreateQuestionSubmit} className="bg-slate-50 p-5 rounded-xl border border-slate-200 mt-3 space-y-4 animate-fade-in text-slate-700">
                <div className="flex items-center justify-between border-b pb-2 border-slate-200">
                  <span className="font-extrabold text-slate-800 text-xs">TAMBAH SOAL BARU KE EXAM</span>
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionForm(false)}
                    className="text-slate-400 hover:text-slate-700 font-extrabold text-xs"
                  >
                    TUTUP [X]
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_2fr] gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kategori *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Matematika, IPA"
                        value={newQCategory}
                        onChange={(e) => setNewQCategory(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Teks Pertanyaan *</label>
                      <textarea
                        required
                        placeholder="Masukkan pertanyaan baru di sini..."
                        value={newQText}
                        onChange={(e) => setNewQText(e.target.value)}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Pilihan A *</label>
                      <input
                        type="text"
                        required
                        placeholder="Alternatif jawaban A"
                        value={newQOptA}
                        onChange={(e) => setNewQOptA(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Pilihan B *</label>
                      <input
                        type="text"
                        required
                        placeholder="Alternatif jawaban B"
                        value={newQOptB}
                        onChange={(e) => setNewQOptB(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Pilihan C *</label>
                      <input
                        type="text"
                        required
                        placeholder="Alternatif jawaban C"
                        value={newQOptC}
                        onChange={(e) => setNewQOptC(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Pilihan D *</label>
                      <input
                        type="text"
                        required
                        placeholder="Alternatif jawaban D"
                        value={newQOptD}
                        onChange={(e) => setNewQOptD(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Pilihan E</label>
                      <input
                        type="text"
                        placeholder="Alternatif Opsi E (Opsional jika hanya 4 pilihan)"
                        value={newQOptE}
                        onChange={(e) => setNewQOptE(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kunci Jawaban</label>
                        <select
                          value={newQCorrect}
                          onChange={(e) => setNewQCorrect(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white focus:outline-none"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="E">E</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Bobot Poin</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={newQPts}
                          onChange={(e) => setNewQPts(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddQuestionForm(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Simpan Soal Baru
                  </button>
                </div>
              </form>
            )}

            {/* FORM UBAH SOAL SEBUTAN (EDITING) */}
            {editingQuestion && manageExamId && (
              <form onSubmit={handleUpdateQuestionSubmit} className="bg-lime-50/50 p-5 rounded-xl border border-lime-200 mt-3 space-y-4 animate-fade-in text-slate-700">
                <div className="flex items-center justify-between border-b pb-2 border-lime-200">
                  <span className="font-extrabold text-lime-800 text-xs">UBAH SOAL - ID: SQLT-0{editingQuestion.id}</span>
                  <button
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="text-slate-400 hover:text-slate-700 font-extrabold text-xs"
                  >
                    BATAL [X]
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-[1fr_2fr] gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kategori *</label>
                      <input
                        type="text"
                        required
                        value={editingQuestion.category || "Umum"}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, category: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-350 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Teks Pertanyaan *</label>
                      <textarea
                        required
                        value={editingQuestion.questionText}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, questionText: e.target.value })}
                        className="w-full text-xs p-2.5 border border-slate-350 rounded-lg bg-white"
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Jawaban A *</label>
                      <input
                        type="text"
                        required
                        value={editingQuestion.optionA}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, optionA: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-350 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Jawaban B *</label>
                      <input
                        type="text"
                        required
                        value={editingQuestion.optionB}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, optionB: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-350 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Jawaban C *</label>
                      <input
                        type="text"
                        required
                        value={editingQuestion.optionC}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, optionC: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-350 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Jawaban D *</label>
                      <input
                        type="text"
                        required
                        value={editingQuestion.optionD}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, optionD: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-350 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Opsi Jawaban E</label>
                      <input
                        type="text"
                        value={editingQuestion.optionE || ""}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, optionE: e.target.value })}
                        className="w-full text-xs p-2 border border-slate-350 rounded-lg bg-white"
                        placeholder="Opsi E (Opsional)"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kunci Jawaban</label>
                        <select
                          value={editingQuestion.correctOption}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, correctOption: e.target.value })}
                          className="w-full text-xs p-2 border border-slate-350 rounded-lg bg-white focus:outline-none"
                        >
                          <option value="A">A</option>
                          <option value="B">B</option>
                          <option value="C">C</option>
                          <option value="D">D</option>
                          <option value="E">E</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Bobot Skor</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={editingQuestion.scorePoints}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, scorePoints: e.target.value })}
                          className="w-full text-xs p-2 border border-slate-350 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingQuestion(null)}
                    className="px-4 py-2 border border-lime-300 text-lime-850 hover:bg-lime-100 text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            )}

            {/* TABEL DAFTAR SOAL PAKET */}
            {!manageExamId ? (
              <div className="text-center py-12 text-slate-400 font-sans">
                Silakan pilih paket ujian untuk melihat dan merubah butir-butir soal.
              </div>
            ) : manageQuestionsLoading ? (
              <div className="text-center py-12 text-slate-500 flex items-center justify-center gap-1.5 font-sans">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />
                Memuat butir pertanyaan ujian...
              </div>
            ) : manageQuestions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-sans bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                Paket ujian ini belum memiliki soal. Klik tombol "Tambah Soal" di atas untuk menambahkan.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-xl overflow-x-auto mt-2">
                <table className="min-w-full text-xs divide-y divide-slate-100">
                  <thead className="bg-slate-50 font-bold text-slate-650 uppercase">
                    <tr>
                      <th className="p-4 text-center w-12">No</th>
                      <th className="p-4 text-left min-w-[300px]">Butir Soal (Pertanyaan & Opsi)</th>
                      <th className="p-4 text-center w-16 text-emerald-800">Kunci</th>
                      <th className="p-4 text-center w-16">Poin</th>
                      <th className="p-4 text-center w-28">Opsi Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {manageQuestions.map((q, idx) => (
                      <tr key={q.id} className="hover:bg-slate-50">
                        <td className="p-4 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-4 space-y-1.5 leading-relaxed">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wider border border-slate-200">
                              {q.category || "Umum"}
                            </span>
                          </div>
                          <p className="font-extrabold text-slate-800 text-xs">{q.questionText}</p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-500 font-medium">
                            <span>A. {q.optionA}</span>
                            <span>B. {q.optionB}</span>
                            {q.optionC && <span>C. {q.optionC}</span>}
                            {q.optionD && <span>D. {q.optionD}</span>}
                            {q.optionE && <span>E. {q.optionE}</span>}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="inline-block bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold px-1.5 py-0.5 rounded uppercase text-[10px]">
                            {q.correctOption}
                          </span>
                        </td>
                        <td className="p-4 text-center font-black text-slate-705">{q.scorePoints}</td>
                        <td className="p-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => {
                                setEditingQuestion(q);
                                setShowAddQuestionForm(false);
                              }}
                              className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 hover:border-blue-150 border rounded text-[10px] font-bold cursor-pointer transition border-slate-200"
                            >
                              Ubah
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              className="px-2 py-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 hover:border-rose-200 border rounded border-slate-205 text-[10px] font-bold cursor-pointer transition"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: KELOLA PENGGUNA BARU */}
      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center">
            <h2 className="text-xl font-black mb-4 items-center gap-2 flex text-slate-800">
              <Users className="w-5 h-5" />
              Impor Massal Pengguna / Siswa (Excel/CSV/JSON)
            </h2>
            <form onSubmit={handleImportUsersSubmit} className="w-full max-w-3xl space-y-4">
              <div className="bg-blue-50/50 p-4 border border-blue-100 rounded-xl space-y-3">
                <p className="font-extrabold text-blue-900 text-xs">Instruksi: Unggah langsung file atau gunakan Data JSON</p>
                <div className="flex gap-2 items-center flex-wrap">
                  <input
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleUsersFileChange}
                    className="flex-1 text-[11px] font-mono file:bg-white file:border file:border-slate-300 file:-ml-2 file:-my-1 file:-mr-2 file:px-3 file:py-1 file:rounded file:text-xs file:font-bold file:text-slate-700 bg-white border border-slate-200 border-dashed p-1.5 focus:outline-none"
                  />
                  <span className="font-bold text-[10px] text-slate-400">ATAU</span>
                  <button
                    type="button"
                    onClick={loadSampleUsersTemplate}
                    className="text-[10px] items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 font-bold rounded-lg hover:bg-blue-50 transition drop-shadow-sm flex"
                  >
                    Load JSON Sampel
                  </button>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const csvContent = "data:text/csv;charset=utf-8,Username,Password,FullName,Email,Role,GuardianEmail\n\"siswa001\",\"pass123\",\"Siswa Satu\",\"siswa1@sekolah.id\",\"siswa\",\"ortu1@gmail.com\"\n\"siswa002\",\"pass123\",\"Siswa Dua\",\"siswa2@sekolah.id\",\"siswa\",\"\"";
                      const encodedUri = encodeURI(csvContent);
                      const link = document.createElement("a");
                      link.setAttribute("href", encodedUri);
                      link.setAttribute("download", "template_pengguna.csv");
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="flex text-[10px] items-center gap-1 px-3 py-1 bg-white border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Unduh Templat Pengguna CSV
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Verifikasi Data Pengguna (JSON) *
                </label>
                <textarea
                  required
                  rows={10}
                  className="w-full text-xs p-2.5 font-mono border border-slate-200 rounded-xl bg-slate-50"
                  value={importUsersJson}
                  onChange={(e) => setImportUsersJson(e.target.value)}
                  placeholder={`[\n  {\n    "username": "siswa1",\n    "password": "pass",\n    "fullName": "Siswa Pertama",\n    "email": "siswa1@test.com",\n    "role": "siswa"\n  }\n]`}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex justify-center items-center gap-1.5 shadow-sm"
              >
                <UploadCloud className="w-4 h-4" />
                Daftarkan Pengguna Secara Massal
              </button>

              {importUsersStatus.type && (
                <div
                  className={`p-3.5 rounded-lg text-xs font-semibold ${
                    importUsersStatus.type === "success"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}
                >
                  {importUsersStatus.message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
