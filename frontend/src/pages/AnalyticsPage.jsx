import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { TrendingUp, Target, Zap, Award } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUS_COLORS = { Applied: "#0071E3", Interview: "#FF9500", Offer: "#34C759", Rejected: "#FF3B30", Ghosted: "#8E8E93" };

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 shadow-lg" style={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))" }}>
      <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-sm font-['JetBrains_Mono'] font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API}/analytics`).then(r => setData(r.data)).catch(() => toast.error("Failed to load analytics")).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgb(var(--primary))" }} /></div>;

  const kpis = [
    { label: "Total Applications", value: data?.total_applications ?? 0, icon: Target,     color: "#0071E3" },
    { label: "Response Rate",      value: `${data?.response_rate ?? 0}%`, icon: TrendingUp, color: "#AF52DE" },
    { label: "Interview Rate",     value: `${data?.interview_rate ?? 0}%`,icon: Award,      color: "#FF9500" },
    { label: "Offer Rate",         value: `${data?.offer_rate ?? 0}%`,    icon: Zap,        color: "#34C759" },
  ];

  const pieData = (data?.status_breakdown || []).map(s => ({ name: s.status, value: s.count, color: STATUS_COLORS[s.status] || "#8E8E93" }));

  return (
    <div className="p-7 md:p-9 space-y-7 min-h-full" data-testid="analytics-page">
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground">Analytics</h1>
        <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-0.5">Insights from your job search</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="kpi-grid">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="apple-card p-5 hover:-translate-y-0.5 transition-all duration-200" data-testid={`kpi-${label.toLowerCase().replace(/ /g, "-")}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}12` }}>
              <Icon size={17} style={{ color }} strokeWidth={1.8} />
            </div>
            <div className="font-['Plus_Jakarta_Sans'] text-2xl font-bold tracking-tight text-foreground mb-0.5">{value}</div>
            <div className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-xs font-medium">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 apple-card p-6" data-testid="weekly-chart">
          <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-5">Applications Over Time</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data?.weekly_applications || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0071E3" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#0071E3" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Applications" stroke="#0071E3" strokeWidth={2} fill="url(#blueGrad)" dot={{ fill: "#0071E3", r: 3, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="apple-card p-6" data-testid="status-chart">
          <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-5">Status Breakdown</h2>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm font-['Plus_Jakarta_Sans']">No data yet</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>
                  {pieData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
                </Pie><Tooltip content={<CustomTooltip />} /></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: d.color }} /><span className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">{d.name}</span></div>
                    <span className="text-foreground text-xs font-['JetBrains_Mono'] font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {(data?.top_companies || []).length > 0 && (
        <div className="apple-card p-6" data-testid="companies-chart">
          <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-5">Applications by Company</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.top_companies} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" vertical={false} />
              <XAxis dataKey="company" tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 10, fontFamily: "Plus Jakarta Sans" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgb(var(--muted-foreground))", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Applications" fill="#0071E3" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {data?.total_applications === 0 && (
        <div className="text-center py-16 apple-card">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-foreground font-['Plus_Jakarta_Sans'] font-semibold">No data to analyze yet</p>
          <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans'] mt-1">Add applications to see your analytics</p>
        </div>
      )}
    </div>
  );
}
