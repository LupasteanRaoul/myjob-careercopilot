import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Shield, Download, Trash2, Eye, ToggleLeft, ToggleRight, AlertTriangle, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function PrivacyCenter() {
  const { user, logout } = useAuth();
  const [consent, setConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportModal, setExportModal] = useState(false);

  useEffect(() => {
    axios.get(`${API}/user/consent`).then(r => setConsent(r.data)).catch(() => toast.error("Failed to load consent data")).finally(() => setLoading(false));
  }, []);

  const toggleConsent = async (field, value) => {
    try {
      await axios.put(`${API}/user/consent`, { [field]: value });
      setConsent(prev => ({ ...prev, [field]: value }));
      toast.success("Privacy settings updated");
    } catch { toast.error("Failed to update"); }
  };

  const handleExportData = async () => {
    setExportLoading(true);
    try {
      const res = await axios.post(`${API}/user/export-data`, { password: exportPassword }, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `myjob_data_export_${new Date().toISOString().split("T")[0]}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportModal(false);
      setExportPassword("");
      toast.success("Data exported successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Export failed. Check your password.");
    } finally { setExportLoading(false); }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { toast.error("Please confirm deletion"); return; }
    setDeleting(true);
    try {
      const res = await axios.delete(`${API}/user/account`, { data: { password: deletePassword, confirm: true } });
      toast.success(res.data.message);
      setDeleteModal(false);
      setTimeout(() => logout(), 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Deletion failed");
    } finally { setDeleting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={22} className="animate-spin" style={{ color: "rgb(var(--primary))" }} />
      </div>
    );
  }

  return (
    <div className="p-7 md:p-9 space-y-6 min-h-full max-w-3xl" data-testid="privacy-center">
      {/* Header */}
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(var(--primary), 0.1)" }}>
            <Shield size={18} style={{ color: "rgb(var(--primary))" }} />
          </div>
          Privacy Center
        </h1>
        <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-1">GDPR-compliant data management</p>
      </div>

      {/* Auth Provider Badge */}
      <div className="apple-card p-5" data-testid="auth-info">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-['Plus_Jakarta_Sans'] font-bold text-foreground">Authentication</p>
            <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mt-0.5">{user?.email}</p>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-['Plus_Jakarta_Sans'] font-semibold flex items-center gap-1.5"
            style={user?.auth_provider === "microsoft"
              ? { background: "#E8F0FE", color: "#0078D4" }
              : { background: "#EFF4FB", color: "#0071E3" }
            }>
            {user?.auth_provider === "microsoft" ? (
              <>
                <svg width="12" height="12" viewBox="0 0 21 21"><rect x="1" y="1" width="9" height="9" fill="#F25022"/><rect x="11" y="1" width="9" height="9" fill="#7FBA00"/><rect x="1" y="11" width="9" height="9" fill="#00A4EF"/><rect x="11" y="11" width="9" height="9" fill="#FFB900"/></svg>
                Microsoft SSO
              </>
            ) : "Local Auth"}
          </span>
        </div>
      </div>

      {/* Consent Toggles */}
      <div className="apple-card overflow-hidden" data-testid="consent-settings">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground">Data Processing Consent</h2>
          <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mt-0.5">Control how your data is used</p>
        </div>

        <div className="divide-y divide-border">
          {/* AI Processing */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">AI Processing</p>
              <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mt-0.5">
                Allow AI to analyze your applications and generate recommendations
              </p>
            </div>
            <button onClick={() => toggleConsent("ai_processing_opt_in", !consent?.ai_processing_opt_in)}
              data-testid="toggle-ai-processing"
              className="flex-shrink-0 ml-4 transition-colors">
              {consent?.ai_processing_opt_in ? (
                <ToggleRight size={32} className="text-green-500" />
              ) : (
                <ToggleLeft size={32} className="text-muted-foreground" />
              )}
            </button>
          </div>

          {/* Marketing */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-['Plus_Jakarta_Sans'] font-semibold text-foreground">Marketing Communications</p>
              <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mt-0.5">
                Receive tips, updates, and career advice via email
              </p>
            </div>
            <button onClick={() => toggleConsent("marketing_opt_in", !consent?.marketing_opt_in)}
              data-testid="toggle-marketing"
              className="flex-shrink-0 ml-4 transition-colors">
              {consent?.marketing_opt_in ? (
                <ToggleRight size={32} className="text-green-500" />
              ) : (
                <ToggleLeft size={32} className="text-muted-foreground" />
              )}
            </button>
          </div>
        </div>

        <div className="px-5 py-3 bg-muted/50">
          <p className="text-[10px] text-muted-foreground font-['Plus_Jakarta_Sans']">
            Last updated: {consent?.consent_timestamp ? new Date(consent.consent_timestamp).toLocaleDateString() : "N/A"}
            &nbsp;&middot;&nbsp; Data retained for {consent?.data_retention_days || 365} days
          </p>
        </div>
      </div>

      {/* Data Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Data */}
        <div className="apple-card p-5" data-testid="export-data-card">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#EFF4FB" }}>
              <Download size={16} style={{ color: "#0071E3" }} />
            </div>
            <div>
              <p className="text-sm font-['Plus_Jakarta_Sans'] font-bold text-foreground">Export My Data</p>
              <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans']">GDPR Right to Portability</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mb-3">
            Download all your data in a ZIP file including profile, applications, AI interactions, and chat history.
          </p>
          <button onClick={() => setExportModal(true)} data-testid="export-data-btn"
            className="apple-btn-primary w-full h-9 text-sm flex items-center justify-center gap-2">
            <Download size={13} /> Download My Data
          </button>
        </div>

        {/* Delete Account */}
        <div className="apple-card p-5" data-testid="delete-account-card">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#FFEDEC" }}>
              <Trash2 size={16} style={{ color: "#FF3B30" }} />
            </div>
            <div>
              <p className="text-sm font-['Plus_Jakarta_Sans'] font-bold text-foreground">Delete Account</p>
              <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans']">GDPR Right to be Forgotten</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans'] mb-3">
            Schedule account deletion. You have 30 days to cancel. All data will be permanently removed.
          </p>
          <button onClick={() => setDeleteModal(true)} data-testid="delete-account-btn"
            className="w-full h-9 text-sm flex items-center justify-center gap-2 rounded-full font-['Plus_Jakarta_Sans'] font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "#FF3B30" }}>
            <Trash2 size={13} /> Delete Account
          </button>
        </div>
      </div>

      {/* Privacy Info */}
      <div className="apple-card p-5" data-testid="privacy-info">
        <h3 className="text-sm font-['Plus_Jakarta_Sans'] font-bold text-foreground mb-3">How We Protect Your Data</h3>
        <ul className="space-y-2">
          {[
            "PII is automatically scrubbed before sending to AI services",
            "Passwords are hashed with bcrypt (never stored in plain text)",
            "All data transfers are encrypted with HTTPS",
            "No data is shared with third parties without consent",
            "You can export or delete your data at any time",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <CheckCircle size={13} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground font-['Plus_Jakarta_Sans']">{item}</p>
            </li>
          ))}
        </ul>
      </div>

      {/* Export Modal */}
      <Dialog open={exportModal} onOpenChange={setExportModal}>
        <DialogContent className="max-w-sm" style={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))" }} data-testid="export-modal">
          <DialogHeader>
            <DialogTitle className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-foreground">Export Data</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans']">
            {user?.auth_provider === "microsoft"
              ? "Click export to download your data."
              : "Enter your password to confirm the export."}
          </p>
          {user?.auth_provider !== "microsoft" && (
            <input type="password" value={exportPassword} onChange={e => setExportPassword(e.target.value)}
              placeholder="Your password" data-testid="export-password-input"
              className="apple-input w-full h-10 px-3 text-sm mt-2"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--input))", color: "rgb(var(--foreground))" }} />
          )}
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => { setExportModal(false); setExportPassword(""); }}
              className="apple-btn-secondary px-4 py-2 text-sm"
              style={{ color: "rgb(var(--muted-foreground))", borderColor: "rgb(var(--border))" }}>Cancel</button>
            <button onClick={handleExportData} disabled={exportLoading || (user?.auth_provider !== "microsoft" && !exportPassword)}
              data-testid="confirm-export-btn"
              className="apple-btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50">
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogContent className="max-w-sm" style={{ background: "rgb(var(--card))", border: "1px solid rgb(var(--border))" }} data-testid="delete-modal">
          <DialogHeader>
            <DialogTitle className="font-['Plus_Jakarta_Sans'] text-lg font-bold text-foreground flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans']">
            Your account will be scheduled for deletion in 30 days. You can cancel within this period.
          </p>
          {user?.auth_provider !== "microsoft" && (
            <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)}
              placeholder="Your password" data-testid="delete-password-input"
              className="apple-input w-full h-10 px-3 text-sm mt-2"
              style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--input))", color: "rgb(var(--foreground))" }} />
          )}
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input type="checkbox" checked={deleteConfirm} onChange={e => setDeleteConfirm(e.target.checked)}
              data-testid="delete-confirm-checkbox" className="w-4 h-4 rounded" />
            <span className="text-sm text-foreground font-['Plus_Jakarta_Sans']">I understand this action cannot be undone</span>
          </label>
          <DialogFooter className="gap-2 mt-2">
            <button onClick={() => { setDeleteModal(false); setDeletePassword(""); setDeleteConfirm(false); }}
              className="apple-btn-secondary px-4 py-2 text-sm"
              style={{ color: "rgb(var(--muted-foreground))", borderColor: "rgb(var(--border))" }}>Cancel</button>
            <button onClick={handleDeleteAccount}
              disabled={deleting || !deleteConfirm || (user?.auth_provider !== "microsoft" && !deletePassword)}
              data-testid="confirm-delete-account-btn"
              className="px-4 py-2 rounded-full text-sm font-['Plus_Jakarta_Sans'] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
              style={{ background: "#FF3B30" }}>
              {deleting ? <Loader2 size={14} className="animate-spin" /> : "Delete Account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
