import { useState, useEffect } from "react";
import { Award, BookOpen, CheckCircle, XCircle, RefreshCw, Eye } from "lucide-react";
import { formatDate, getAuthHeaders } from "../utils";
import StudentResultPage from "./StudentResultPage";

interface StudentScoresListProps {
  user: any;
}

export default function StudentScoresList({ user }: StudentScoresListProps) {
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<number | null>(null);

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/submissions", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Gagal mengambil data riwayat nilai.");
      
      const allSubmissions = await res.json();
      // Filter for the logged-in student by email match
      const filtered = allSubmissions.filter(
        (s: any) => s.studentEmail?.toLowerCase() === user.email?.toLowerCase()
      );
      setSubmissions(filtered);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScores();
  }, [user]);

  if (selectedSubId !== null) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedSubId(null)}
          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-350 text-slate-800 text-[11px] font-bold rounded cursor-pointer transition flex items-center gap-1.5"
        >
          &larr; Kembali ke Daftar Nilai
        </button>
        <StudentResultPage
          submissionId={selectedSubId}
          onRestart={() => setSelectedSubId(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-xs font-sans">
      
      {/* Header Info */}
      <div className="bg-white p-5 rounded border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-slate-900 uppercase">RIWAYAT HASIL NILAI & EVALUASI AKADEMIK</h2>
          <p className="text-[10px] text-slate-500 leading-tight">
            Transkrip digital instan Anda untuk ujian proktoring dan sertifikasi kompetensi.
          </p>
        </div>
        
        <button
          onClick={fetchScores}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded cursor-pointer transition border border-slate-700"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
          Segarkan Nilai
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded border border-slate-200 gap-3">
          <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
          <p className="text-gray-500">Mengunduh buku laporan nilai digital Anda...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-250 text-rose-700 rounded mb-4 font-semibold">
          {error}
        </div>
      ) : submissions.length === 0 ? (
        <div className="bg-white rounded border border-slate-200 p-12 text-center space-y-3">
          <div className="inline-flex w-12 h-12 rounded bg-amber-50 border border-amber-200 text-amber-600 items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-850">Belum Ada Riwayat Ujian</p>
          <p className="text-slate-500 max-w-sm mx-auto text-[11px]">
            Anda belum menyelesaikan ujian apa pun dalam sistem ini. Silakan kunjungi menu <span className="font-bold text-blue-600">"Soal"</span> untuk memilih bidang uji dan mulai mengukir pencapaian Anda!
          </p>
        </div>
      ) : (
        <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider">
                  <th className="p-4">Mata Ujian / Topik</th>
                  <th className="p-4">Tanggal Penyelesaian</th>
                  <th className="p-4 text-center">Skor Perolehan</th>
                  <th className="p-4 text-center">Skor Kelulusan</th>
                  <th className="p-4 text-center">Status Akademik</th>
                  <th className="p-4 text-center">Rincian Rapor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.map((sub) => {
                  const pct = Math.round((sub.score / sub.maxScore) * 100);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                          {sub.examTitle}
                        </div>
                        {sub.offlineSync && (
                          <span className="text-[8px] mt-1 inline-block bg-amber-50 text-amber-700 border border-amber-200 font-bold px-1.5 py-0.5 rounded uppercase">
                            Sinkronisasi Luring (Offline)
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 font-medium font-mono">
                        {formatDate(sub.submittedAt)}
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-black text-slate-850">
                          {sub.score}
                        </span>
                        <span className="text-slate-400 font-medium"> / {sub.maxScore} Poin</span>
                        <span className="block text-[10px] text-slate-400 font-semibold">Akurasi {pct}%</span>
                      </td>
                      <td className="p-4 text-center text-slate-500 font-medium">
                        KKM &ge; 60 Poin
                      </td>
                      <td className="p-4 text-center">
                        {sub.isPassed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-400/20">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            LULUS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 border border-rose-400/20 animate-pulse">
                            <XCircle className="w-3 h-3 text-rose-500" />
                            BELUM LULUS
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedSubId(sub.id)}
                          className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded border border-blue-200 cursor-pointer transition inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Rapor Detail
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
