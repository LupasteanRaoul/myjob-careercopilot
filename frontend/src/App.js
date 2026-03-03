import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import ApplicationsPage from "./pages/ApplicationsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import ChatPage from "./pages/ChatPage";
import ResumePage from "./pages/ResumePage";
import FollowupsPage from "./pages/FollowupsPage";
import AIAgentPage from "./pages/AIAgentPage";
import AdminDashboard from "./pages/AdminDashboard";
import PrivacyCenter from "./pages/PrivacyCenter";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen page-bg dark ambient-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/" replace />;
}

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();

  useEffect(() => {
    const accessToken = searchParams.get("access_token");
    const refreshToken = searchParams.get("refresh_token");
    if (accessToken && refreshToken) {
      loginWithTokens(accessToken, refreshToken).then(() => {
        navigate("/dashboard", { replace: true });
      });
    } else {
      navigate("/", { replace: true });
    }
  }, [searchParams, navigate, loginWithTokens]);

  return (
    <div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground font-['Plus_Jakarta_Sans'] text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [theme, setTheme] = useState(() => localStorage.getItem("myjob_theme") || "light");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("myjob_theme", next);
  };

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "dark") {
      html.classList.add("dark");
      html.classList.remove("light");
    } else {
      html.classList.remove("dark");
      html.classList.add("light");
    }
  }, [theme]);

  useEffect(() => {
    const saved = localStorage.getItem("myjob_theme") || "light";
    if (saved === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Layout theme={theme} onToggleTheme={toggleTheme}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute><ApplicationsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/resume" element={<ProtectedRoute><ResumePage /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/followups" element={<ProtectedRoute><FollowupsPage /></ProtectedRoute>} />
        <Route path="/ai-agent" element={<ProtectedRoute><AIAgentPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/privacy" element={<ProtectedRoute><PrivacyCenter /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
