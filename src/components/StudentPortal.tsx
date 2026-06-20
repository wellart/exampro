import React, { useState, useEffect, useRef } from "react";
import { Play, Clipboard, BookOpen, AlertCircle, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Clock, Check, Lock } from "lucide-react";
import { decryptText } from "../utils";

interface StudentPortalProps {
  onExamCompleted: (submissionId: number) => void;
  syncTrigger: boolean;
  setSyncTrigger: React.Dispatch<React.SetStateAction<boolean>>;
  user?: any;
}

export default function StudentPortal({ onExamCompleted, syncTrigger, setSyncTrigger, user }: StudentPortalProps) {
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [studentName, setStudentName] = useState(user?.fullName || "");
  const [studentEmail, setStudentEmail] = useState(user?.email || "");
  const [guardianEmail, setGuardianEmail] = useState(user?.guardianEmail || "");
  const [selectedExamId, setSelectedExamId] = useState("");

  useEffect(() => {
    if (user) {
      setStudentName(user.fullName || "");
      setStudentEmail(user.email || "");
      setGuardianEmail(user.guardianEmail || "");
    }
  }, [user]);
  
  // Active Exam State
  const [isExamActive, setIsExamActive] = useState(false);
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(0); // 0-indexed page number
  const questionsPerPage = 5;

  // Connection State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Request browser Notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/exams");
      if (!res.ok) throw new Error("Gagal mengambil daftar ujian.");
      const list = await res.json();
      setExams(list);
      if (list.length > 0) {
        setSelectedExamId(list[0].id.toString());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // Recover active interrupted exams from localStorage in case of system crashes
  useEffect(() => {
    const cachedExamSession = localStorage.getItem("active_exam_session");
    if (cachedExamSession) {
      try {
        const parsed = JSON.parse(cachedExamSession);
        // Verify expiration
        const now = Date.now();
        const expiresAt = parsed.startedAtTimestamp + parsed.duration * 60 * 1000;
        
        if (now < expiresAt) {
          const remSec = Math.floor((expiresAt - now) / 1000);
          setStudentName(parsed.studentName);
          setStudentEmail(parsed.studentEmail);
          setGuardianEmail(parsed.guardianEmail);
          setActiveExam(parsed.exam);
          setQuestions(parsed.questions);
          setAnswers(parsed.answers || {});
          setTimeLeft(remSec);
          setCurrentPage(parsed.currentPage || 0);
          setIsExamActive(true);
          
          // Restart timer
          startTimerCountdown(remSec, parsed);
        } else {
          // Clear expired cache
          localStorage.removeItem("active_exam_session");
        }
      } catch (err) {
        localStorage.removeItem("active_exam_session");
      }
    }
  }, []);

  // Sync state mutations to local cache periodically so work is never lost
  const saveStateToLocalStorage = (currentAnswers: Record<number, string>, curPage: number) => {
    if (!isExamActive || !activeExam) return;
    try {
      const activeSession = {
        studentName,
        studentEmail,
        guardianEmail,
        exam: activeExam,
        questions,
        answers: currentAnswers,
        duration: activeExam.duration,
        startedAtTimestamp: Date.now() - (activeExam.duration * 60 - timeLeft) * 1000,
        currentPage: curPage
      };
      localStorage.setItem("active_exam_session", JSON.stringify(activeSession));
    } catch (e) {
      console.warn("Gagal menyimpan backup pengerjaan offline:", e);
    }
  };

  const handleStartExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/exams/${selectedExamId}/start`);
      if (!res.ok) {
        throw new Error("Gagal memuat daftar soal ujian aman.");
      }
      const data = await res.json();

      // De-scramble/Decrypt questions on the fly on-arrival to protect integrity!
      const decryptedQuestions = data.questions.map((q: any) => ({
        id: q.id,
        examId: q.examId,
        questionText: decryptText(q.questionText),
        optionA: decryptText(q.optionA),
        optionB: decryptText(q.optionB),
        optionC: decryptText(q.optionC),
        optionD: decryptText(q.optionD),
        optionE: decryptText(q.optionE),
        scorePoints: q.scorePoints,
        orderNo: q.orderNo,
      }));

      setActiveExam(data.exam);
      setQuestions(decryptedQuestions);
      setAnswers({});
      setIsExamActive(true);
      setTimeLeft(data.exam.duration * 60);
      setCurrentPage(0);

      // Cache start session configurations
      const initialSession = {
        studentName,
        studentEmail,
        guardianEmail,
        exam: data.exam,
        questions: decryptedQuestions,
        answers: {},
        duration: data.exam.duration,
        startedAtTimestamp: Date.now()
      };
      localStorage.setItem("active_exam_session", JSON.stringify(initialSession));

      startTimerCountdown(data.exam.duration * 60, initialSession);
    } catch (err: any) {
      alert(`Gagal memulai ujian: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const startTimerCountdown = (seconds: number, sessionObj: any) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    let rem = seconds;
    timerRef.current = setInterval(() => {
      rem -= 1;
      setTimeLeft(rem);
      
      if (rem <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleAutoSubmitOnTimeout(sessionObj);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSelectAnswer = (questionId: number, chosenOption: string) => {
    const updated = { ...answers, [questionId]: chosenOption };
    setAnswers(updated);
    saveStateToLocalStorage(updated, currentPage);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    saveStateToLocalStorage(answers, newPage);
  };

  // Submission handler (supports offline sync buffering natively)
  const handleSubmitExam = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setLoading(true);

    const submissionPayload = {
      examId: activeExam.id,
      studentName,
      studentEmail,
      guardianEmail,
      answers,
      startedAt: new Date(Date.now() - (activeExam.duration * 60 - timeLeft) * 1000).toISOString(),
    };

    // System Check: are we currently offline?
    if (!navigator.onLine) {
      // Buffer in localStorage pending outbox queue
      try {
        const queueRaw = localStorage.getItem("pending_offline_submissions");
        const queue = queueRaw ? JSON.parse(queueRaw) : [];
        queue.push(submissionPayload);
        localStorage.setItem("pending_offline_submissions", JSON.stringify(queue));
        
        // Trigger push notifications
        if (Notification.permission === "granted") {
          new Notification("Ujian Anda Berhasil Disimpan Offline", {
            body: "Koneksi internet tidak memadai. Jawaban disimpan lokal dan akan disinkronkan otomatis saat online kembali.",
            icon: "/favicon.ico",
          });
        }
        
        alert("Koneksi tidak stabil. Ujian telah selesai, lembar jawaban Anda berhasil disimpan secara aman di memori lokal. Sinkronisasi akan dijalankan otomatis sesaat setelah internet aktif.");
        cleanupExamSession();
        setSyncTrigger((prev) => !prev);
        // Force back to register/portal main screen
        setIsExamActive(false);
        setActiveExam(null);
        setQuestions([]);
        setAnswers({});
      } catch (e) {
        alert("Memori penyimpanan browser penuh, silakan hubungkan kembali ke internet.");
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await fetch(`/api/exams/${activeExam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayload),
      });

      if (!res.ok) {
        throw new Error("Gagal mengirim lembar jawaban ke server SQLite.");
      }

      const outcome = await res.json();
      
      // Trigger Browser System Push Notification - requirement fulfilled
      if (Notification.permission === "granted") {
        new Notification("Ujian Selesai Dikoreksi!", {
          body: `Halo ${studentName}! Anda meraih nilai/skor ${outcome.score} pada ujian online ${activeExam.title}.`,
          icon: "/favicon.ico",
        });
      }

      cleanupExamSession();
      // Directly transition client into Result Summary panel
      onExamCompleted(outcome.submissionId);
    } catch (err: any) {
      alert(`Terjadi kesalahan sistem pengiriman: ${err.message}. Soal Anda dicadangkan offline.`);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSubmitOnTimeout = async (session?: any) => {
    const backupSess = session || JSON.parse(localStorage.getItem("active_exam_session") || "{}");
    if (!backupSess.exam) return;

    const payload = {
      examId: backupSess.exam.id,
      studentName: backupSess.studentName,
      studentEmail: backupSess.studentEmail,
      guardianEmail: backupSess.guardianEmail,
      answers: backupSess.answers || {},
      startedAt: new Date(backupSess.startedAtTimestamp || Date.now()).toISOString(),
    };

    try {
      const res = await fetch(`/api/exams/${backupSess.exam.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        cleanupExamSession();
        onExamCompleted(result.submissionId);
      } else {
        throw new Error("Timeout submit failed");
      }
    } catch {
      // If auto-submit fails on timeout, buffer locally
      const queueRaw = localStorage.getItem("pending_offline_submissions");
      const queue = queueRaw ? JSON.parse(queueRaw) : [];
      queue.push(payload);
      localStorage.setItem("pending_offline_submissions", JSON.stringify(queue));
      cleanupExamSession();
      setSyncTrigger((prev) => !prev);
      alert("Waktu pengerjaan reguler telah habis! Jawaban Anda berhasil dikirim dan diarsipkan offline.");
      setIsExamActive(false);
    }
  };

  const cleanupExamSession = () => {
    localStorage.removeItem("active_exam_session");
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Pagination parameters
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIndex = currentPage * questionsPerPage;
  const pageQuestions = questions.slice(startIndex, startIndex + questionsPerPage);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const isLowTime = timeLeft <= 300 && timeLeft > 0; // <= 5 mins

  const checkIsExamLocked = (exam: any) => {
    if (!exam.startDate && !exam.endDate) return false;
    const now = new Date().getTime();
    if (exam.startDate && now < new Date(exam.startDate).getTime()) return true;
    if (exam.endDate && now > new Date(exam.endDate).getTime()) return true;
    return false;
  };

  const selectedExamObj = exams.find(e => e.id.toString() === selectedExamId);
  const examIsLocked = selectedExamObj ? checkIsExamLocked(selectedExamObj) : false;

  if (loading && !isExamActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <Sparkles className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Menyelaraskan koneksi & basis data SQLite...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in no-print">
      {!isExamActive ? (
        /* ================= 1. REGISTRASI START SCREEN ================= */
        <div className="max-w-xl mx-auto bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 bg-slate-900 text-white relative border-b border-slate-800">
            <div className="absolute top-4 right-4 bg-blue-600 border border-blue-500 rounded text-[9px] font-bold px-2 py-0.5 tracking-wider uppercase">
              PORTAL SISWA
            </div>
            
            <div className="space-y-1.5 max-w-lg">
              <Clipboard className="w-8 h-8 text-blue-400" />
              <h1 className="text-lg font-bold tracking-tight">Portal Ujian Mandiri Online</h1>
              <p className="text-xs text-slate-300 leading-relaxed">
                Silakan siapkan kredensial digital Anda. Rapor hasil evaluasi belajar akan dikirimkan otomatis ke alamat email orang tua/wali kelas selepas tombol selesai ditekan.
              </p>
            </div>
          </div>

          <form onSubmit={handleStartExam} className="p-5 space-y-4">
            {user ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-[11px] text-slate-700 leading-normal">
                <p className="font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-2">PROFIL SISWA TERKOMPILASI</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                  <div>Nama Lengkap: <strong className="text-slate-900 text-xs">{studentName}</strong></div>
                  <div>Email Siswa: <strong className="text-slate-900 text-xs">{studentEmail}</strong></div>
                  <div className="sm:col-span-2">Email Orang Tua / Wali: <strong className="text-slate-900 text-xs">{guardianEmail || "-"}</strong></div>
                </div>
                <p className="text-[9px] text-slate-450 mt-3.5 italic leading-tight">
                  *Rapor digital otomatis berformat HTML lengkap akan dikirimkan langsung ke email orang tua setelah ujian diselesaikan.
                </p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Lengkap Siswa</label>
                    <input
                      type="text"
                      required
                      placeholder="cth: Muhammad Budi"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded bg-white text-slate-850 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Surat Elektronik (Email)</label>
                    <input
                      type="email"
                      required
                      placeholder="budi@siswa.id"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-200 rounded bg-white text-slate-850 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email Orang Tua / Wali Murid</label>
                  <input
                    type="email"
                    required
                    placeholder="ortu.budi@gmail.com"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded bg-white text-slate-850 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    *Sistem mengirimkan rapor akademik interaktif berformat HTML super lengkap ke alamat ini setelah ujian rampung.
                  </p>
                </div>
              </>
            )}

            <div className="border-t border-slate-100 pt-3">
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mata Ujian Tersedia (SQLITE_LIST)</label>
              {exams.length === 0 ? (
                <div className="p-3 text-xs bg-amber-50 rounded text-amber-700 font-semibold border border-amber-100">
                  Belum ada ujian yang ditambahkan oleh Guru. Silakan masuk ke panel guru untuk mengimpor atau membuat ujian baru.
                </div>
              ) : (
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 bg-white rounded focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} (Durasi: {ex.duration} menit, {ex.questionsCount} Soal)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {exams.length > 0 && (
              <div className="space-y-3">
                {examIsLocked && (
                  <div className="p-3 text-[10px] bg-red-50 text-red-700 border border-red-200 rounded font-bold uppercase tracking-wider flex items-center gap-2">
                    <Lock className="w-4 h-4" /> Ujian ini terkunci karena di luar jadwal periode waktu ujian.
                  </div>
                )}
                <button
                  type="submit"
                  disabled={examIsLocked}
                  className={`w-full text-white font-bold text-xs py-2.5 rounded transition shadow-sm hover:shadow flex justify-center items-center gap-2 ${
                    examIsLocked ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  }`}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Masuki Ruang Ujian & Mulai Countdown
                </button>
              </div>
            )}
          </form>
        </div>
      ) : (
        /* ================= 2. ACTIVE EXAM ENVIRONMENT ================= */
        <div className="grid md:grid-cols-4 gap-4 items-start">
          
          {/* Main Question Sheet */}
          <div className="md:col-span-3 space-y-4">
            <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-slate-900 text-sm md:text-base leading-none">{activeExam.title}</h2>
                  <p className="text-[9px] font-mono text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                    <span>Halaman {currentPage + 1} dari {totalPages} &bull; Menampilkan {pageQuestions.length} Soal</span>
                  </p>
                  <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-1.5 transition-all duration-300"
                      style={{ width: `${Math.round((Object.keys(answers).length / questions.length) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[9px] font-bold text-slate-500 mt-1">
                    Progres: {Object.keys(answers).length} / {questions.length} Soal Terjawab ({Math.round((Object.keys(answers).length / questions.length) * 100)}%)
                  </p>
                </div>

                {/* Connection Alert Indicator inside exam */}
                {!isOnline && (
                  <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-amber-50 border border-amber-200 text-amber-700 animate-pulse">
                    BERJALAN OFFLINE
                  </span>
                )}
              </div>

              {/* Multi-page questions viewport */}
              <div className="p-5 divide-y divide-slate-100 space-y-4">
                {pageQuestions.map((q, qidx) => {
                  const qno = startIndex + qidx + 1;
                  const selectedVal = answers[q.id] || "";

                  return (
                    <div key={q.id} className={`space-y-2.5 ${qidx > 0 ? "pt-4" : ""}`}>
                      <div className="flex items-start gap-2">
                        <span className="w-5.3 h-5.3 rounded bg-slate-100 text-slate-700 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                          {qno}
                        </span>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-900 text-xs md:text-sm leading-relaxed">
                            {q.questionText}
                          </p>
                          <span className="inline-block text-[9px] text-slate-450 font-mono italic uppercase">
                            Bobot Nilai: {q.scorePoints} Poin
                          </span>
                        </div>
                      </div>

                      {/* Answers Options A to E */}
                      <div className="grid sm:grid-cols-2 gap-1.5 pl-7 pt-0.5">
                        {[
                          { key: "A", val: q.optionA },
                          { key: "B", val: q.optionB },
                          { key: "C", val: q.optionC },
                          { key: "D", val: q.optionD },
                          { key: "E", qval: q.optionE, val: q.optionE }
                        ].map((opt) => {
                          const isSelected = selectedVal === opt.key;
                          return (
                            <button
                              key={opt.key}
                              type="button"
                              onClick={() => handleSelectAnswer(q.id, opt.key)}
                              className={`p-2.5 text-left rounded text-xs border transition flex items-center justify-between cursor-pointer ${
                                isSelected
                                  ? "bg-blue-50 border-blue-500 text-blue-900 font-medium"
                                  : "bg-white hover:bg-slate-50/50 border-slate-200 text-slate-650"
                              }`}
                            >
                              <span className="line-clamp-2 pr-1.5">{opt.val}</span>
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                                isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"
                              }`}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[3.5]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination control footer bar */}
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="inline-flex items-center gap-1 px-2.5 py-1 border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 text-[11px] font-bold rounded transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Sebelumnya
                </button>

                <div className="text-[11px] text-slate-500 font-bold">
                  Hal {currentPage + 1} / {totalPages}
                </div>

                {currentPage < totalPages - 1 ? (
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded transition cursor-pointer"
                  >
                    Berikutnya
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitExam}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded transition shadow-sm cursor-pointer"
                  >
                    Selesai & Kumpulkan
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Status (Timer, Navigation Panel Sheet) */}
          <div className="space-y-4">
            {/* Timer visualizer */}
            <div className={`bg-white p-4 rounded border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden text-center space-y-1.5 ${isLowTime ? 'border-rose-300 ring-2 ring-rose-50' : ''}`}>
              <Clock className={`w-5 h-5 ${isLowTime ? 'text-rose-500 animate-bounce' : 'text-indigo-500 animate-pulse'}`} />
              <span className={`text-[9px] uppercase font-bold tracking-wider ${isLowTime ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`}>
                {isLowTime ? "WAKTU MAU HABIS!" : "COUNTDOWN WAKTU"}
              </span>
              <span className={`text-2xl font-black font-mono tracking-wider transition-colors ${isLowTime ? 'text-rose-600' : 'text-slate-850'}`}>
                {formatTime(timeLeft)}
              </span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full transition-all ${
                    timeLeft < 300 ? "bg-rose-500 animate-pulse" : "bg-indigo-600"
                  }`}
                  style={{ width: `${(timeLeft / (activeExam.duration * 60)) * 100}%` }}
                />
              </div>
            </div>

            {/* Answer Map Sheet (Rapid navigations) */}
            <div className="bg-white p-4 rounded border border-slate-200 shadow-sm space-y-3">
              <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider">
                PETA RESPONS LEMBAR SOAL
              </span>
              
              <div className="grid grid-cols-5 gap-1.5">
                {questions.map((q, idx) => {
                  const hasAnswered = !!answers[q.id];
                  const qno = idx + 1;
                  const targetPage = Math.floor(idx / questionsPerPage);
                  const isCurrent = targetPage === currentPage;

                  return (
                    <button
                      key={q.id}
                      onClick={() => handlePageChange(targetPage)}
                      className={`h-8 text-[11px] font-bold rounded border flex items-center justify-center transition cursor-pointer ${
                        hasAnswered
                          ? isCurrent
                            ? "bg-blue-100 border-blue-400 text-blue-900"
                            : "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : isCurrent
                          ? "bg-slate-200 border-slate-400 text-slate-800"
                          : "bg-white border-slate-200 hover:bg-slate-100 text-slate-500"
                      }`}
                      title={`Ke Butir Soal Nomor ${qno}`}
                    >
                      {qno}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 pt-2.5 flex flex-col gap-1 text-[9px] text-slate-400 font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-emerald-50 rounded border border-emerald-200" />
                  <span>Hijau: Soal Terjawab</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-slate-200 rounded border border-slate-450" />
                  <span>Abu: Sedang Dibuka</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 bg-white rounded border border-slate-200" />
                  <span>Putih: Belum Terjawab</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
