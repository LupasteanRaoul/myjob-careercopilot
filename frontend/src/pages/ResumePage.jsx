import { useState, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Upload, FileText, X, Target, CheckCircle, AlertCircle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

function ScoreGauge({ score, label, color }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const dash = pct * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10" stroke="rgb(var(--border))" />
          <circle cx="60" cy="60" r={radius} fill="none" strokeWidth="10"
            stroke={color} strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray 1.2s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-['Plus_Jakarta_Sans'] text-4xl font-black" style={{ color, lineHeight: 1 }}>{score}</span>
          <span className="text-muted-foreground text-[10px] font-['Plus_Jakarta_Sans'] font-bold uppercase tracking-wider mt-0.5">ATS Score</span>
        </div>
      </div>
      <span className="font-['Plus_Jakarta_Sans'] text-sm font-bold mt-2" style={{ color }}>{label}</span>
    </div>
  );
}

function KeywordBadge({ word, type }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-['Plus_Jakarta_Sans'] font-semibold"
      style={type === "match"
        ? { background: "#EDF8F1", color: "#1A7F3C" }
        : { background: "#FFEDEC", color: "#C0392B" }}>
      {type === "match" ? <CheckCircle size={10} /> : <X size={10} />}
      {word}
    </span>
  );
}

function Section({ title, items, icon: Icon, color }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="apple-card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-border hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}14` }}>
            <Icon size={14} style={{ color }} strokeWidth={2} />
          </div>
          <span className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <ul className="px-5 py-3 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
              <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] leading-relaxed">{item}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ResumePage() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDesc, setJobDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  const handleFile = (file) => {
    if (!file?.name.endsWith(".pdf")) { toast.error("Only PDF files supported"); return; }
    setResumeFile(file);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!resumeFile || !jobDesc.trim()) {
      toast.error("Upload your resume and paste a job description");
      return;
    }
    if (jobDesc.trim().length < 50) {
      toast.error("Job description too short — paste more text");
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", resumeFile);
      fd.append("job_description", jobDesc.trim());
      const res = await axios.post(`${API}/resume/analyze`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setResult(res.data);
      setTimeout(() => document.getElementById("resume-results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Analysis failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResumeFile(null); setJobDesc(""); setResult(null); };

  const inputStyle = { borderColor: "rgb(var(--border))", background: "rgb(var(--input))", color: "rgb(var(--foreground))" };

  return (
    <div className="p-7 md:p-9 space-y-6 min-h-full" data-testid="resume-page">

      {/* Header */}
      <div>
        <h1 className="font-['Plus_Jakarta_Sans'] text-[28px] font-bold tracking-tight text-foreground">Resume Optimizer</h1>
        <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm mt-0.5">
          Upload your CV + paste a job description → get your ATS score and tailored improvements
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: Inputs */}
        <div className="space-y-5">

          {/* PDF Upload */}
          <div className="apple-card p-5">
            <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <FileText size={15} style={{ color: "rgb(var(--primary))" }} />
              Your Resume (PDF)
            </p>

            {resumeFile ? (
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "#EFF4FB", border: "1px solid #B8D4F5" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#0071E3" }}>
                    <FileText size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-['Plus_Jakarta_Sans'] font-semibold" style={{ color: "#0071E3" }}>{resumeFile.name}</p>
                    <p className="text-xs font-['Plus_Jakarta_Sans']" style={{ color: "#5B9BD5" }}>
                      {(resumeFile.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                </div>
                <button onClick={() => setResumeFile(null)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-blue-400 hover:bg-blue-100 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                className="flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all"
                style={dragOver
                  ? { borderColor: "rgb(var(--primary))", background: "#EFF4FB" }
                  : { borderColor: "rgb(var(--border))", background: "rgb(var(--muted))" }}
                data-testid="resume-upload-area"
              >
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: dragOver ? "#EFF4FB" : "rgb(var(--card))", border: "1px solid rgb(var(--border))" }}>
                  <Upload size={20} style={{ color: "rgb(var(--primary))" }} strokeWidth={1.8} />
                </div>
                <div className="text-center">
                  <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] font-semibold">Drop your PDF here</p>
                  <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] mt-0.5">or click to browse</p>
                </div>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden"
                  onChange={e => handleFile(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* Job Description */}
          <div className="apple-card p-5">
            <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-3 flex items-center gap-2">
              <Target size={15} style={{ color: "rgb(var(--primary))" }} />
              Job Description
            </p>
            <textarea
              value={jobDesc}
              onChange={e => setJobDesc(e.target.value)}
              placeholder="Paste the full job description here — the more text, the more accurate the analysis..."
              rows={10}
              data-testid="job-description-input"
              className="apple-input w-full px-3 py-2.5 text-sm resize-none font-['Plus_Jakarta_Sans'] leading-relaxed"
              style={inputStyle}
            />
            <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] mt-2">
              {jobDesc.length} characters · Recommended: 300+
            </p>
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={loading || !resumeFile || !jobDesc.trim()}
            data-testid="analyze-btn"
            className="apple-btn-primary w-full h-12 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing with AI...
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Analyze Resume
              </>
            )}
          </button>

          {result && (
            <button onClick={reset} className="apple-btn-secondary w-full h-10 text-sm"
              style={{ color: "rgb(var(--muted-foreground))", borderColor: "rgb(var(--border))" }}>
              Start New Analysis
            </button>
          )}
        </div>

        {/* RIGHT: Results */}
        <div id="resume-results">
          {!result && !loading && (
            <div className="apple-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-muted">
                <Sparkles size={28} className="text-muted-foreground opacity-40" strokeWidth={1.5} />
              </div>
              <p className="font-['Plus_Jakarta_Sans'] text-base font-semibold text-foreground mb-1">Ready to analyze</p>
              <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans'] max-w-xs leading-relaxed">
                Upload your CV and paste the job description, then click Analyze
              </p>
            </div>
          )}

          {loading && (
            <div className="apple-card p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
              <div className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin mb-4"
                style={{ border: "3px solid rgb(var(--border))", borderTopColor: "rgb(var(--primary))" }} />
              <p className="font-['Plus_Jakarta_Sans'] text-sm font-semibold text-foreground">Analyzing resume...</p>
              <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] mt-1">Comparing keywords · Scoring fit · Generating tips</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in-up" data-testid="resume-results">

              {/* Score Card */}
              <div className="apple-card p-6 flex flex-col sm:flex-row items-center gap-6">
                <ScoreGauge score={result.ats_score} label={result.score_label} color={result.score_color || "#0071E3"} />
                <div className="flex-1">
                  <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-2">Overall Assessment</p>
                  <p className="text-muted-foreground text-sm font-['Plus_Jakarta_Sans'] leading-relaxed">
                    {result.overall_assessment}
                  </p>
                </div>
              </div>

              {/* Keywords */}
              <div className="apple-card p-5">
                <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-4">Keyword Analysis</p>
                {result.matching_keywords?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-['Plus_Jakarta_Sans'] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Matching ({result.matching_keywords.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.matching_keywords.map(k => <KeywordBadge key={k} word={k} type="match" />)}
                    </div>
                  </div>
                )}
                {result.missing_keywords?.length > 0 && (
                  <div>
                    <p className="text-xs font-['Plus_Jakarta_Sans'] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                      Missing ({result.missing_keywords.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {result.missing_keywords.map(k => <KeywordBadge key={k} word={k} type="missing" />)}
                    </div>
                  </div>
                )}
              </div>

              {/* Strengths */}
              {result.strengths?.length > 0 && (
                <Section title="Strengths" items={result.strengths} icon={CheckCircle} color="#34C759" />
              )}

              {/* Improvements */}
              {result.improvements?.length > 0 && (
                <Section title="What to Improve" items={result.improvements} icon={AlertCircle} color="#FF9500" />
              )}

              {/* Tailored Summary */}
              {result.tailored_summary && (
                <div className="apple-card p-5">
                  <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <Sparkles size={14} style={{ color: "rgb(var(--primary))" }} />
                    AI-Tailored Summary
                  </p>
                  <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] leading-relaxed italic">
                    "{result.tailored_summary}"
                  </p>
                  <button
                    onClick={() => { navigator.clipboard.writeText(result.tailored_summary); toast.success("Copied!"); }}
                    className="apple-btn-secondary mt-3 px-4 py-2 text-xs" style={{ color: "rgb(var(--primary))", borderColor: "rgb(var(--border))" }}>
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
