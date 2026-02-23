import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Briefcase, Target, TrendingUp, Zap, ArrowRight, Eye, EyeOff } from "lucide-react";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

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

  const features = [
    { icon: Target,     label: "Smart Tracking",  desc: "Every application, perfectly organized" },
    { icon: TrendingUp, label: "Live Analytics",   desc: "Understand your job search patterns" },
    { icon: Zap,        label: "AI Assistant",     desc: "Personalized advice from your own data" },
    { icon: Briefcase,  label: "Mock Interviews",  desc: "Practice with an AI-powered interviewer" },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: "#000" }} data-testid="auth-page">

      {/* Left Panel – dark hero */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-14 relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "linear-gradient(145deg, #000 0%, #0a0a0a 60%, #001a3d 100%)" }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none opacity-30"
          style={{ background: "radial-gradient(circle, #0071E3 0%, transparent 70%)", transform: "translate(30%, -30%)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#0071E3" }}>
            <Briefcase size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-white">MyJob</span>
        </div>

        {/* Hero text */}
        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-[#0071E3] font-['Plus_Jakarta_Sans'] text-xs font-semibold tracking-[0.15em] uppercase mb-5">
              Career Intelligence Platform
            </p>
            <h1 className="font-['Plus_Jakarta_Sans'] text-[58px] font-extrabold text-white leading-[1.05] tracking-[-0.03em] mb-6">
              Your career,<br />elevated.
            </h1>
            <p className="text-[#86868B] font-['Plus_Jakarta_Sans'] text-lg leading-relaxed max-w-md">
              Track every application. Understand your search. Land the job you deserve.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {features.map(({ icon: Icon, label, desc }, i) => (
              <div key={i} className="rounded-2xl p-4 space-y-2 opacity-0 animate-fade-in-up"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", animationDelay: `${i*0.08+0.2}s`, animationFillMode: "forwards" }}>
                <Icon size={16} className="text-white opacity-60" strokeWidth={1.5} />
                <p className="text-white font-['Plus_Jakarta_Sans'] text-sm font-semibold">{label}</p>
                <p className="text-[#86868B] font-['Plus_Jakarta_Sans'] text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-8">
          {[["Free", "Always & forever"], ["Open", "Source code is yours"], ["AI", "Powered assistant"]].map(([v, l]) => (
            <div key={v}>
              <p className="text-white font-['Plus_Jakarta_Sans'] text-lg font-bold">{v}</p>
              <p className="text-[#86868B] font-['Plus_Jakarta_Sans'] text-xs">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel – form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-8 lg:p-14" style={{ background: "#F5F5F7" }}>
        <div className="w-full max-w-[380px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#0071E3" }}>
              <Briefcase size={14} className="text-white" />
            </div>
            <span className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-[#1D1D1F]">MyJob</span>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h2 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold text-[#1D1D1F] tracking-[-0.02em] mb-1">
              {mode === "login" ? "Sign in" : "Create account"}
            </h2>
            <p className="text-[#6E6E73] font-['Plus_Jakarta_Sans'] text-sm">
              {mode === "login" ? "Welcome back. Sign in to continue." : "Start your career journey today."}
            </p>
          </div>

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
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="••••••••" required
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
            By continuing, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
