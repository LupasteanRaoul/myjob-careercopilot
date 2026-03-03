import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Bot, Check, X, Mail, Clock, Loader2, Zap, BarChart2, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AIAgentPage() {
  const [actions, setActions] = useState([]);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  const fetchData = async () => {
    try {
      const [actionsRes, usageRes] = await Promise.all([
        axios.get(`${API}/ai-agent/actions`),
        axios.get(`${API}/ai-agent/usage`)
      ]);
      setActions(actionsRes.data);
      setUsage(usageRes.data);
    } catch { toast.error("Failed to load AI agent data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const generateFollowups = async () => {
    setGenerating(true);
    try {
      const res = await axios.post(`${API}/ai-agent/generate-followups`);
      toast.success(`Generated ${res.data.generated} follow-up${res.data.generated !== 1 ? "s" : ""}`);
      fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to generate"); }
    finally { setGenerating(false); }
  };

  const handleAction = async (actionId, type) => {
    setProcessingId(actionId);
    try {
      await axios.post(`${API}/ai-agent/actions/${actionId}/${type}`);
      toast.success(type === "approve" ? "Action approved" : "Action rejected");
      fetchData();
    } catch { toast.error("Failed to process action"); }
    finally { setProcessingId(null); }
  };

  const pendingActions = actions.filter(a => a.status === "pending");

  return (
    <div className="p-7 md:p-9 space-y-6 min-h-full" data-testid="ai-agent-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(var(--primary), 0.1)" }}>
              <Bot size={18} style={{ color: "rgb(var(--primary))" }} />
            </div>
            AI Agent
          </h1>
          <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-1">Autonomous follow-up recommendations</p>
        </div>
        <button onClick={generateFollowups} disabled={generating} data-testid="generate-followups-btn"
          className="apple-btn-primary flex items-center gap-2 px-5 h-9 text-sm disabled:opacity-50">
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {generating ? "Generating..." : "Generate Follow-ups"}
        </button>
      </div>

      {/* Usage Stats */}
      {usage && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="ai-usage-stats">
          {[
            { label: "Actions This Month", value: usage.total_actions, color: "#0071E3" },
            { label: "Approved", value: usage.approved, color: "#34C759" },
            { label: "Pending", value: usage.pending, color: "#FF9500" },
            { label: "Remaining", value: usage.remaining, color: "#AF52DE" },
          ].map(({ label, value, color }) => (
            <div key={label} className="apple-card p-4" data-testid={`usage-${label.toLowerCase().replace(/ /g, "-")}`}>
              <div className="text-2xl font-['Plus_Jakarta_Sans'] font-bold" style={{ color }}>{value}</div>
              <div className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] font-medium mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Usage Meter */}
      {usage && (
        <div className="apple-card p-5" data-testid="usage-meter">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Monthly Usage</span>
            <span className="text-xs font-['JetBrains_Mono'] text-muted-foreground">{usage.total_actions} / {usage.limit}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{
              width: `${Math.min(100, (usage.total_actions / usage.limit) * 100)}%`,
              background: usage.total_actions > usage.limit * 0.8 ? "#FF3B30" : "rgb(var(--primary))"
            }} />
          </div>
          <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mt-1.5">{usage.month}</p>
        </div>
      )}

      {/* Actions List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin" style={{ color: "rgb(var(--primary))" }} />
        </div>
      ) : pendingActions.length === 0 ? (
        <div className="text-center py-16 apple-card" data-testid="no-actions">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
            <Bot size={26} className="text-muted-foreground opacity-40" />
          </div>
          <p className="text-foreground font-['Plus_Jakarta_Sans'] text-lg font-semibold">No pending actions</p>
          <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans'] mt-1">Click "Generate Follow-ups" to let AI find opportunities</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="actions-list">
          <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] font-bold uppercase tracking-widest">
            {pendingActions.length} Pending Action{pendingActions.length !== 1 ? "s" : ""}
          </p>
          {pendingActions.map((action) => (
            <div key={action.id} className="apple-card overflow-hidden" data-testid={`action-${action.id}`}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-muted border border-border">
                    <span className="text-foreground font-['Plus_Jakarta_Sans'] text-sm font-bold">
                      {action.company?.[0]?.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] font-semibold">{action.role}</p>
                    <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">
                      {action.company} &middot; <Clock size={10} className="inline" /> {action.days_since_applied}d ago
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAction(action.id, "approve")}
                    disabled={processingId === action.id}
                    data-testid={`approve-${action.id}`}
                    className="apple-btn-primary flex items-center gap-1.5 px-3 h-8 text-xs disabled:opacity-50">
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => handleAction(action.id, "reject")}
                    disabled={processingId === action.id}
                    data-testid={`reject-${action.id}`}
                    className="apple-btn-secondary flex items-center gap-1.5 px-3 h-8 text-xs"
                    style={{ color: "#FF3B30", borderColor: "rgb(var(--border))" }}>
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
              <div className="px-5 py-4">
                <p className="text-xs font-['Plus_Jakarta_Sans'] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                  <Mail size={10} className="inline mr-1" /> Generated Email
                </p>
                <pre className="text-foreground text-sm font-['Plus_Jakarta_Sans'] whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                  {action.email_content}
                </pre>
              </div>
              <div className="px-5 py-2 border-t border-border flex items-center gap-4">
                <span className="text-[10px] font-['JetBrains_Mono'] text-muted-foreground">Model: {action.ai_model}</span>
                <span className="text-[10px] font-['JetBrains_Mono'] text-muted-foreground">
                  {new Date(action.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
