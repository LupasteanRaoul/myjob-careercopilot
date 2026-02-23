import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, ExternalLink, X, Sparkles, Link2, Loader2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const STATUSES = ["Applied", "Interview", "Offer", "Rejected", "Ghosted"];
const STATUS_CONFIG = {
  Applied:   { color: "#0071E3", bg: "#EFF4FB" },
  Interview: { color: "#FF9500", bg: "#FFF5E6" },
  Offer:     { color: "#34C759", bg: "#EDF8F1" },
  Rejected:  { color: "#FF3B30", bg: "#FFEDEC" },
  Ghosted:   { color: "#8E8E93", bg: "#F2F2F7" },
};
const EMPTY_FORM = { company: "", role: "", status: "Applied", location: "", salary_range: "", url: "", notes: "", applied_date: "", tech_stack: [] };
const inputCls = "apple-input w-full h-10 px-3 text-sm";

export default function ApplicationsPage() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editApp, setEditApp] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [showUrlImport, setShowUrlImport] = useState(false);

  const fetchApps = async () => {
    try { const r = await axios.get(`${API}/applications`); setApps(r.data); }
    catch { toast.error("Failed to load applications"); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchApps(); }, []);

  const openAdd = () => { setEditApp(null); setForm(EMPTY_FORM); setModalOpen(true); };
  const openEdit = (app) => {
    setEditApp(app);
    setForm({ company: app.company||"", role: app.role||"", status: app.status||"Applied", location: app.location||"", salary_range: app.salary_range||"", url: app.url||"", notes: app.notes||"", applied_date: app.applied_date?.split("T")[0]||"", tech_stack: app.tech_stack||[] });
    setModalOpen(true);
  };

  // URL Scraper
  const handleScrapeUrl = async () => {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    try {
      const res = await axios.post(`${API}/scrape-job`, { url: scrapeUrl.trim() });
      const d = res.data;
      setForm(f => ({ ...f, company: d.company||"", role: d.role||"", location: d.location||"", salary_range: d.salary_range||"", url: d.url||scrapeUrl, notes: d.notes||"", tech_stack: d.tech_stack||[] }));
      setShowUrlImport(false); setScrapeUrl("");
      setModalOpen(true); setEditApp(null);
      toast.success("Job imported! Review and save.");
    } catch (err) { toast.error(err.response?.data?.detail || "Could not import from this URL"); }
    finally { setScraping(false); }
  };

  const handlePdfParse = async (file) => {
    if (!file?.name.endsWith(".pdf")) { toast.error("Only PDF files supported"); return; }
    setParsing(true); setModalOpen(true); setEditApp(null); setForm(EMPTY_FORM);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await axios.post(`${API}/parse-pdf`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      const d = r.data;
      setForm(f => ({ ...f, company: d.company||"", role: d.role||"", location: d.location||"", salary_range: d.salary_range||"", url: d.url||"", notes: d.notes||"", tech_stack: d.tech_stack||[] }));
      toast.success("PDF parsed! Review and save.");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to parse PDF"); }
    finally { setParsing(false); }
  };

  const handleSave = async () => {
    if (!form.company || !form.role) { toast.error("Company and role are required"); return; }
    setSaving(true);
    const optimistic = { ...form, id: editApp?.id||"temp-"+Date.now(), user_id:"me", updated_at:new Date().toISOString(), xp_earned:10 };
    if (!editApp) setApps(p => [optimistic,...p]);
    try {
      if (editApp) {
        const r = await axios.put(`${API}/applications/${editApp.id}`, form);
        setApps(p => p.map(a => a.id===editApp.id ? r.data : a));
        toast.success("Updated");
      } else {
        const r = await axios.post(`${API}/applications`, form);
        setApps(p => [r.data,...p.filter(a=>a.id!==optimistic.id)]);
        toast.success("Added! +10 XP");
      }
      setModalOpen(false);
    } catch (err) {
      if (!editApp) setApps(p=>p.filter(a=>a.id!==optimistic.id));
      toast.error(err.response?.data?.detail||"Failed to save");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setApps(p=>p.filter(a=>a.id!==id)); setDeleteId(null);
    try { await axios.delete(`${API}/applications/${id}`); toast.success("Deleted"); }
    catch { await fetchApps(); toast.error("Failed to delete"); }
  };

  const filtered = apps.filter(a => filterStatus==="All"||a.status===filterStatus).filter(a => !search||a.company.toLowerCase().includes(search.toLowerCase())||a.role.toLowerCase().includes(search.toLowerCase()));
  const statusCounts = STATUSES.reduce((acc,s)=>{acc[s]=apps.filter(a=>a.status===s).length;return acc;},{});

  const inputStyle = { borderColor: "rgb(var(--border))", background: "rgb(var(--input))", color: "rgb(var(--foreground))" };

  return (
    <div className="p-7 md:p-9 space-y-6 min-h-full" data-testid="applications-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground">Applications</h1>
          <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-0.5">{apps.length} jobs tracked</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowUrlImport(!showUrlImport)} data-testid="url-import-btn"
            className="apple-btn-secondary flex items-center gap-1.5 px-4 h-9 text-sm" style={{ color: "rgb(var(--primary))", borderColor: "rgb(var(--border))" }}>
            <Link2 size={13} />Import URL
          </button>
          <label data-testid="pdf-upload-btn"
            className="apple-btn-secondary flex items-center gap-1.5 px-4 h-9 text-sm cursor-pointer" style={{ color: "rgb(var(--primary))", borderColor: "rgb(var(--border))" }}>
            <Sparkles size={13} />Parse PDF
            <input type="file" accept=".pdf" className="hidden" onChange={e=>handlePdfParse(e.target.files[0])} />
          </label>
          <button onClick={openAdd} data-testid="open-add-modal-btn" className="apple-btn-primary flex items-center gap-1.5 px-4 h-9 text-sm">
            <Plus size={14} />Add
          </button>
        </div>
      </div>

      {/* URL Import Bar */}
      {showUrlImport && (
        <div className="apple-card p-4 animate-fade-in-up" data-testid="url-import-bar">
          <p className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground mb-2 flex items-center gap-2">
            <Link2 size={14} style={{ color: "rgb(var(--primary))" }} />
            Import job from URL
          </p>
          <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mb-3">Paste any job posting URL — the AI will extract details automatically.</p>
          <div className="flex gap-2">
            <input value={scrapeUrl} onChange={e=>setScrapeUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleScrapeUrl()}
              placeholder="https://company.com/jobs/senior-engineer..." data-testid="scrape-url-input"
              className="apple-input flex-1 h-10 px-3 text-sm" style={inputStyle} />
            <button onClick={handleScrapeUrl} disabled={!scrapeUrl.trim()||scraping} data-testid="scrape-url-btn"
              className="apple-btn-primary px-5 h-10 text-sm flex items-center gap-2 disabled:opacity-50">
              {scraping ? <Loader2 size={14} className="animate-spin" /> : "Import"}
            </button>
            <button onClick={()=>{setShowUrlImport(false);setScrapeUrl("");}} className="h-10 w-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={14} />
            </button>
          </div>
          {scraping && <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mt-2 flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" />Fetching and analyzing job posting...</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2" data-testid="status-filters">
        <button onClick={()=>setFilterStatus("All")} data-testid="filter-all"
          className="px-3 py-1.5 rounded-full text-xs font-['Plus_Jakarta_Sans'] font-semibold border transition-all"
          style={filterStatus==="All" ? { background: "#0071E3", color: "#fff", borderColor: "#0071E3" } : { background: "rgb(var(--card))", borderColor: "rgb(var(--border))", color: "rgb(var(--muted-foreground))" }}>
          All ({apps.length})
        </button>
        {STATUSES.map(s => {
          const sc = STATUS_CONFIG[s];
          return (
            <button key={s} onClick={()=>setFilterStatus(s)} data-testid={`filter-${s.toLowerCase()}`}
              className="px-3 py-1.5 rounded-full text-xs font-['Plus_Jakarta_Sans'] font-semibold border transition-all"
              style={filterStatus===s ? { background: sc.bg, color: sc.color, borderColor: sc.color+"44" } : { background: "rgb(var(--card))", borderColor: "rgb(var(--border))", color: "rgb(var(--muted-foreground))" }}>
              {s} ({statusCounts[s]})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} data-testid="search-input"
          className="apple-input w-full h-9 pl-9 pr-8 text-sm" style={inputStyle} />
        {search && <button onClick={()=>setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={12} /></button>}
      </div>

      {/* Table */}
      {loading ? (
        <div className="apple-card overflow-hidden">{Array(5).fill(0).map((_,i)=><div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border animate-pulse"><div className="w-8 h-8 rounded-xl bg-muted" /><div className="flex-1 space-y-1.5"><div className="h-3 rounded-full w-36 bg-muted" /><div className="h-2.5 rounded-full w-24 bg-muted" /></div><div className="h-5 rounded-full w-16 bg-muted" /></div>)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 apple-card">
          <AlertCircle size={28} className="text-muted-foreground mx-auto mb-3 opacity-20" />
          <p className="text-foreground font-['Plus_Jakarta_Sans'] font-semibold">{search||filterStatus!=="All" ? "No results found" : "No applications yet"}</p>
          <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans'] mt-1">{search||filterStatus!=="All" ? "Try different filters" : "Add your first application above"}</p>
        </div>
      ) : (
        <div className="apple-card overflow-hidden" data-testid="applications-table">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Company","Role","Status","Location","Applied","XP",""].map((h,i)=>(
                    <th key={i} className={`text-left px-5 py-3 text-xs font-['Plus_Jakarta_Sans'] font-bold text-muted-foreground uppercase tracking-wider ${i>3?"hidden md:table-cell":""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app,i)=>{
                  const sc=STATUS_CONFIG[app.status]||STATUS_CONFIG.Applied;
                  const dateStr=app.applied_date ? new Date(app.applied_date).toLocaleDateString("en-US",{month:"short",day:"numeric"}):"—";
                  return (
                    <tr key={app.id} className="border-b border-border hover:bg-muted/40 transition-colors group" data-testid={`app-row-${i}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-muted border border-border">
                            <span className="text-foreground font-['Plus_Jakarta_Sans'] text-xs font-bold">{app.company[0]?.toUpperCase()}</span>
                          </div>
                          <span className="text-foreground text-sm font-['Plus_Jakarta_Sans'] font-semibold">{app.company}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><span className="text-foreground text-sm font-['Plus_Jakarta_Sans']">{app.role}</span></td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2.5 py-1 rounded-full font-['Plus_Jakarta_Sans'] font-semibold" style={{ background: sc.bg, color: sc.color }}>{app.status}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">{app.location||"—"}</span></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-muted-foreground text-xs font-['JetBrains_Mono']">{dateStr}</span></td>
                      <td className="px-4 py-3.5 hidden md:table-cell"><span className="text-xs font-['JetBrains_Mono'] font-medium" style={{ color: "rgb(var(--primary))" }}>+{app.xp_earned}</span></td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {app.url && <a href={app.url} target="_blank" rel="noopener noreferrer"><button className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><ExternalLink size={12}/></button></a>}
                          <button onClick={()=>openEdit(app)} data-testid={`edit-btn-${i}`} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 size={12}/></button>
                          <button onClick={()=>setDeleteId(app.id)} data-testid={`delete-btn-${i}`} className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"><Trash2 size={12}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg" style={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))" }} data-testid="app-modal">
          <DialogHeader>
            <DialogTitle className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-foreground flex items-center gap-2">
              {parsing && <Loader2 size={15} className="animate-spin" style={{ color: "rgb(var(--primary))" }} />}
              {parsing ? "Parsing PDF..." : editApp ? "Edit Application" : "New Application"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-1">
            {[["form-company","company","Company *","Google",2],["form-role","role","Role *","Frontend Engineer",2]].map(([tid,field,label,placeholder,span])=>(
              <div key={field} className={`col-span-${span} space-y-1.5`}>
                <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">{label}</Label>
                <input data-testid={tid} value={form[field]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} placeholder={placeholder} className={inputCls} style={inputStyle} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Status</Label>
              <Select value={form.status} onValueChange={v=>setForm(f=>({...f,status:v}))}>
                <SelectTrigger data-testid="form-status" style={{ background: "rgb(var(--input))", borderColor: "rgb(var(--border))", color: "rgb(var(--foreground))" }}><SelectValue /></SelectTrigger>
                <SelectContent style={{ background: "rgb(var(--popover))", borderColor: "rgb(var(--border))" }}>
                  {STATUSES.map(s=><SelectItem key={s} value={s} className="text-foreground font-['Plus_Jakarta_Sans']">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Location</Label>
              <input data-testid="form-location" value={form.location} onChange={e=>setForm(f=>({...f,location:e.target.value}))} placeholder="Remote / NYC" className={inputCls} style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Salary</Label>
              <input data-testid="form-salary" value={form.salary_range} onChange={e=>setForm(f=>({...f,salary_range:e.target.value}))} placeholder="$80k–$120k" className={inputCls} style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Applied Date</Label>
              <input data-testid="form-date" type="date" value={form.applied_date} onChange={e=>setForm(f=>({...f,applied_date:e.target.value}))} className={inputCls} style={inputStyle} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Job URL</Label>
              <input data-testid="form-url" value={form.url} onChange={e=>setForm(f=>({...f,url:e.target.value}))} placeholder="https://..." className={inputCls} style={inputStyle} />
            </div>
            {form.tech_stack?.length>0 && (
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Tech Stack</Label>
                <div className="flex flex-wrap gap-1.5">
                  {form.tech_stack.map((t,i)=>(
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full font-['Plus_Jakarta_Sans'] font-medium" style={{ background: "#EFF4FB", color: "#0071E3" }}>{t}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="col-span-2 space-y-1.5">
              <Label className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Notes</Label>
              <textarea data-testid="form-notes" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Additional notes..." rows={3}
                className="apple-input w-full px-3 py-2 text-sm resize-none" style={inputStyle} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={()=>setModalOpen(false)} className="apple-btn-secondary px-4 py-2 text-sm" style={{ color: "rgb(var(--muted-foreground))", borderColor: "rgb(var(--border))" }}>Cancel</button>
            <button onClick={handleSave} disabled={saving||parsing} data-testid="save-application-btn"
              className="apple-btn-primary px-4 py-2 text-sm disabled:opacity-50">
              {saving ? "Saving..." : editApp ? "Update" : "Add Application"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={()=>setDeleteId(null)}>
        <DialogContent className="max-w-sm" style={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))" }} data-testid="delete-modal">
          <DialogHeader><DialogTitle className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-foreground">Delete Application?</DialogTitle></DialogHeader>
          <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm">This action cannot be undone.</p>
          <DialogFooter className="gap-2">
            <button onClick={()=>setDeleteId(null)} className="apple-btn-secondary px-4 py-2 text-sm" style={{ color: "rgb(var(--muted-foreground))", borderColor: "rgb(var(--border))" }}>Cancel</button>
            <button onClick={()=>handleDelete(deleteId)} data-testid="confirm-delete-btn"
              className="px-4 py-2 rounded-full text-sm font-['Plus_Jakarta_Sans'] font-semibold text-white transition-opacity hover:opacity-85"
              style={{ background: "#FF3B30" }}>Delete</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
