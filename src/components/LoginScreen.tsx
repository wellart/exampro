import React, { useState } from "react";
import { BookOpen, Lock, User, Mail, Sparkles, UserPlus } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Login form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  // Forgot Password state
  const [resetUsername, setResetUsername] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regGuardianEmail, setRegGuardianEmail] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal masuk. Coba lagi.");
      }

      onLoginSuccess(data.user);
      localStorage.setItem("exampro_token", data.token || "");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: regUsername,
          password: regPassword,
          fullName: regFullName,
          email: regEmail,
          guardianEmail: regGuardianEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mendaftar. Coba lagi.");
      }

      setMessage({ type: "success", text: "Registrasi siswa sukses! Silakan login dengan akun Anda." });
      setIsRegister(false);
      setUsername(regUsername);
      setPassword("");
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: resetUsername,
          email: resetEmail,
          newPassword: resetNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal melakukan reset password.");
      }

      setMessage({ type: "success", text: data.message });
      setIsForgotPassword(false);
      setUsername(resetUsername);
      setPassword(""); // Forcenya kosongin supaya diketik reset passnya
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 animate-fade-in font-sans">
      <div className="w-full max-w-md bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden">
        
        {/* Banner Section */}
        <div className="bg-slate-900 text-white px-6 py-6 text-center border-b border-slate-800">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-3">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-black tracking-tight uppercase">SISTEM UJIAN EXAMPRO</h2>
          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
            Portal Digital Terintegrasi Rapor Wali & Database Proctoring SQLite
          </p>
        </div>

        {/* Content Section */}
        <div className="p-6 md:p-8 space-y-6">
          
          {/* Notification Messages */}
          {message && (
            <div
              className={`p-3 rounded text-xs font-semibold border ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-250"
              }`}
            >
              {message.text}
            </div>
          )}

          {!isRegister && !isForgotPassword && (
            /* ================= LOGIN FORM ================= */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Masukkan username Anda"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-500">Membuka Sandi (Password)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(true);
                        setMessage(null);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold hover:underline"
                    >
                      Lupa password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs py-3 rounded transition shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer flex justify-center items-center gap-2"
              >
                <span>{loading ? "Menghubungkan..." : "Masuk Sistem Sekarang"}</span>
              </button>

              <div className="relative flex items-center justify-center pt-2">
                <span className="absolute bg-white px-2.5 text-[9px] uppercase font-bold text-slate-400 mt-1">ATAU</span>
                <div className="w-full border-t border-slate-200 mt-1"></div>
              </div>

              <div className="text-center pt-2.5">
                <p className="text-[11px] text-slate-500">
                  Siswa baru belum mempunyai akun?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setMessage(null);
                    }}
                    className="text-blue-600 hover:underline font-bold"
                  >
                    Daftar Baru di Sini
                  </button>
                </p>
              </div>

              {/* Demo Account Tips */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg space-y-1.5 text-[10px] text-slate-550 leading-relaxed font-mono">
                <div className="flex gap-1 items-center font-bold text-slate-700">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>KREDENSIAL DEMO:</span>
                </div>
                <div>&bull; Akun Pengajar (Guru): <span className="font-bold text-slate-900">admin</span> / <span className="font-bold text-slate-900">admin</span></div>
                <div>&bull; Akun Siswa 1: <span className="font-bold text-slate-900">budi</span> / <span className="font-bold text-slate-900">budi123</span></div>
                <div>&bull; Akun Siswa 2: <span className="font-bold text-slate-900">dina</span> / <span className="font-bold text-slate-900">dina123</span></div>
              </div>
            </form>
          )}
          
          {isForgotPassword && (
            /* ================= FORGOT PASSWORD FORM ================= */
            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div className="mb-4">
                <h3 className="text-sm font-black text-slate-800 border-b border-slate-200 pb-2 mb-2">Pemulihan Kata Sandi</h3>
                <p className="text-xs text-slate-500">Verifikasi identitas Anda untuk mengatur kata sandi baru.</p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Username Anda *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Alamat Email Tertaut *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kata Sandi Baru *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setMessage(null);
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 transition rounded"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs py-2 rounded transition cursor-pointer"
                >
                  {loading ? "Memproses..." : "Ubah Kata Sandi"}
                </button>
              </div>
            </form>
          )}

          {isRegister && !isForgotPassword && (
            /* ================= REGISTER FORM ================= */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Username Pendek *</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="budi"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().replace(/\s+/g, ""))}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Sandi Akun *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Sandi minimal 6 karakter"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Nama Lengkap Siswa *</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="cth: Muhammad Budi Santoso"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">G-Mail Aktif Siswa *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="budi.santoso@siswa.id"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email Orang Tua / Wali Murid</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="bapak.budi@gmail.com"
                    value={regGuardianEmail}
                    onChange={(e) => setRegGuardianEmail(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 border border-slate-250 rounded bg-white text-slate-850 focus:outline-none"
                  />
                </div>
                <p className="text-[9px] text-slate-400 mt-1 italic leading-none">
                  *Rapor akademik digital otomatis akan dikirim ke email ini setelah ujian diselesaikan.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 rounded transition shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Menyimpan Data..." : "Registrasi Akun Siswa Baru"}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegister(false)}
                  className="text-slate-550 hover:text-slate-800 text-[11px] underline font-bold"
                >
                  Kembali ke Halaman Login
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
