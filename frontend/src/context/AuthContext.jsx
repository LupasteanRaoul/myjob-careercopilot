import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const setAuthTokens = (accessToken) => {
    localStorage.setItem("myjob_access_token", accessToken);
    axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
  };

  useEffect(() => {
    const token = localStorage.getItem("myjob_access_token");
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      axios.get(`${API}/auth/me`)
        .then(res => setUser(res.data))
        .catch(async () => {
          const refresh = localStorage.getItem("myjob_refresh_token");
          if (refresh) {
            try {
              const r = await axios.post(`${API}/auth/refresh`, { refresh_token: refresh });
              setAuthTokens(r.data.access_token);
              localStorage.setItem("myjob_refresh_token", r.data.refresh_token);
              const me = await axios.get(`${API}/auth/me`);
              setUser(me.data);
            } catch {
              localStorage.removeItem("myjob_access_token");
              localStorage.removeItem("myjob_refresh_token");
              delete axios.defaults.headers.common["Authorization"];
            }
          } else {
            localStorage.removeItem("myjob_access_token");
            delete axios.defaults.headers.common["Authorization"];
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, refresh_token, user: userData } = res.data;
    setAuthTokens(access_token);
    localStorage.setItem("myjob_refresh_token", refresh_token);
    setUser(userData);
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    const { access_token, refresh_token, user: userData } = res.data;
    setAuthTokens(access_token);
    localStorage.setItem("myjob_refresh_token", refresh_token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem("myjob_access_token");
    localStorage.removeItem("myjob_refresh_token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const refreshUser = useCallback(async () => {
    const res = await axios.get(`${API}/auth/me`);
    setUser(res.data);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
