import React, { useState, useEffect } from 'react';
import { User, Nomination, FeedbackEntry } from '../types';
import { api } from '../services/api';

interface DashboardProps {
  user: User;
  users: User[];
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ user, users, onNavigate }) => {
  const [pendingTasks, setPendingTasks] = useState<Nomination[]>([]);
  const [receivedFeedbacks, setReceivedFeedbacks] = useState<FeedbackEntry[]>([]);
  const [myNominations, setMyNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [tasks, feedbacks, nominations] = await Promise.all([
          api.getNominationTasks(user.id),
          api.getFeedbacksForUser(user.id),
          api.getNominationsByRequester(user.id)
        ]);
        setPendingTasks(tasks);
        setReceivedFeedbacks(feedbacks);
        setMyNominations(nominations);
      } catch (err) {
        console.error("Dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id]);

  const latestNomination = myNominations.length > 0 ? myNominations[0] : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">正在讀取最新數據指標...</p>
      </div>
    );
  }

  const statusMap = {
    'Pending': { label: '主管審核中', color: 'text-amber-600', bg: 'bg-amber-50' },
    'Approved': { label: '已核准', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'Rejected': { label: '已駁回', color: 'text-rose-600', bg: 'bg-rose-50' }
  };

  const currentStatus = latestNomination ? statusMap[latestNomination.status as keyof typeof statusMap] : { label: '尚未發起', color: 'text-slate-400', bg: 'bg-slate-50' };

  // 獲取審核主管姓名
  const approver = latestNomination ? users.find(u => u.email === latestNomination.managerId) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">歡迎使用 Choco360 👋</h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">透過 360 度觀點，建立彼此互信與成長的文化。</p>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">您的權限身分</span>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl shadow-xl">
             <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
             <span className="text-xs font-black uppercase tracking-widest">{user.isManager ? 'Manager / 主管層級' : 'IC / 專業貢獻者'}</span>
          </div>
        </div>
      </header>

      {/* 數據看板 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 rounded-[2.5rem] border border-slate-100 shadow-xl bg-indigo-50/50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest relative z-10">待填寫評價</p>
          <p className="text-5xl font-black mt-3 text-indigo-700 relative z-10">{pendingTasks.length}</p>
          <p className="text-xs font-bold text-indigo-400 mt-2 relative z-10">
            {pendingTasks.length > 0 ? `尚有 ${pendingTasks.length} 份專業回饋待處理` : '已完成所有受邀任務'}
          </p>
        </div>
        
        <div className="p-8 rounded-[2.5rem] border border-slate-100 shadow-xl bg-emerald-50/50 relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest relative z-10">收到回饋數</p>
          <p className="text-5xl font-black mt-3 text-emerald-700 relative z-10">{receivedFeedbacks.length}</p>
          <p className="text-xs font-bold text-emerald-400 mt-2 relative z-10">即時更新之個人成長數據筆數</p>
        </div>

        <div className={`p-8 rounded-[2.5rem] border border-slate-100 shadow-xl relative overflow-hidden group ${currentStatus.bg}`}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-slate-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest relative z-10">邀請函審核狀態</p>
          <p className={`text-3xl font-black mt-3 relative z-10 ${currentStatus.color}`}>{currentStatus.label}</p>
          <div className="mt-2 relative z-10">
            {latestNomination?.status === 'Pending' && approver && (
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-1">
                由 {approver.name} 審核中
              </p>
            )}
            <p className="text-xs font-bold text-slate-400">
              {latestNomination ? `最後更新: ${new Date(latestNomination.createdAt).toLocaleDateString()}` : '前往「邀請反饋」發起流程'}
            </p>
          </div>
        </div>
      </div>

      {/* 智慧流程導引區塊 (Workflow Guide) */}
      <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-2xl font-black tracking-tight">如何開始您的評鑑之旅？</h2>
              <p className="text-indigo-300 text-sm font-bold mt-1">
                {user.isManager 
                  ? '身為主管，您可以發起「全方位評鑑」：選擇同僚優化跨部門協作，或選擇下屬優化團隊領導力。' 
                  : '身為 IC，您可以發起「同儕專業 360」：邀請日常協作緊密的同事，獲取專業能力的反饋。'}
              </p>
            </div>
            <button 
              onClick={() => onNavigate('nomination')}
              className="px-8 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-indigo-400 hover:text-white transition-all shadow-xl shadow-indigo-500/10 flex items-center gap-2 whitespace-nowrap"
            >
              立即發起邀請
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { 
                step: '01', 
                title: '建立名單', 
                desc: user.isManager ? '依目標挑選適合問卷與成員' : '挑選適合問卷與受邀同事',
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              },
              { 
                step: '02', 
                title: '主管審核', 
                desc: '確保名單涵蓋了多元觀察角度',
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              },
              { 
                step: '03', 
                title: '同步評鑑', 
                desc: '受邀人與受評人同步進行填寫',
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              },
              { 
                step: '04', 
                title: 'AI 報告生成', 
                desc: 'Gemini 整合數據產出成長洞察',
                icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              }
            ].map((s, idx) => (
              <div key={idx} className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400 shadow-inner group-hover:bg-indigo-600 transition-colors">
                    {s.icon}
                  </div>
                  <span className="text-2xl font-black text-white/20 tracking-tighter">{s.step}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-black text-base">{s.title}</h3>
                  <p className="text-xs text-slate-400 font-bold leading-relaxed">{s.desc}</p>
                </div>
                {idx < 3 && (
                  <div className="hidden md:block absolute top-6 -right-4 w-8 h-px bg-white/10"></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 待辦事項清單 */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">需完成的評鑑任務</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">ACTION ITEMS</p>
          </div>
          {pendingTasks.length > 0 && (
            <span className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-200 animate-pulse">待處理任務</span>
          )}
        </div>
        <div className="divide-y divide-slate-100">
          {pendingTasks.length > 0 ? pendingTasks.map((task) => {
            const requester = users.find(u => u.id === task.requesterId || u.email === task.requesterId);
            return (
              <div key={task.id} className="p-8 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <img src={requester?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.requesterId}`} alt="" className="w-16 h-16 rounded-2xl shadow-md group-hover:scale-110 transition-transform duration-500 border-2 border-white" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
                       <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" /></svg>
                    </div>
                  </div>
                  <div>
                    <p className="font-black text-slate-900 text-xl tracking-tight">{requester?.name || task.requesterId}</p>
                    <p className="text-sm text-slate-400 font-bold truncate max-w-[200px] md:max-w-md mt-0.5">{task.title}</p>
                  </div>
                </div>
                <button 
                  onClick={() => onNavigate('give')}
                  className="px-8 py-3.5 bg-slate-900 text-white text-xs font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 uppercase tracking-widest"
                >
                  開始評鑑
                </button>
              </div>
            );
          }) : (
            <div className="p-24 text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200 mb-6 shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-slate-400 font-black text-sm uppercase tracking-widest">目前沒有待處理的反饋任務</p>
              <p className="text-slate-300 text-xs font-bold mt-2 italic">您可以發起自己的評鑑，或主動為同事提供回饋。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;