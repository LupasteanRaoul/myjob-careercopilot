import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { Briefcase, TrendingUp, MessageSquare, Zap, Target, Trophy, Plus, ArrowRight, Bell } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  Applied:   { color: "#0071E3", bg: "#EFF4FB" },
  Interview: { color: "#FF9500", bg: "#FFF5E6" },
  Offer:     { color: "#34C759", bg: "#EDF8F1" },
  Rejected:  { color: "#FF3B30", bg: "#FFEDEC" },
  Ghosted:   { color: "#8E8E93", bg: "#F2F2F7" },
};

const BADGE_META = {
  first_application: { icon: "🚀", label: "First Step" },
  five_applications:  { icon: "⚡", label: "On a Roll" },
  ten_applications:   { icon: "🎯", label: "Committed" },
  first_interview:    { icon: "⭐", label: "Interview Ready" },
  first_offer:        { icon: "🏆", label: "Offer!" },
  pdf_parser:         { icon: "✨", label: "PDF Pro" },
  interview_mode:     { icon: "🎤", label: "Mock Pro" },
  url_scraper:        { icon: "🔗", label: "Link Hunter" },
};

const XP_THRESHOLDS = [50, 150, 350, 700, 1200];
function xpForLevel(l) { return XP_THRESHOLDS[l - 1] || (1200 + (l - 5) * 500); }

