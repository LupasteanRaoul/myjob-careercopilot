import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Briefcase, Target, TrendingUp, Zap, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [ssoConfigured, setSsoConfigured] = useState(false);
  const { login, register, loginWithMicrosoft } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    axios.get(`${API}/auth/microsoft/status`).then(r => setSsoConfigured(r.data.configured)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
    } finally { setLoading(false); }
  };

  const handleMicrosoftLogin = async () => {
    setMsLoading(true);
    try {
      await loginWithMicrosoft();
    } catch (err) {
      toast.error(err.message || "Microsoft SSO not available");
      setMsLoading(false);
    }
  };

  const features = [
    { icon: Target, label: "Smart Tracking", desc: "Every application, perfectly organized" },
    { icon: TrendingUp, label: "Live Analytics", desc: "Understand your job search patterns" },
    { icon: Zap, label: "AI Assistant", desc: "Personalized advice from your own data" },
    { icon: Shield, label: "Enterprise SSO", desc: "Microsoft Azure AD integration" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "#000" }} data-testid="auth-page">

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #000 0%, #0a0a0a 60%, #001a3d 100%)" }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
          style={{ background: "radial-gradient(circle, #0071E3 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#0071E3" }}>
            <Briefcase size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-white">MyJob</span>
          <span className="ml-2 px-2 py-0.5 rounded-md text-[9px] font-['JetBrains_Mono'] font-bold tracking-wider" style={{ background: "rgba(0,113,227,0.2)", color: "#4DA3FF", border: "1px solid rgba(0,113,227,0.3)" }}>
            ENTERPRISE v2.0
          </span>
        </div>

        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-[#0071E3] font-['Plus_Jakarta_Sans'] text-xs font-semibold tracking-[0.15em] uppercase mb-5">
              Career Intelligence Platform
            </p>
            <h1 className="font-['Plus_Jakarta_Sans'] text-[58px] font-extrabold text-white leading-[1.05] tracking-[-0.03em] mb-6">
              Your career,<br />elevated.
            </h1>
            <p className="text-[#86868B] font-['Plus_Jakarta_Sans'] text-lg leading-relaxed max-w-md">
              Track every application. AI-powered follow-ups. Enterprise-grade security & GDPR compliance.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {features.map(({ icon: Icon, label, desc }, i) => (
              <div key={i} className="rounded-2xl p-4 space-y-2 opacity-0 animate-fade-in-up"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", animationDelay: `${i * 0.08 + 0.2}s`, animationFillMode: "forwards" }}>
                <Icon size={16} className="text-white opacity-60" strokeWidth={1.5} />
                <p className="text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold">{label}</p>
                <p className="text-[#86868B] font-['Plus_Jakarta_Sans'] text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-8">
          {[["Free", "Always & forever"], ["AI Agent", "Autonomous tasks"], ["GDPR", "EU compliant"]].map(([v, l]) => (
            <div key={v}>
              <p className="text-white font-['Plus_Jakarta_Sans'] text-lg font-bold">{v}</p>
              <p className="text-[#86868B] font-['Plus_Jakarta_Sans'] text-xs">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 lg:p-14" style={{ background: "#F5F5F7" }}>
        <div className="w-full max-w-[380px]">

          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#0071E3" }}>
              <Briefcase size={14} className="text-white" />
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#1D1D1F]">MyJob</span>
          </div>

          <div className="mb-6">
            <h2 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold text-[#1D1D1F] tracking-[-0.02em] mb-1">
              {mode === "login" ? "Sign in" : "Create account"}
            </h2>
            <p className="text-[#6E6E73] font-['Plus_Jakarta_Sans'] text-sm">
              {mode === "login" ? "Welcome back. Sign in to continue." : "Start your career journey today."}
            </p>
          </div>

          {/* Microsoft SSO Button */}
          {ssoConfigured && (
            <>
              <button onClick={handleMicrosoftLogin} disabled={msLoading} data-testid="microsoft-login-btn"
                className="w-full h-11 flex items-center justify-center gap-3 rounded-xl text-sm font-['Plus_Jakarta_Sans'] font-semibold transition-all duration-200 hover:shadow-md disabled:opacity-60 mb-4"
                style={{ background: "#fff", border: "1px solid #D2D2D7", color: "#1D1D1F" }}>
                {msLoading ? (
                  <div className="w-4 h-4 border-2 border-[#0078D4] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
                )}
                Sign in with Microsoft
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-[#D2D2D7]" />
                <span className="text-[#6E6E73] text-xs font-['Plus_Jakarta_Sans']">or continue with email</span>
                <div className="flex-1 h-px bg-[#D2D2D7]" />
              </div>
            </>
          )}

          {/* Toggle */}
          <div className="flex gap-1 p-1 rounded-xl mb-6 bg-white border border-[#D2D2D7]">
            {[["login", "Sign In"], ["register", "Register"]].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)} data-testid={`${m}-tab`}
                className={`flex-1 py-2 text-sm font-['Plus_Jakarta_Sans'] font-semibold rounded-lg transition-all duration-200 ${
                  mode === m ? "bg-[#0071E3] text-white shadow-sm" : "text-[#6E6E73] hover:text-[#1D1D1F]"
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4" data-testid="auth-form">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-['Plus_Jakarta_Sans'] font-semibold text-[#1D1D1F] mb-1.5">Full Name</label>
                <input data-testid="name-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Alex Johnson" required
                  className="apple-input w-full h-11 px-4 text-sm"
                  style={{ background: "#fff", border: "1px solid #D2D2D7", color: "#1D1D1F" }} />
              </div>
            )}
            <div>
              <label className="block text-sm font-['Plus_Jakarta_Sans'] font-semibold text-[#1D1D1F] mb-1.5">Email</label>
              <input type="email" data-testid="email-input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="alex@example.com" required
                className="apple-input w-full h-11 px-4 text-sm"
                style={{ background: "#fff", border: "1px solid #D2D2D7", color: "#1D1D1F" }} />
            </div>
            <div>
              <label className="block text-sm font-['Plus_Jakarta_Sans'] font-semibold text-[#1D1D1F] mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} data-testid="password-input" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="........" required
                  className="apple-input w-full h-11 px-4 pr-11 text-sm"
                  style={{ background: "#fff", border: "1px solid #D2D2D7", color: "#1D1D1F" }} />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" data-testid="auth-submit-btn" disabled={loading}
              className="apple-btn-primary w-full h-11 text-sm flex items-center justify-center gap-2 mt-2 disabled:opacity-60">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <>{mode === "login" ? "Sign In" : "Create Account"}<ArrowRight size={14} /></>
              }
            </button>
          </form>

          <p className="text-center text-[#6E6E73] text-xs font-['Plus_Jakarta_Sans'] mt-5">
            By continuing, you agree to our Terms of Service & Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
