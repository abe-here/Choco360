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
  const [nominationProgress, setNominationProgress] = useState<Record<string, string[]>>({});
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

        const activeNominations = nominations.filter(n => n.status === 'Approved' || n.status === 'Pending');
        const nominationIds = activeNominations.map(n => n.id);
        const progressData = await api.getFeedbacksByNominationIds(nominationIds);
        
        const progressMap: Record<string, string[]> = {};
        progressData.forEach(p => {
            if (!progressMap[p.nominationId]) progressMap[p.nominationId] = [];
            progressMap[p.nominationId].push(p.fromUserId);
        });

        setPendingTasks(tasks);
        setReceivedFeedbacks(feedbacks);
        setMyNominations(nominations);
        setNominationProgress(progressMap);
      } catch (err) {
        console.error("Dashboard data load error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">正在讀取最新數據指標...</p>
      </div>
    );
  }

  const getUrgency = (n: Nomination) => {
    if (n.status === 'Pending') return 2;
    if (n.status === 'Rejected') return 4;
    const completedIds = nominationProgress[n.id] || [];
    const totalReviewers = n.reviewerIds?.length || 0;
    if (totalReviewers > 0 && completedIds.length >= totalReviewers) return 3;
    return 1;
  };

  const sortedNominations = [...myNominations].filter(n => n.status !== 'Rejected').sort((a, b) => {
    const urgencyA = getUrgency(a);
    const urgencyB = getUrgency(b);
    if (urgencyA !== urgencyB) return urgencyA - urgencyB;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const isCompletelyEmpty = pendingTasks.length === 0 && myNominations.length === 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight">歡迎使用 Choco360 👋</h1>
          <p className="text-slate-500 text-sm font-medium">透過 360 度觀點，建立彼此互信與成長的文化。</p>
        </div>
        <div className="hidden md:flex flex-col items-end">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">您的權限身分</span>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl shadow-xl">
             <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
             <span className="text-xs font-black uppercase tracking-widest">{user.isManager ? 'Manager / 主管層級' : 'IC / 專業貢獻者'}</span>
          </div>
        </div>
      </header>

      {/* 智慧流程導引區塊 (Workflow Guide) */}
      <section className="bg-slate-900 rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-0">
          <div className={`${!isCompletelyEmpty ? 'mb-0' : 'mb-12'}`}>
            <h2 className="text-xl font-bold tracking-tight mb-2">如何開始您的評鑑之旅？</h2>
            <p className="text-slate-400 text-xs font-medium">
              {user.isManager 
                ? '身為主管，您可以發起「全方位評鑑」：選擇同僚優化跨部門協作，或選擇下屬優化團隊領導力。' 
                : '身為 IC，您可以發起「同儕專業 360」：邀請日常協作緊密的同事，獲取專業能力的反饋。'}
            </p>
          </div>
          <button 
            onClick={() => onNavigate('nomination')}
            className="px-6 py-3 bg-white text-slate-900 font-bold rounded-2xl hover:bg-slate-100 transition shadow-lg text-sm flex items-center justify-center whitespace-nowrap"
          >
            立即發起邀請<span className="ml-2">→</span>
          </button>
        </div>

        {isCompletelyEmpty && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
            {[
              { step: '01', title: '建立名單', desc: user.isManager ? '依目標挑選適合問卷與成員' : '挑選適合問卷與受邀同事', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
              { step: '02', title: '主管審核', desc: '確保名單涵蓋了多元觀察角度', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
              { step: '03', title: '同步評鑑', desc: '受邀人與受評人同步進行填寫', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
              { step: '04', title: 'AI 報告生成', desc: 'Gemini 整合數據產出成長洞察', icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> }
            ].map((s, idx) => (
              <div key={idx} className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    {s.icon}
                  </div>
                  <span className="text-2xl font-black text-white/20 tracking-tighter">{s.step}</span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-base">{s.title}</h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                </div>
                {idx < 3 && <div className="hidden md:block absolute top-6 -right-4 w-8 h-px bg-white/10"></div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 追蹤清單與待辦事項 (當不為空時才顯示) */}
      {!isCompletelyEmpty && (
        <>
          {/* 我發起的評鑑進度 */}
          <section className="bg-white rounded-[1.5rem] p-8 relative shadow-sm border border-slate-100">
            <div className="flex justify-between items-end mb-6 pl-2">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">我發起的評鑑進度</h2>
                <div className="text-[10px] font-black text-indigo-400 tracking-[0.2em] uppercase mt-1">MY REQUESTS & PROGRESS</div>
              </div>
            </div>
            <div className="space-y-3 pl-2">
              {sortedNominations.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm font-bold">目前沒有追蹤中的評鑑專案</div>
              ) : sortedNominations.map(nom => {
                const completedIds = nominationProgress[nom.id] || [];
                const totalReviewers = nom.reviewerIds?.length || 0;
                const progressRatio = totalReviewers > 0 ? completedIds.length / totalReviewers : 0;
                const progressPercent = Math.round(progressRatio * 100);

                let statusUI = { statusObj: null as React.ReactNode, actionText: '', actionLink: '' };
                const inviteeNames = nom.reviewerIds?.map(id => users.find(u => u.id === id)?.name).filter(Boolean).slice(0, 2).join(', ');
                const displayTarget = (nom.reviewerIds?.length || 0) > 2 ? `${inviteeNames} 等${nom.reviewerIds?.length}人` : (inviteeNames || '受邀名單');

                if (nom.status === 'Pending') {
                  statusUI.actionText = '提醒主管';
                  statusUI.actionLink = 'nomination';
                  statusUI.statusObj = (
                    <div className="flex-none w-48 mx-8">
                       <div className="flex justify-between items-center text-xs font-bold mb-2">
                           <span className="text-amber-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>主管審核中</span>
                           <span className="text-slate-400">尚未發送邀請</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-amber-400 h-full rounded-full" style={{width: '0%'}}></div></div>
                    </div>
                  );
                } else if (nom.status === 'Approved' && completedIds.length < totalReviewers) {
                  statusUI.actionText = '一鍵催繳';
                  statusUI.actionLink = 'nomination';
                  statusUI.statusObj = (
                    <div className="flex-none w-48 mx-8">
                       <div className="flex justify-between items-center text-xs font-bold mb-2">
                           <span className="text-indigo-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>收集中</span>
                           <span className="text-slate-500">{completedIds.length}/{totalReviewers} 人 ({progressPercent}%)</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{width: `${progressPercent}%`}}></div></div>
                    </div>
                  );
                } else if (nom.status === 'Approved') {
                  statusUI.actionText = '查看 AI 報告';
                  statusUI.actionLink = 'reports';
                  statusUI.statusObj = (
                    <div className="flex-none w-48 mx-8 opacity-80">
                       <div className="flex justify-between items-center text-xs font-bold mb-2">
                           <span className="text-emerald-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>已結案</span>
                           <span className="text-slate-500">{totalReviewers}/{totalReviewers} 人 (100%)</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-emerald-400 h-full rounded-full" style={{width: '100%'}}></div></div>
                    </div>
                  );
                } else {
                  return null;
                }

                return (
                  <div key={nom.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition">
                      <div className="flex items-center gap-4 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 ${nom.status==='Pending'?'bg-amber-100':(completedIds.length<totalReviewers?'bg-indigo-100':'bg-emerald-100')}`}>
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${nom.id}`} alt="avatar" className="w-8 h-8 rounded-full" />
                          </div>
                          <div>
                              <div className="text-sm font-bold text-slate-900">{nom.title}</div>
                              <div className="text-[11px] font-semibold text-slate-400 mt-0.5">受評者：<span className="text-slate-600">{displayTarget}</span></div>
                          </div>
                      </div>
                      
                      {statusUI.statusObj}

                      <div className="flex items-center justify-end w-32">
                          <button 
                            onClick={() => onNavigate(statusUI.actionLink)}
                            className="w-full px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow-sm text-center"
                          >
                              {statusUI.actionText}
                          </button>
                      </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 需完成的評鑑任務 */}
          <section className="bg-white rounded-[1.5rem] p-8 relative shadow-sm border border-slate-100">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">需完成的評鑑任務</h2>
                <div className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase mt-1">ACTION ITEMS</div>
              </div>
              {pendingTasks.length > 0 && <span className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg animate-pulse">待處理任務</span>}
            </div>
            
            <div className="divide-y divide-slate-100">
              {pendingTasks.length > 0 ? pendingTasks.map((task) => {
                const requester = users.find(u => u.id === task.requesterId || u.email === task.requesterId);
                return (
                  <div key={task.id} className="py-4 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 bg-slate-100 relative">
                        <img src={requester?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${task.requesterId}`} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{requester?.name || task.requesterId}</p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px] md:max-w-md mt-0.5">{task.title}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onNavigate('give')}
                      className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow-sm"
                    >
                      開始評鑑
                    </button>
                  </div>
                );
              }) : (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-[1.5rem] flex items-center justify-center text-slate-200 mb-4 shadow-inner">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">目前沒有待處理的反饋任務</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Dashboard;