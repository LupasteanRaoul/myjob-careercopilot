import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Activity, Users, Briefcase, Bot, Shield, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-lg" style={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))" }}>
      <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }} className="text-sm font-['JetBrains_Mono'] font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/admin/metrics`).then(r => setMetrics(r.data)),
      axios.get(`${API}/health`).then(r => setHealth(r.data)),
    ]).catch(() => toast.error("Failed to load metrics")).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={22} className="animate-spin" style={{ color: "rgb(var(--primary))" }} />
      </div>
    );
  }

  const securityPieData = metrics ? [
    { name: "Success", value: metrics.security.login_attempts.success, color: "#34C759" },
    { name: "Failed", value: metrics.security.login_attempts.failed, color: "#FF3B30" },
  ].filter(d => d.value > 0) : [];

  const statCards = [
    { label: "Total Users", value: metrics?.users?.total || 0, icon: Users, color: "#0071E3" },
    { label: "Active (7d)", value: metrics?.users?.active || 0, icon: CheckCircle, color: "#34C759" },
    { label: "Applications", value: metrics?.applications?.total || 0, icon: Briefcase, color: "#FF9500" },
    { label: "AI Actions", value: metrics?.ai?.total_actions || 0, icon: Bot, color: "#AF52DE" },
  ];

  const uptimeFormatted = health?.uptime_seconds
    ? `${Math.floor(health.uptime_seconds / 3600)}h ${Math.floor((health.uptime_seconds % 3600) / 60)}m`
    : "N/A";

  return (
    <div className="p-7 md:p-9 space-y-6 min-h-full" data-testid="admin-dashboard">
      {/* Header */}
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(var(--primary), 0.1)" }}>
            <Activity size={18} style={{ color: "rgb(var(--primary))" }} />
          </div>
          Monitoring Dashboard
        </h1>
        <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-1">System health & security overview</p>
      </div>

      {/* Health Status */}
      {health && (
        <div className="apple-card p-5" data-testid="health-status">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${health.status === "healthy" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground">
                System {health.status === "healthy" ? "Healthy" : "Unhealthy"}
              </span>
              <span className="text-xs font-['JetBrains_Mono'] text-muted-foreground">v{health.version}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans']">Uptime</p>
                <p className="text-sm font-['JetBrains_Mono'] font-medium text-foreground">{uptimeFormatted}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans']">DB Latency</p>
                <p className="text-sm font-['JetBrains_Mono'] font-medium text-foreground">{health.services.database.latency_ms}ms</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(health.services).map(([name, svc]) => (
              <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted">
                <div className={`w-2 h-2 rounded-full ${svc.status === "connected" || svc.status === "operational" ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-xs font-['Plus_Jakarta_Sans'] text-foreground font-medium capitalize">{name.replace("_", " ")}</span>
                <span className="text-xs font-['JetBrains_Mono'] text-muted-foreground ml-auto">{svc.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-stats">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="apple-card p-5 hover:-translate-y-0.5 transition-all duration-200">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}14` }}>
              <Icon size={17} style={{ color }} strokeWidth={1.8} />
            </div>
            <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-foreground">{value}</div>
            <div className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-xs font-medium mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Security Login Chart */}
        <div className="apple-card p-6" data-testid="security-chart">
          <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield size={14} style={{ color: "rgb(var(--primary))" }} />
            Login Attempts
          </h2>
          {securityPieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-['Plus_Jakarta_Sans']">No login data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={securityPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {securityPieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {securityPieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">{d.name}</span>
                    </div>
                    <span className="text-foreground text-xs font-['JetBrains_Mono'] font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Security Events */}
        <div className="apple-card overflow-hidden" data-testid="security-events">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground flex items-center gap-2">
              <Clock size={14} style={{ color: "rgb(var(--primary))" }} />
              Recent Security Events
            </h2>
          </div>
          {(!metrics?.security?.recent_events?.length) ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-['Plus_Jakarta_Sans']">No events yet</div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {metrics.security.recent_events.map((event, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    event.event_type === "login_success" ? "bg-green-500" :
                    event.event_type === "login_failed" ? "bg-red-500" :
                    event.event_type === "microsoft_login" ? "bg-blue-500" : "bg-yellow-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-xs font-['Plus_Jakarta_Sans'] font-medium truncate">
                      {event.event_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-muted-foreground text-[10px] font-['JetBrains_Mono']">
                      {event.ip || "N/A"} &middot; {new Date(event.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
