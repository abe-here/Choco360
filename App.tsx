import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FeedbackForm from './components/FeedbackForm';
import Reports from './components/Reports';
import Nomination from './components/Nomination';
import Approvals from './components/Approvals';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import { api } from './services/api';
import { checkSupabaseConnection } from './services/supabase';
import { User, Questionnaire, Nomination as NominationType } from './types';

/**
 * ==========================================
 * 【Choco360 核心入口】
 * ==========================================
 */
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "example";

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<{code: string, message: string} | null>(null);
  
  const [users, setUsers] = useState<User[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [myApprovals, setMyApprovals] = useState<NominationType[]>([]);

  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) { return null; }
  };

  useEffect(() => {
    const initApp = async () => {
      try {
        const { connected, error } = await checkSupabaseConnection();
        setIsDbConnected(connected);
        if (error) setDbError(error);
        if (connected) {
          const user = await api.getCurrentUser();
          if (user) setCurrentUser(user);
        }
      } catch (e: any) { 
        console.error("Init failed:", e);
        setDbError(e.message || String(e));
      } finally { setLoading(false); }
    };
    initApp();
  }, []);

  useEffect(() => {
    const isConfigured = GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes("example");
    if (!currentUser && !loading && (window as any).google && isConfigured) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          ux_mode: 'popup'
        });
        const btnElement = document.getElementById("googleLoginBtn");
        if (btnElement) {
          (window as any).google.accounts.id.renderButton(btnElement, { theme: "filled_blue", size: "large", width: 320, shape: "pill", text: "continue_with" });
        }
      } catch (err) { console.error("Google SDK error:", err); }
    }
  }, [currentUser, loading]);

  const handleGoogleResponse = async (response: any) => {
    const payload = parseJwt(response.credential);
    if (payload && payload.email) {
      setLoading(true);
      setAuthError(null);
      try {
        const user = await api.login(payload.email);
        setCurrentUser(user);
      } catch (err: any) {
        setAuthError({ code: 'login_error', message: err.message || '登入失敗，請確認是否為公司帳號' });
      } finally { setLoading(false); }
    }
  };

  useEffect(() => {
    if (currentUser && isDbConnected) {
      const fetchData = async () => {
        try {
          const [u, q, n] = await Promise.all([
            api.getUsers(),
            api.getQuestionnaires(),
            api.getNominationsForManager(currentUser.email)
          ]);
          setUsers(u);
          setQuestionnaires(q);
          setMyApprovals(n);
        } catch (err) { console.error("Data fetch error:", err); }
      };
      fetchData();
    }
  }, [currentUser, isDbConnected]);

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleUserUpdate = (updated: User) => {
    setCurrentUser(updated);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  };

  if (isDbConnected === false) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] border-2 border-rose-100 shadow-2xl space-y-6">
          <h1 className="text-2xl font-black text-slate-900">資料庫連線中斷</h1>
          <p className="text-slate-500 text-sm">請確認 Supabase 設定正確且專案未被暫停。</p>
          {dbError && (
            <div className="p-3 bg-rose-50 rounded-xl text-[10px] text-rose-600 font-mono break-all line-clamp-3">
              Error: {dbError}
            </div>
          )}
          <button onClick={() => window.location.reload()} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl">重新整理</button>
        </div>
      </div>
    );
  }

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center animate-pulse">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl mb-4">
          <span className="text-white font-black text-xl">C</span>
        </div>
        <p className="font-black text-slate-400 text-[10px] uppercase tracking-widest">Security Authenticating...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
        <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center mb-10 space-y-4">
            <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl mx-auto rotate-3">
              <span className="text-white font-black text-3xl">C</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Choco360</h1>
            <p className="text-slate-400 font-bold text-sm tracking-widest uppercase italic">Internal Growth Platform</p>
          </div>
          <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl space-y-8 text-center">
            {authError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest leading-relaxed">
                {authError.message}
              </div>
            )}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Google 企業帳號登入</label>
              <div id="googleLoginBtn" className="flex justify-center"></div>
            </div>
            <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Internal System Access</p>
          </div>
        </div>
        <div className="absolute bottom-8 right-8 text-right select-none">
          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em]">Authenticated Deployment v3.0</p>
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={currentUser} onLogout={handleLogout} isDbConnected={isDbConnected}>
      {activeTab === 'dashboard' && <Dashboard user={currentUser} users={users} onNavigate={setActiveTab} />}
      {activeTab === 'nomination' && <Nomination users={users} user={currentUser} />}
      {activeTab === 'give' && <FeedbackForm users={users} currentUser={currentUser} />}
      {activeTab === 'reports' && <Reports user={currentUser} />}
      {activeTab === 'approvals' && <Approvals users={users} nominations={myApprovals} />}
      {activeTab === 'profile' && <Profile user={currentUser} onUserUpdate={handleUserUpdate} users={users} />}
      {activeTab === 'admin' && <AdminPanel users={users} setUsers={setUsers} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} />}
    </Layout>
  );
};

export default App;