import React, { useState, useEffect } from "react";
import { CheckCircle, XCircle, Award, Mail, Printer, BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { formatDate } from "../utils";

interface StudentResultPageProps {
  submissionId: number;
  onRestart: () => void;
}

export default function StudentResultPage({ submissionId, onRestart }: StudentResultPageProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mailStatus, setMailStatus] = useState<{ loading: boolean; success: boolean; message: string }>({
    loading: false,
    success: false,
    message: "",
  });

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (!res.ok) {
        throw new Error("Gagal mengambil data hasil ujian.");
      }
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [submissionId]);

  const handleSendMailReport = async () => {
    try {
      setMailStatus({ loading: true, success: false, message: "" });
      const res = await fetch(`/api/submissions/${submissionId}/send-report`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Gagal mengirim rapor digital.");
      }
      const result = await res.json();
      setMailStatus({
        loading: false,
        success: true,
        message: result.message || "Rapor digital telah dikirimkan ke email orang tua wali murid.",
      });
    } catch (e: any) {
      setMailStatus({
        loading: false,
        success: false,
        message: e.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Mengevaluasi lembar jawaban Anda...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-800">Gagal Membuka Hasil</h3>
          <p className="text-sm text-red-600 mt-1">{error || "Data kelulusan tidak ditemukan."}</p>
          <button
            onClick={fetchResults}
            className="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 font-semibold text-xs rounded-lg transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const { submission, details } = data;
  const scorePercentage = Math.round((submission.score / submission.maxScore) * 100);

  return (
    <div className="space-y-4 animate-fade-in print-card text-xs">
      {/* 1. Header Ringkasan & Skor */}
      <div className="bg-white rounded border border-slate-200 p-5 shadow-sm no-print">
        <div className="grid md:grid-cols-3 gap-6 items-center">
          <div className="space-y-3.5 md:col-span-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                submission.isPassed
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-rose-50 text-rose-700 border border-rose-200"
              }`}
            >
              {submission.isPassed ? (
                <>
                  <CheckCircle className="w-3 h-3" />
                  STATUS: LULUS
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3" />
                  STATUS: BELUM LULUS
                </>
              )}
            </span>

            <h1 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
              {submission.examTitle}
            </h1>

            <div className="grid grid-cols-2 gap-3 text-[11px] text-slate-600">
              <div>
                <p className="text-slate-450 font-bold text-[9px] uppercase tracking-wider leading-none">NAMA SISWA</p>
                <p className="font-bold text-slate-850 mt-1">{submission.studentName}</p>
              </div>
              <div>
                <p className="text-slate-450 font-bold text-[9px] uppercase tracking-wider leading-none">EMAIL SISWA</p>
                <p className="font-semibold text-slate-700 mt-1 truncate" title={submission.studentEmail}>
                  {submission.studentEmail}
                </p>
              </div>
              <div>
                <p className="text-slate-450 font-bold text-[9px] uppercase tracking-wider leading-none">TANGGAL PENYELASAIAN</p>
                <p className="font-semibold text-slate-700 mt-1">{formatDate(submission.submittedAt)}</p>
              </div>
              <div>
                <p className="text-slate-450 font-bold text-[9px] uppercase tracking-wider leading-none">PASSING GRADE</p>
                <p className="font-bold text-slate-850 mt-1">{submission.examPassing} Poin</p>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="flex flex-wrap gap-2 pt-3.5 border-t border-slate-100">
              {submission.isPassed && (
                <button
                  onClick={() => {
                    const style = document.createElement('style');
                    style.innerHTML = `@media print { body * { visibility: hidden; } #certificate-view, #certificate-view * { visibility: visible; } #certificate-view { position: fixed; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; box-shadow: none; border: none; } }`;
                    document.head.appendChild(style);
                    window.print();
                    setTimeout(() => { document.head.removeChild(style); }, 500);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded transition cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  Sertifikat Kelulusan PDF
                </button>
              )}

              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                Cetak Rapor / PDF
              </button>

              <button
                onClick={handleSendMailReport}
                disabled={mailStatus.loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-[11px] font-bold rounded transition cursor-pointer"
              >
                {mailStatus.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Mail className="w-3.5 h-3.5" />
                )}
                Kirim Rapor ke Orang Tua
              </button>
              
              <button
                onClick={onRestart}
                className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[11px] font-bold rounded transition cursor-pointer"
              >
                Kembali ke Portal
              </button>
            </div>

            {mailStatus.message && (
              <p
                className={`text-[10px] font-semibold p-2 rounded mt-2 border ${
                  mailStatus.success
                    ? "bg-emerald-50 text-emerald-850 border-emerald-200"
                    : "bg-rose-50 text-rose-850 border-rose-200"
                }`}
              >
                {mailStatus.message}
              </p>
            )}
          </div>

          {/* Big Score Visualizer */}
          <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded border border-slate-200 relative overflow-hidden text-center h-full">
            <div className="absolute top-2 right-2">
              <span className="text-[8px] font-mono font-bold text-slate-450 bg-slate-200/60 px-1.5 py-0.5 rounded">
                {submission.offlineSync ? "OFFLINE_SYNCED" : "ONLINE"}
              </span>
            </div>
            
            <div className="w-24 h-24 rounded-full border-4 border-slate-200 flex flex-col items-center justify-center relative bg-white shadow-sm mt-2">
              <div
                className={`absolute inset-0 rounded-full border-4 ${
                  submission.isPassed ? "border-emerald-500" : "border-rose-400"
                }`}
                style={{
                  clipPath: `polygon(50% 50%, -50% -50%, ${scorePercentage >= 25 ? "150% -50%" : "50% 50%"}, ${
                    scorePercentage >= 50 ? "150% 150%" : "50% 50%"
                  }, ${scorePercentage >= 75 ? "-50% 150%" : "50% 50%"}, -50% -50%)`,
                }}
              />
              <span className="text-2xl font-black text-slate-855 text-slate-900">{submission.score}</span>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">DARI {submission.maxScore}</span>
            </div>

            <p className="font-bold text-slate-800 mt-3 text-xs">{scorePercentage}% Akurasi</p>
            <p className="text-[10px] text-slate-450 leading-relaxed mt-0.5">
              Sistem mencatat pengerjaan Anda berhasil tersimpan di SQLite secara valid.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Certificate of Achievement for Passed Students (Visual feedback) */}
      {submission.isPassed && (
        <div id="certificate-view" className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/70 rounded p-5 space-y-3 shadow-sm text-center relative overflow-hidden print-page-break">
          <Award className="w-10 h-10 text-amber-500 mx-auto transform hover:scale-105 transition duration-300" />
          
          <div className="space-y-0.5">
            <h2 className="text-[9px] font-bold text-amber-600 tracking-widest uppercase mb-1">PIAGAM PENGHARGAAN KOMPETENSI</h2>
            <p className="text-base font-extrabold text-slate-900 leading-none">SERTIFIKAT KELULUSAN DIGITAL</p>
            <p className="text-[10px] text-slate-500 max-w-sm mx-auto">
              Diberikan secara elektronik kepada siswa berprestasi yang telah mampu melampaui ambang batas nilai kelulusan secara jujur.
            </p>
          </div>

          <div className="py-1 inline-block">
            <span className="font-mono text-xs font-bold text-slate-950 bg-white shadow-xs border border-amber-200 px-3 py-1.5 rounded">
              {submission.studentName.toUpperCase()}
            </span>
          </div>

          <p className="text-[9px] text-slate-400 font-mono">ID Sertifikasi: ONL-EX-{submission.id}-{new Date(submission.submittedAt).getFullYear()}</p>
        </div>
      )}

      {/* 3. PRINT-ONLY DRAFT VIEW (Visible only during Window Print) */}
      <div className="hidden print-only space-y-4">
        <div className="text-center border-b border-slate-900 pb-3">
          <h1 className="text-xl font-bold tracking-wide uppercase">RAPOR AKADEMIK HASIL UJIAN</h1>
          <p className="text-xs font-bold text-slate-650 uppercase">SISTEM MONITORING MONITORING KELAS DIGITAL</p>
        </div>
        <table className="w-full text-xs border-collapse border border-slate-350">
          <tbody>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100 w-1/3">Nama Siswa:</td>
              <td className="border border-slate-300 p-2">{submission.studentName}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100">Alamat Surat Elektronik:</td>
              <td className="border border-slate-300 p-2">{submission.studentEmail}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100">Wali Kelas / Email Orang Tua:</td>
              <td className="border border-slate-300 p-2">{submission.guardianEmail}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100">Kompetensi Ujian:</td>
              <td className="border border-slate-300 p-2 font-bold">{submission.examTitle}</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100">Skor Diperoleh:</td>
              <td className="border border-slate-300 p-2 font-mono font-bold text-blue-600">
                {submission.score} / {submission.maxScore} Poin ({scorePercentage}%)
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100">Ambang Kelulusan (Passing Grade):</td>
              <td className="border border-slate-300 p-2">{submission.examPassing} Poin</td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100">Status Kelulusan Akhir:</td>
              <td className="border border-slate-300 p-2 font-bold uppercase">
                {submission.isPassed ? "LULUS (PASSED)" : "TIDAK LULUS (FAILED)"}
              </td>
            </tr>
            <tr>
              <td className="border border-slate-300 p-2 font-bold bg-slate-100">Waktu Penyelesaian:</td>
              <td className="border border-slate-300 p-2">{formatDate(submission.submittedAt)}</td>
            </tr>
          </tbody>
        </table>
        
        <div className="flex justify-between items-center pt-10">
          <div className="text-center w-1/3">
            <span className="block border-b border-slate-500 mx-auto w-3/4 mb-1"></span>
            <span className="text-[10px] text-slate-500">Tanda Tangan Siswa</span>
          </div>
          <div className="text-center w-1/3">
            <span className="block text-[9px] italic text-slate-400">Verifikasi Berbasis Hash Kode QR</span>
          </div>
          <div className="text-center w-1/3">
            <span className="block border-b border-slate-400 mx-auto w-3/4 mb-1"></span>
            <span className="text-[10px] text-slate-500">Petugas Pengawas Digital</span>
          </div>
        </div>
      </div>

      {/* 4. Analisis Koreksi Jawaban Per Item (Student Review UI) */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden no-print">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-slate-600" />
            <h2 className="font-bold text-slate-900 text-sm">Analisis Jawaban & Pembahasan Detil</h2>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-450 bg-slate-200/50 px-2.5 py-0.5 rounded font-bold">
            {details.length} Soal Evaluasi
          </span>
        </div>

        <div className="divide-y divide-slate-150 bg-white">
          {details.map((item: any, idx: number) => {
            const hasAnswered = !!item.studentAns;
            const isCorrect = item.isCorrect;

            return (
              <div key={item.id} className="p-4 space-y-3.5 hover:bg-slate-50/50 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5">
                    <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold text-slate-400 font-mono">
                      Butir Soal {idx + 1} &bull; {item.points} Poin
                    </span>
                    <h3 className="font-semibold text-slate-900 text-xs md:text-sm leading-relaxed">
                      {item.questionText}
                    </h3>
                  </div>

                  <span className="shrink-0">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        <CheckCircle className="w-3 h-3" />
                        Benar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200 uppercase">
                        <XCircle className="w-3 h-3" />
                        {hasAnswered ? "Salah" : "Kosong"}
                      </span>
                    )}
                  </span>
                </div>

                {/* Options List with selected vs correct tags */}
                <div className="grid md:grid-cols-2 gap-1.5 mt-1.5">
                  {[
                    { label: "A", text: item.optionA },
                    { label: "B", text: item.optionB },
                    { label: "C", text: item.optionC },
                    { label: "D", text: item.optionD },
                    { label: "E", text: item.optionE },
                  ].map((opt) => {
                    const isStudentChoice = item.studentAns === opt.label;
                    const isCorrectChoice = item.correctOption === opt.label;

                    let bgStyle = "bg-white border-slate-200 text-slate-650";
                    if (isStudentChoice) {
                      bgStyle = isCorrect ? "bg-emerald-50 border-emerald-400 text-emerald-850 font-medium" : "bg-rose-50 border-rose-450 text-rose-850 font-medium";
                    } else if (isCorrectChoice) {
                      bgStyle = "bg-slate-50 border-slate-350 text-slate-900 font-bold";
                    }

                    return (
                      <div
                        key={opt.label}
                        className={`p-2 rounded border text-xs flex items-center justify-between transition ${bgStyle}`}
                      >
                        <span className="line-clamp-2 pr-1.5">{opt.text}</span>
                        <div className="flex gap-1 shrink-0">
                          {isStudentChoice && (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-slate-900/10 uppercase">
                              Jawaban Anda
                            </span>
                          )}
                          {isCorrectChoice && (
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-emerald-600/10 text-emerald-800 uppercase">
                              Kunci Benar
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation text on errors */}
                {!isCorrect && (
                  <div className="p-2.5 bg-rose-50/45 border border-rose-150 rounded text-[11px] text-rose-900 space-y-1">
                    <p className="font-bold">Koreksi Jawaban & Rekomendasi:</p>
                    <p className="leading-relaxed">
                      Anda memilih jawaban <strong className="uppercase">({item.studentAns || "Belum dipilih"})</strong>. Pilihan benar yang tepat adalah <strong className="uppercase">({item.correctOption})</strong>. Bacalah kembali silabus atau modul belajar untuk memperkuat pemahaman sebelum mengambil evaluasi remedial susulan.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
