import React, { useState } from "react";
import { BookOpen, UserCheck, ShieldCheck, HelpCircle, LogOut } from "lucide-react";
import StudentPortal from "./components/StudentPortal";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentResultPage from "./components/StudentResultPage";
import OfflineIndicator from "./components/OfflineIndicator";
import LoginScreen from "./components/LoginScreen";
import StudentScoresList from "./components/StudentScoresList";

export default function App() {
  const [user, setUser] = useState<any | null>(() => {
    const saved = localStorage.getItem("exampro_session_user");
    return saved ? JSON.parse(saved) : null;
  });
  
  // Tab within student role: "soal" | "nilai"
  const [studentSubTab, setStudentSubTab] = useState<"soal" | "nilai">("soal");

  const [activeSubmissionId, setActiveSubmissionId] = useState<number | null>(null);
  const [syncTrigger, setSyncTrigger] = useState<boolean>(false);

  const handleExamCompleted = (submissionId: number) => {
    setActiveSubmissionId(submissionId);
    setSyncTrigger((prev) => !prev);
  };

  const handleBackToPortal = () => {
    setActiveSubmissionId(null);
    setSyncTrigger((prev) => !prev);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("exampro_session_user");
    setActiveSubmissionId(null);
    setStudentSubTab("soal");
  };

  // If no user is logged in, restrict access to the LoginScreen
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col selection:bg-blue-100">
        <header className="bg-slate-900 text-white border-b border-slate-800 py-3 px-6 shrink-0 shadow-md">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-base text-white">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-white block">EXAMPRO</span>
                <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block leading-none">SQLite Proctoring System</span>
              </div>
            </div>
            <div className="shrink-0">
              <OfflineIndicator syncTrigger={syncTrigger} />
            </div>
          </div>
        </header>
        <main className="flex-1 max-w-7xl w-full mx-auto px-4">
          <LoginScreen onLoginSuccess={(loggedInUser) => {
            setUser(loggedInUser);
            localStorage.setItem("exampro_session_user", JSON.stringify(loggedInUser));
          }} />
        </main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-[10px] text-slate-400">
          <p>© {new Date().getFullYear()} Aplikasi EXAMPRO & Rapor Digital - Terkoneksi SQLite. All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // Active role variables
  const isGuru = user.role === "guru";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans flex flex-col selection:bg-blue-100">
      
      {/* GLOBAL HEAD NAVIGATION BAR */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md px-6 py-2.5 shrink-0 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo Brand Identity - High Density EXAMPRO styled */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-base text-white shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-white block">
                EXAMPRO <span className="text-blue-400 text-[10px] font-normal ml-1.5 uppercase tracking-widest">{isGuru ? "PROKTOR" : "SISWA"}</span>
              </span>
              <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block font-semibold leading-none mt-0.5">
                Masuk sebagai: {user.fullName} ({isGuru ? "Guru" : "Siswa"})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Nav Panel View Swapper for Siswa (Menu Soal & Nilai) */}
            {!isGuru ? (
              <div className="bg-slate-800 p-0.5 rounded flex items-center border border-slate-700 shrink-0">
                <button
                  onClick={() => {
                    setStudentSubTab("soal");
                    handleBackToPortal();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition duration-150 cursor-pointer ${
                    studentSubTab === "soal"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <BookOpen className="w-3 h-3" />
                  Menu Soal
                </button>
                
                <button
                  onClick={() => {
                    setStudentSubTab("nilai");
                    handleBackToPortal();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-bold transition duration-150 cursor-pointer ${
                    studentSubTab === "nilai"
                      ? "bg-blue-600 text-white"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  Menu Nilai
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2 px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded text-green-400 text-[9px] font-mono tracking-wider font-bold">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                PANEL GURU AKTIF
              </div>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600/25 hover:bg-rose-600 text-white border border-rose-500/30 hover:border-rose-500 text-[11px] font-bold rounded transition cursor-pointer"
              title="Keluar dari sistem"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>

            {/* Offline Health Monitor Status Indicator */}
            <div className="shrink-0">
              <OfflineIndicator syncTrigger={syncTrigger} />
            </div>
          </div>

        </div>
      </header>

      {/* CORE FRAME WINDOW PORT */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {isGuru ? (
          <TeacherDashboard />
        ) : (
          activeSubmissionId ? (
            <StudentResultPage
              submissionId={activeSubmissionId}
              onRestart={handleBackToPortal}
            />
          ) : studentSubTab === "soal" ? (
            <StudentPortal
              user={user}
              onExamCompleted={handleExamCompleted}
              syncTrigger={syncTrigger}
              setSyncTrigger={setSyncTrigger}
            />
          ) : (
            <StudentScoresList user={user} />
          )
        )}
      </main>

      {/* FOOTER COPYRIGHT LINE */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-[10px] text-slate-450 font-medium no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Aplikasi EXAMPRO & Rapor Digital - Terkoneksi SQLite. All rights reserved.</p>
          <div className="flex items-center gap-4 text-slate-500">
            <span className="hover:text-slate-800 transition cursor-pointer">Panduan Proktor</span>
            <span className="hover:text-slate-800 transition cursor-pointer">Keamanan Enkripsi</span>
            <span className="hover:text-slate-800 transition cursor-pointer">Buku Akademik</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
