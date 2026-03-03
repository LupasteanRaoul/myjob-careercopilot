import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Send, Bot, User, MessageSquare, RefreshCw, Mic, ChevronDown } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const SUGGESTIONS = [
  "How many applications did I send this month?",
  "What's my interview conversion rate?",
  "Tips to improve my response rate?",
  "Which companies have I applied to most?",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-3 ${isUser?"flex-row-reverse":"flex-row"} items-start`} data-testid={`chat-message-${msg.role}`}>
      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border border-border"
        style={{ background: isUser ? "#EFF4FB" : "rgb(var(--muted))" }}>
        {isUser ? <User size={12} style={{ color: "#0071E3" }} /> : <Bot size={12} className="text-muted-foreground" />}
      </div>
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm font-['Plus_Jakarta_Sans'] leading-relaxed ${isUser?"rounded-tr-sm":"rounded-tl-sm"}`}
        style={isUser
          ? { background: "#0071E3", color: "#fff" }
          : { background: "rgb(var(--card))", border: "1px solid rgb(var(--border))", color: "rgb(var(--foreground))" }}>
        {msg.content}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mode, setMode] = useState("assistant");
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobPicker, setShowJobPicker] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (mode==="interview") axios.get(`${API}/applications`).then(r=>setJobs(r.data.filter(a=>a.status!=="Rejected"&&a.status!=="Ghosted"))); }, [mode]);

  const sendMessage = async (text) => {
    const content = text || input.trim();
    if (!content) return;
    if (mode==="interview"&&!selectedJob) { toast.error("Select a job for mock interview"); setShowJobPicker(true); return; }
    setInput("");
    setMessages(p=>[...p,{role:"user",content}]);
    setLoading(true);
    try {
      const r = await axios.post(`${API}/chat`, { message: content, session_id: sessionId, mode, job_id: mode==="interview"?selectedJob?.id:undefined });
      setSessionId(r.data.session_id);
      setMessages(p=>[...p,{role:"assistant",content:r.data.response}]);
    } catch { toast.error("Failed to get AI response"); setMessages(p=>[...p,{role:"assistant",content:"Sorry, I encountered an error. Please try again."}]); }
    finally { setLoading(false); }
  };

  const clearChat = () => { setMessages([]); setSessionId(null); };
  const switchMode = (m) => { setMode(m); clearChat(); setSelectedJob(null); };

  return (
    <div className="flex flex-col h-full" data-testid="chat-page">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: mode==="interview" ? "#FFF5E6" : "#EFF4FB" }}>
            {mode==="interview" ? <Mic size={15} className="text-orange-500" /> : <Bot size={15} style={{ color: "#0071E3" }} />}
          </div>
          <div>
            <h1 className="font-['Plus_Jakarta_Sans'] text-sm font-bold text-foreground">
              {mode==="interview" ? "Mock Interview" : "AI Career Assistant"}
            </h1>
            <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">
              {mode==="interview" ? "Practice with an AI interviewer" : "Powered by GPT-4o mini"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl p-0.5 gap-0.5 border border-border bg-muted">
            {[["assistant","Assistant",Bot],["interview","Interview",Mic]].map(([m,l,Icon])=>(
              <button key={m} onClick={()=>switchMode(m)} data-testid={`mode-${m}`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-['Plus_Jakarta_Sans'] font-semibold transition-all ${
                  mode===m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <Icon size={11} />{l}
              </button>
            ))}
          </div>
          {messages.length>0 && (
            <button onClick={clearChat} data-testid="clear-chat-btn"
              className="flex items-center gap-1.5 px-3 h-8 rounded-xl text-xs font-['Plus_Jakarta_Sans'] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border border-border">
              <RefreshCw size={11} />New
            </button>
          )}
        </div>
      </div>

      {/* Interview Job Picker */}
      {mode==="interview" && (
        <div className="px-6 py-3 border-b border-border bg-card">
          <div className="relative max-w-sm">
            <button onClick={()=>setShowJobPicker(!showJobPicker)} data-testid="job-picker-btn"
              className="apple-input flex items-center justify-between w-full px-3 py-2 text-sm" style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--input))", color: "rgb(var(--foreground))" }}>
              <span className={selectedJob?"text-foreground font-semibold font-['Plus_Jakarta_Sans']":"text-muted-foreground font-['Plus_Jakarta_Sans']"}>
                {selectedJob ? `${selectedJob.role} @ ${selectedJob.company}` : "Select a job for interview practice"}
              </span>
              <ChevronDown size={13} className="text-muted-foreground ml-2 flex-shrink-0" />
            </button>
            {showJobPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-20 apple-card max-h-48 overflow-y-auto">
                {jobs.length===0 ? <p className="text-muted-foreground text-xs p-3 font-['Plus_Jakarta_Sans']">No active applications</p>
                  : jobs.map(job=>(
                    <button key={job.id} onClick={()=>{setSelectedJob(job);setShowJobPicker(false);}}
                      className="w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b border-border last:border-0">
                      <p className="text-foreground text-sm font-['Plus_Jakarta_Sans'] font-semibold">{job.role}</p>
                      <p className="text-muted-foreground text-xs font-['Plus_Jakarta_Sans']">{job.company}</p>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 page-bg" data-testid="chat-messages">
        {messages.length===0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-10">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border border-border bg-card shadow-sm">
              {mode==="interview" ? <Mic size={24} className="text-orange-500" /> : <MessageSquare size={24} style={{ color: "#0071E3" }} />}
            </div>
            <div>
              <h2 className="font-['Plus_Jakarta_Sans'] text-xl font-bold text-foreground mb-2">
                {mode==="interview" ? "Mock Interview Mode" : "AI Career Assistant"}
              </h2>
              <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm max-w-md leading-relaxed">
                {mode==="interview"
                  ? "Select a job and I'll conduct a realistic mock interview with technical and behavioral questions."
                  : "Ask me anything about your job search. I have access to your applications data."}
              </p>
            </div>
            {mode==="assistant" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
                {SUGGESTIONS.map((s,i)=>(
                  <button key={i} onClick={()=>sendMessage(s)} data-testid={`suggestion-${i}`}
                    className="text-left px-4 py-3 rounded-xl text-muted-foreground text-xs font-['Plus_Jakarta_Sans'] hover:text-foreground transition-all apple-card hover:shadow-md">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {mode==="interview"&&selectedJob && (
              <button onClick={()=>sendMessage("Let's start the interview!")} data-testid="start-interview-btn"
                className="apple-btn-primary flex items-center gap-2 px-6 py-2.5 text-sm">
                <Mic size={14} />Start Interview for {selectedJob.role}
              </button>
            )}
          </div>
        )}
        {messages.map((msg,i)=><Message key={i} msg={msg} />)}
        {loading && (
          <div className="flex gap-3 items-start" data-testid="chat-loading">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border border-border bg-card">
              <Bot size={12} className="text-muted-foreground" />
            </div>
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm apple-card">
              <div className="flex gap-1.5 items-center">
                {[0,150,300].map(d=><span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce bg-muted-foreground opacity-60" style={{animationDelay:`${d}ms`}} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border bg-card">
        <div className="flex gap-2 items-center">
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
            placeholder={mode==="interview"?"Type your answer...":"Ask about your job search..."}
            data-testid="chat-input" disabled={loading}
            className="apple-input flex-1 h-11 px-4 text-sm disabled:opacity-50"
            style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--input))", color: "rgb(var(--foreground))" }} />
          <button onClick={()=>sendMessage()} disabled={!input.trim()||loading} data-testid="send-chat-btn"
            className="apple-btn-primary h-11 w-11 flex items-center justify-center flex-shrink-0 rounded-xl disabled:opacity-40">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
