import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Bell, Mail, CheckCircle, Clock, Loader2, Copy, Check, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const daysAgo = (d) => Math.floor((Date.now() - new Date(d)) / 86400000);

export default function FollowupsPage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [emailDraft, setEmailDraft] = useState(null);
  const [copied, setCopied] = useState(false);
  const [markingId, setMarkingId] = useState(null);

  useEffect(() => {
    axios.get(`${API}/followups`).then(r=>setCandidates(r.data)).catch(()=>toast.error("Failed to load")).finally(()=>setLoading(false));
  }, []);

  const generateEmail = async (app) => {
    setGenerating(app.id);
    try { const r = await axios.post(`${API}/followups/${app.id}/generate`); setEmailDraft(r.data); }
    catch { toast.error("Failed to generate email"); }
    finally { setGenerating(null); }
  };

  const markSent = async (id) => {
    setMarkingId(id);
    try {
      await axios.post(`${API}/followups/${id}/mark-sent`);
      setCandidates(p=>p.filter(c=>c.id!==id)); setEmailDraft(null);
      toast.success("Marked as sent!");
    } catch { toast.error("Failed to update"); }
    finally { setMarkingId(null); }
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(emailDraft.email_draft);
    setCopied(true); setTimeout(()=>setCopied(false),2000);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="p-7 md:p-9 space-y-6 min-h-full" data-testid="followups-page">
      <div className="flex items-center gap-3">
        <Link to="/dashboard">
          <button className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted border border-border transition-colors">
            <ArrowLeft size={14} />
          </button>
        </Link>
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground">Follow-up Manager</h1>
          <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-0.5">Applications with no response after 7+ days</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: "rgb(var(--primary))" }} /></div>
      ) : candidates.length === 0 ? (
        <div className="text-center py-20 apple-card">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-muted">
            <CheckCircle size={26} className="text-green-500" />
          </div>
          <p className="text-foreground font-['Plus_Jakarta_Sans'] text-lg font-semibold">All caught up!</p>
          <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans'] mt-1">No applications need a follow-up right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-3">
            <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] font-bold uppercase tracking-widest">
              {candidates.length} need follow-up
            </p>
            {candidates.map(app=>(
              <div key={app.id} onClick={()=>!generating&&generateEmail(app)} data-testid={`followup-card-${app.id}`}
                className={`apple-card p-4 cursor-pointer hover:-translate-y-0.5 transition-all duration-200 ${emailDraft?.app_id===app.id ? "ring-2 ring-orange-400/30" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-muted border border-border">
                      <span className="text-foreground font-['Plus_Jakarta_Sans'] text-sm font-bold">{app.company[0]?.toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] font-semibold">{app.role}</p>
                      <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">{app.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Clock size={11} className="text-orange-500" />
                    <span className="text-orange-500 text-xs font-['JetBrains_Mono']">{daysAgo(app.applied_date)}d</span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">
                    {generating===app.id ? "Generating email..." : "Click to generate follow-up"}
                  </span>
                  {generating===app.id ? <Loader2 size={12} className="text-orange-500 animate-spin" /> : <Mail size={12} className="text-orange-500" />}
                </div>
              </div>
            ))}
          </div>

          {/* Email Panel */}
          <div className="apple-card overflow-hidden">
            {emailDraft ? (
              <>
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                  <div>
                    <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] font-semibold">{emailDraft.company}</p>
                    <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">{emailDraft.role}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyEmail} data-testid="copy-email-btn"
                      className="apple-btn-secondary flex items-center gap-1.5 px-3 h-8 text-xs" style={{ color: "rgb(var(--primary))", borderColor: "rgb(var(--border))" }}>
                      {copied ? <Check size={11} /> : <Copy size={11} />}{copied ? "Copied!" : "Copy"}
                    </button>
                    <button onClick={()=>markSent(emailDraft.app_id)} disabled={!!markingId} data-testid="mark-sent-btn"
                      className="apple-btn-primary flex items-center gap-1.5 px-3 h-8 text-xs disabled:opacity-50">
                      <CheckCircle size={11} />Mark Sent
                    </button>
                  </div>
                </div>
                <div className="p-5 overflow-y-auto max-h-[420px]">
                  <pre className="text-foreground text-sm font-['Plus_Jakarta_Sans'] whitespace-pre-wrap leading-relaxed">{emailDraft.email_draft}</pre>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-muted">
                  <Mail size={20} className="text-orange-500" />
                </div>
                <p className="text-foreground font-['Plus_Jakarta_Sans'] text-sm font-semibold">Select an application</p>
                <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] mt-1">Click a card to generate an AI follow-up email</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