function StatCard({ label, value, icon: Icon, color, delay }) {
  return (
    <div className="apple-card p-5 opacity-0 animate-fade-in-up hover:-translate-y-0.5 transition-all duration-200"
      style={{ animationDelay: delay, animationFillMode: "forwards" }}
      data-testid={`stat-card-${label.toLowerCase().replace(/ /g, "-")}`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}14` }}>
        <Icon size={18} style={{ color }} strokeWidth={1.8} />
      </div>
      <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight mb-0.5" style={{ color: "rgb(var(--foreground))" }}>{value}</div>
      <div className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-xs font-medium">{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/applications`).then(r => setApps(r.data)),
      axios.get(`${API}/analytics`).then(r => setAnalytics(r.data)),
    ]).catch(() => toast.error("Failed to load data")).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: "Total Applied",  value: loading ? "—" : apps.length,                                        icon: Briefcase,  color: "#0071E3", delay: "0.1s" },
    { label: "Interviews",     value: loading ? "—" : apps.filter(a => a.status === "Interview").length,   icon: Target,     color: "#FF9500", delay: "0.15s" },
    { label: "Offers",         value: loading ? "—" : apps.filter(a => a.status === "Offer").length,       icon: Trophy,     color: "#34C759", delay: "0.2s" },
    { label: "Response Rate",  value: loading ? "—" : `${analytics?.response_rate ?? 0}%`,                 icon: TrendingUp, color: "#AF52DE", delay: "0.25s" },
  ];

  const xpProgress = user ? Math.min(100, Math.round((user.xp / xpForLevel(user.level)) * 100)) : 0;
  const recentApps = apps.slice(0, 5);
  const followupPending = analytics?.followup_pending ?? 0;

  return (
    <div className="p-7 md:p-9 space-y-6 min-h-full" data-testid="dashboard-page">

      {/* Header */}
      <div className="flex items-center justify-between opacity-0 animate-fade-in-up" style={{ animationFillMode: "forwards" }}>
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground">
            Good to see you, <span style={{ color: "rgb(var(--primary))" }}>{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-0.5">Your job search command center</p>
        </div>
        <Link to="/applications">
          <button data-testid="add-application-btn"
            className="apple-btn-primary flex items-center gap-2 px-5 h-9 text-sm">
            <Plus size={14} />Add Application
          </button>
        </Link>
      </div>

      {/* Follow-up Alert */}
      {followupPending > 0 && (
        <Link to="/followups" data-testid="followup-alert">
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer hover:opacity-90 transition-opacity"
            style={{ background: "#FFF5E6", borderColor: "#FFD19A" }}>
            <Bell size={14} className="text-orange-500 flex-shrink-0" />
            <p className="text-orange-700 font-['Plus_Jakarta_Sans'] text-sm font-medium">
              {followupPending} application{followupPending > 1 ? "s" : ""} need a follow-up — 7+ days since applying
            </p>
            <ArrowRight size={12} className="text-orange-500 ml-auto" />
          </div>
        </Link>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stats-grid">
        {loading
          ? Array(4).fill(0).map((_, i) => <div key={i} className="apple-card p-5 animate-pulse h-[100px]" />)
          : stats.map(p => <StatCard key={p.label} {...p} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Recent Applications */}
        <div className="lg:col-span-2 apple-card overflow-hidden" data-testid="recent-applications">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground">Recent Applications</h2>
            <Link to="/applications" className="text-xs font-['Plus_Jakarta_Sans'] font-semibold flex items-center gap-1 transition-colors" style={{ color: "rgb(var(--primary))" }}>
              View all <ArrowRight size={11} />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-0">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border animate-pulse">
                  <div className="w-8 h-8 rounded-xl bg-muted flex-shrink-0" />
                  <div className="flex-1 space-y-1.5"><div className="h-3 rounded-full w-32 bg-muted" /><div className="h-2.5 rounded-full w-20 bg-muted" /></div>
                  <div className="h-5 rounded-full w-16 bg-muted" />
                </div>
              ))}
            </div>
          ) : recentApps.length === 0 ? (
            <div className="p-14 text-center">
              <Briefcase size={28} className="text-muted-foreground mx-auto mb-3 opacity-20" />
              <p className="text-foreground font-['Plus_Jakarta_Sans'] text-sm font-semibold mb-0.5">No applications yet</p>
              <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">Add your first job application to get started</p>
            </div>
          ) : (
            <div>
              {recentApps.map((app, i) => {
                const sc = STATUS_CONFIG[app.status] || STATUS_CONFIG.Applied;
                return (
                  <div key={app.id} className="flex items-center justify-between px-5 py-3.5 border-b border-border last:border-0 hover:bg-muted/40 transition-colors" data-testid={`recent-app-${i}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted border border-border">
                        <span className="text-foreground font-['Plus_Jakarta_Sans'] text-xs font-bold">{app.company[0]?.toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] font-semibold truncate">{app.role}</p>
                        <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] truncate">{app.company}</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full font-['Plus_Jakarta_Sans'] font-semibold flex-shrink-0"
                      style={{ background: sc.bg, color: sc.color }}>{app.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col */}
        <div className="space-y-4">
          {/* XP Card */}
          <div className="apple-card p-5" data-testid="xp-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-xs font-medium mb-0.5">Career Level</p>
                <p className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight" style={{ color: "rgb(var(--foreground))" }}>Level {user?.level || 1}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted">
                <Zap size={18} style={{ color: "rgb(var(--primary))" }} strokeWidth={1.8} />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-['Plus_Jakarta_Sans']">
                <span className="text-foreground font-semibold">{user?.xp || 0} XP</span>
                <span className="text-muted-foreground">{xpForLevel(user?.level || 1)} XP</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xpProgress}%`, background: "rgb(var(--primary))" }} data-testid="dashboard-xp-bar" />
              </div>
              <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">{xpProgress}% to next level</p>
            </div>
          </div>

          {/* Badges */}
          <div className="apple-card p-5" data-testid="badges-card">
            <h3 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-3">Achievements</h3>
            {user?.badges?.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {user.badges.map(badge => {
                  const meta = BADGE_META[badge];
                  return meta ? (
                    <div key={badge} title={meta.label}
                      className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted hover:bg-border transition-colors cursor-default">
                      <span className="text-lg">{meta.icon}</span>
                      <span className="text-[9px] text-muted-foreground font-['Plus_Jakarta_Sans'] text-center leading-tight">{meta.label}</span>
                    </div>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <Trophy size={20} className="text-muted-foreground mx-auto mb-2 opacity-20" />
                <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">Apply to earn badges</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="apple-card p-3 space-y-0.5">
            {[
              { to: "/chat", icon: MessageSquare, color: "#AF52DE", label: "AI Assistant", sub: "Ask about your search" },
              { to: "/followups", icon: Bell, color: "#FF9500", label: "Follow-ups", sub: followupPending > 0 ? `${followupPending} pending` : "All caught up" },
            ].map(({ to, icon: Icon, color, label, sub }) => (
              <Link key={to} to={to}>
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors cursor-pointer group">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}14` }}>
                    <Icon size={14} style={{ color }} strokeWidth={1.8} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-['Plus_Jakarta_Sans'] font-semibold">{label}</p>
                    <p className="text-muted-foreground text-[10px] font-['Plus_Jakarta_Sans']">{sub}</p>
                  </div>
                  <ArrowRight size={12} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
