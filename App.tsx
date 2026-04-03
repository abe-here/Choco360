import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FeedbackForm from './components/FeedbackForm';
import Reports from './components/Reports';
import Nomination from './components/Nomination';
import Approvals from './components/Approvals';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import Community from './components/Community';
import { api } from './services/api';
import { checkSupabaseConnection, supabase } from './services/supabase';
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
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  
  const [users, setUsers] = useState<User[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [myApprovals, setMyApprovals] = useState<NominationType[]>([]);

  useEffect(() => {
    const tabId = Math.random().toString(36).substring(2, 11);
    localStorage.setItem('choco360_active_tab', tabId);
    
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'choco360_active_tab' && e.newValue !== tabId) {
        setIsDuplicateTab(true);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initApp = async () => {
      try {
        const { connected, error } = await checkSupabaseConnection();
        if (mounted) {
          setIsDbConnected(connected);
          if (error) setDbError(error);
        }
        
        if (connected) {
          const user = await api.getCurrentUser();
          if (mounted && user) {
            setCurrentUser(user);
          }
        }
      } catch (e: any) { 
        console.error("Init failed:", e);
        if (mounted) setDbError(e.message || String(e));
      } finally { 
        if (mounted) setLoading(false); 
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_IN') {
        try {
          if (mounted) setLoading(true);
          const user = await api.getCurrentUser();
          if (mounted) {
            setCurrentUser(user);
            setAuthError(null);
          }
        } catch (e: any) {
          console.error("Login failed after auth:", e);
          if (mounted) setAuthError({ code: 'login_error', message: e.message || '登入失敗，請確認是否為公司帳號' });
        } finally {
          if (mounted) setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setCurrentUser(null);
          setActiveTab('dashboard');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  if (isDuplicateTab) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] border border-amber-200 shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900">作業已移至新分頁</h1>
          <p className="text-slate-500 text-sm leading-relaxed">您已在其他分頁開啟此系統。為確保資料一致性，此分頁已暫停運作。</p>
          <button 
            onClick={() => {
              localStorage.setItem('choco360_active_tab', Math.random().toString(36).substring(2, 11));
              window.location.reload();
            }} 
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-2xl shadow-xl transition-colors"
          >
            在此分頁繼續作業
          </button>
        </div>
      </div>
    );
  }

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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">企業級安全登入</label>
              <button 
                id="googleLoginBtn"
                onClick={async () => {
                  setAuthError(null);
                  try { await api.loginWithGoogle(); }
                  catch (e: any) { setAuthError({ code: 'login_error', message: e.message }); }
                }}
                className="w-full flex justify-center items-center gap-3 bg-white border-2 border-slate-200 hover:border-indigo-600 hover:bg-indigo-50 text-slate-700 font-bold py-3.5 px-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 group"
              >
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
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
      { activeTab === 'profile' && <Profile user={currentUser} onUserUpdate={handleUserUpdate} users={users} /> }
      { activeTab === 'community' && <Community users={users} currentUser={currentUser} /> }
      { activeTab === 'admin' && <AdminPanel users={users} setUsers={setUsers} questionnaires={questionnaires} setQuestionnaires={setQuestionnaires} /> }
    </Layout>
  );
};

export default App;