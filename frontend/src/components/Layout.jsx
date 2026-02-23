import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LayoutDashboard, Briefcase, BarChart2, MessageSquare, LogOut, Moon, Sun, ChevronLeft, ChevronRight, Bell, FileText } from "lucide-react";
import { Toaster } from "./ui/sonner";

const NAV = [
  { path: "/dashboard",    icon: LayoutDashboard, label: "Dashboard" },
  { path: "/applications", icon: Briefcase,        label: "Applications" },
  { path: "/analytics",    icon: BarChart2,         label: "Analytics" },
  { path: "/resume",       icon: FileText,          label: "Resume AI" },
  { path: "/chat",         icon: MessageSquare,     label: "AI Assistant" },
  { path: "/followups",    icon: Bell,              label: "Follow-ups" },
];

const XP_THRESHOLDS = [50, 150, 350, 700, 1200];
function xpForLevel(level) { return XP_THRESHOLDS[level - 1] || (1200 + (level - 5) * 500); }

export default function Layout({ children, theme, onToggleTheme }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate("/"); };
  const xpProgress = user ? Math.min(100, Math.round((user.xp / xpForLevel(user.level)) * 100)) : 0;

  return (
    <div className="flex h-screen overflow-hidden page-bg" data-testid="app-layout">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className={`${collapsed ? "w-[60px]" : "w-[220px]"} flex-shrink-0 sidebar-bg flex flex-col transition-all duration-300 relative z-20`}
      >
        {/* Logo */}
        <div className={`flex items-center ${collapsed ? "justify-center px-3" : "px-5"} h-[56px] border-b border-border`}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgb(var(--primary))" }}>
            <Briefcase size={13} className="text-white" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <span className="ml-2 font-['Plus_Jakarta_Sans'] text-[16px] font-bold tracking-tight text-foreground">
              My<span style={{ color: "rgb(var(--primary))" }}>Job</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} data-testid={`nav-${label.toLowerCase().replace(/ /g, "-")}`}
                className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} px-2.5 py-2 rounded-xl text-sm font-['Plus_Jakarta_Sans'] font-medium transition-all duration-150 ${
                  active ? "text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
                style={active ? { background: "rgb(var(--muted))" } : {}}
              >
                <Icon size={16} className={active ? "text-foreground" : "text-muted-foreground"} strokeWidth={active ? 2.5 : 1.8} />
                {!collapsed && label}
                {!collapsed && active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "rgb(var(--primary))" }} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        {user && (
          <div className="px-2.5 py-3 space-y-2 border-t border-border">
            {!collapsed && (
              <div className="px-2.5 py-2.5 rounded-xl bg-muted">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-['Plus_Jakarta_Sans'] font-semibold text-foreground truncate max-w-[100px]">{user.name}</span>
                  <span className="text-xs font-['JetBrains_Mono'] font-medium ml-1" style={{ color: "rgb(var(--primary))" }}>L{user.level}</span>
                </div>
                <div className="h-1 rounded-full bg-border overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${xpProgress}%`, background: "rgb(var(--primary))" }} data-testid="xp-progress-bar" />
                </div>
                <p className="text-[10px] text-muted-foreground font-['Plus_Jakarta_Sans'] mt-1">{user.xp} XP</p>
              </div>
            )}
            <div className="flex gap-1.5">
              <button data-testid="theme-toggle" onClick={onToggleTheme}
                className={`flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all`}>
                {theme === "dark" ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} style={{ color: "rgb(var(--primary))" }} />}
              </button>
              <button data-testid="logout-btn" onClick={handleLogout}
                className={`h-8 flex items-center justify-center gap-1.5 rounded-xl text-xs font-['Plus_Jakarta_Sans'] font-medium text-muted-foreground hover:text-destructive hover:bg-muted transition-all ${collapsed ? "w-8" : "flex-1 px-2"}`}>
                <LogOut size={13} />
                {!collapsed && "Sign Out"}
              </button>
            </div>
          </div>
        )}

        {/* Collapse */}
        <button onClick={() => setCollapsed(!collapsed)} data-testid="sidebar-collapse-btn"
          className="absolute -right-3 top-[64px] w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-all z-30 bg-card border border-border shadow-sm">
          {collapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto" data-testid="main-content">
        {children}
      </main>

      <Toaster theme={theme === "dark" ? "dark" : "light"} position="bottom-right" richColors />
    </div>
  );
}
