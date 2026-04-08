import React, { useState, useEffect, useMemo, Component, ErrorInfo } from 'react';
import { User, PRPRecord, Nomination } from '../types';
import { api } from '../services/api';
import PRPEditPage from './PRPEditPage';
import Reports from './Reports';

// Error Boundary：攔截 PRPEditPage 內的 runtime 錯誤（例如 TipTap 初始化問題）
class PRPErrorBoundary extends Component<
  { children: React.ReactNode; onReset: () => void },
  { hasError: boolean; errorMessage: string }
> {
  declare state: { hasError: boolean; errorMessage: string };
  constructor(props: { children: React.ReactNode; onReset: () => void }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('🔴 [PRPEditPage] Render error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-12 text-center space-y-4">
          <p className="text-2xl">⚠️</p>
          <p className="font-black text-slate-900">編輯頁面載入失敗</p>
          <p className="text-sm text-slate-500">{this.state.errorMessage}</p>
          <button
            onClick={() => { this.setState({ hasError: false, errorMessage: '' }); this.props.onReset(); }}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-500"
          >
            返回個人中心
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

interface ProfileProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
  users: User[];
}

const Profile: React.FC<ProfileProps> = ({ user, onUserUpdate, users }) => {
  const [isRefreshingAvatar, setIsRefreshingAvatar] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const [prpRecords, setPrpRecords] = useState<PRPRecord[]>([]);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editingPrpRecord, setEditingPrpRecord] = useState<PRPRecord | null>(null);
  const [reportNominationId, setReportNominationId] = useState<string | null>(null);

  const [tempAvatar, setTempAvatar] = useState(user.avatar);
  const [tempMotto, setTempMotto] = useState(user.motto || '');
  const [tempActiveSuperpowerId, setTempActiveSuperpowerId] = useState(user.activeSuperpowerId || '');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [records, noms] = await Promise.all([
          api.getPRPRecords(user.id),
          api.getNominationsByRequester(user.id),
        ]);
        setPrpRecords(records);
        setNominations(noms.filter(n => n.status === 'Approved'));
      } catch (err) {
        console.error('Failed to fetch profile data', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [user.id]);

  // 從提名標題抽取年份（例如「2025 卓越領導力反饋...」→ "2025"）
  // 若標題沒有年份則 fallback 到 createdAt 年份
  const getNomYear = (nom: Nomination): string => {
    const match = nom.title?.match(/(\d{4})/);
    if (match) return match[1];
    return new Date(nom.createdAt).getFullYear().toString();
  };

  // 依年份分群（PRP 用 period，提名用標題年份）
  const years = useMemo(() => {
    const prpYears = prpRecords.map(r => r.period);
    const nomYears = nominations.map(getNomYear);
    return [...new Set([...prpYears, ...nomYears])].sort((a, b) => parseInt(b) - parseInt(a));
  }, [prpRecords, nominations]);

  const handlePreviewAvatar = () => {
    setIsRefreshingAvatar(true);
    const newSeed = Math.random().toString(36).substring(7);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`;
    setTimeout(() => {
      setTempAvatar(newAvatar);
      setIsRefreshingAvatar(false);
    }, 300);
  };

  const handleSaveChanges = async () => {
    setIsSavingAvatar(true);
    try {
      const updatedUser = await api.updateUser({
        ...user,
        avatar: tempAvatar,
        motto: tempMotto,
        activeSuperpowerId: tempActiveSuperpowerId
      });
      onUserUpdate(updatedUser);
    } catch (err) {
      alert("儲存失敗，請檢查網路連線");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleCancelChanges = () => {
    setTempAvatar(user.avatar);
    setTempMotto(user.motto || '');
    setTempActiveSuperpowerId(user.activeSuperpowerId || '');
  };

  const manager = users.find(u => u.email === user.managerEmail);
  const hasChanges = tempAvatar !== user.avatar || tempMotto !== (user.motto || '') || tempActiveSuperpowerId !== (user.activeSuperpowerId || '');

  const getSuperpowerColor = (category?: string) => {
    switch(category) {
      case 'strategic': return 'from-blue-500 to-indigo-500';
      case 'support': return 'from-pink-500 to-rose-500';
      case 'leadership': return 'from-amber-400 to-orange-500';
      default: return 'from-slate-700 to-slate-800';
    }
  };

  const activeSuperpower = user.unlockedSuperpowers?.find(s => s.id === tempActiveSuperpowerId);
  const auraColor = activeSuperpower ? getSuperpowerColor(activeSuperpower.category) : '';

  // ── Drill-down: PRP 詳細頁 ────────────────────────────────────
  if (editingPrpRecord) {
    return (
      <PRPErrorBoundary onReset={() => setEditingPrpRecord(null)}>
        <PRPEditPage
          record={editingPrpRecord}
          users={users}
          readOnly={true}
          onBack={() => setEditingPrpRecord(null)}
          onSaved={(updated) => {
            setPrpRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
            setEditingPrpRecord(null);
          }}
        />
      </PRPErrorBoundary>
    );
  }

  // ── Drill-down: 360 洞察 ──────────────────────────────────────
  if (reportNominationId !== null) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4">
        <div className="mb-6">
          <button
            onClick={() => setReportNominationId(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            返回個人中心
          </button>
        </div>
        <Reports user={user} initialNominationId={reportNominationId} />
      </div>
    );
  }

  // ── 主頁面 ────────────────────────────────────────────────────
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">個人中心</h1>
        <p className="text-slate-500 mt-2 text-lg">管理您的個人數位形象與歷年紀錄。</p>
      </header>

      {/* Profile Card */}
      <section className="bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="flex flex-col items-center gap-6">
            <div className="relative group">
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-gradient-to-tr ${auraColor} rounded-full blur-[30px] opacity-40 transition-all duration-700 pointer-events-none`}></div>
              <img
                src={tempAvatar}
                className={`relative z-10 w-40 h-40 rounded-[3rem] border-4 border-white/20 shadow-2xl bg-slate-800 transition-all ${isRefreshingAvatar ? 'opacity-50 scale-95 blur-sm' : ''} ${hasChanges ? 'ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-900' : ''}`}
                alt={user.name}
              />
              <button
                onClick={handlePreviewAvatar}
                disabled={isRefreshingAvatar || isSavingAvatar}
                className="absolute z-20 -bottom-2 -right-2 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-90 disabled:opacity-50"
                title="刷新隨機預覽"
              >
                <svg className={`w-6 h-6 ${isRefreshingAvatar ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/10 mt-2">Avatar Seed Engine v7</span>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">人生格言 (Motto)</p>
              <input
                type="text"
                value={tempMotto}
                onChange={e => setTempMotto(e.target.value)}
                placeholder="寫下一句代表您的格言..."
                className="w-full bg-slate-800 text-white text-sm font-bold border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all outline-none"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">裝備超能力 (Active Aura)</p>
              <select
                value={tempActiveSuperpowerId}
                onChange={e => setTempActiveSuperpowerId(e.target.value)}
                className="w-full bg-slate-800 text-white text-sm font-bold border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none"
              >
                <option value="">未裝備</option>
                {user.unlockedSuperpowers && user.unlockedSuperpowers.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">顯示姓名</p>
              <p className="text-2xl font-black">{user.name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">公司信箱</p>
              <p className="text-lg font-bold text-indigo-300">{user.email}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">職位角色</p>
              <p className="text-lg font-bold">{user.role}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">所屬部門</p>
              <p className="text-lg font-bold">{user.department}</p>
            </div>
            <div className="space-y-1 col-span-full pt-4 border-t border-white/5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">直屬主管 (名單審核人)</p>
              <div className="flex items-center gap-3 mt-2">
                <img src={manager?.avatar} className="w-8 h-8 rounded-lg bg-white/10" alt="" />
                <p className="text-lg font-black text-emerald-400">{manager?.name || user.managerEmail}</p>
              </div>
            </div>
          </div>
        </div>

        {hasChanges && (
          <div className="mt-8 p-6 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 relative z-10">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-indigo-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-bold text-indigo-100">您有尚未儲存的個人檔案變更</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleCancelChanges} disabled={isSavingAvatar} className="px-4 py-2 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all">取消還原</button>
              <button onClick={handleSaveChanges} disabled={isSavingAvatar} className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2">
                {isSavingAvatar ? '儲存中...' : '確認儲存'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── 年份分區 ─────────────────────────────────────────── */}
      {isLoading ? (
        <div className="py-16 text-center animate-pulse">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">載入歷年記錄中...</p>
        </div>
      ) : years.length === 0 ? (
        <div className="p-16 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
          <p className="text-slate-300 italic font-bold">尚無歷年紀錄</p>
        </div>
      ) : (
        <div className="space-y-10">
          {years.map(year => {
            const yearPRP = prpRecords.filter(r => r.period === year);
            const yearNoms = nominations.filter(n => getNomYear(n) === year);

            return (
              <section key={year}>
                {/* 年份標題 */}
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-sm shadow-lg shrink-0">
                    {year}
                  </div>
                  <div className="flex-1 h-px bg-slate-200"></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PRP 績效評核卡片 */}
                  {yearPRP.map(record => (
                    <button
                      key={record.id}
                      onClick={() => setEditingPrpRecord(record)}
                      className="flex items-center gap-5 p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-amber-300 hover:shadow-lg transition-all group text-left"
                    >
                      <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:bg-amber-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-0.5">PRP 績效評核</p>
                        <p className="font-black text-slate-900 truncate">{record.jobTitle} · {record.department}</p>
                        {record.finalRating && (
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase ${
                            record.finalRating === 'S' ? 'bg-violet-100 text-violet-700' :
                            record.finalRating === 'A' ? 'bg-indigo-100 text-indigo-700' :
                            record.finalRating === 'B' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            評等 {record.finalRating}
                          </span>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}

                  {/* 360 洞察卡片 */}
                  {yearNoms.map(nom => (
                    <button
                      key={nom.id}
                      onClick={() => setReportNominationId(nom.id)}
                      className="flex items-center gap-5 p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-indigo-300 hover:shadow-lg transition-all group text-left"
                    >
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm group-hover:bg-indigo-100 transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-0.5">360 洞察</p>
                        <p className="font-black text-slate-900 truncate">{nom.title}</p>
                        {nom.analysisFeedbackCount != null && nom.analysisFeedbackCount > 0 && (
                          <p className="text-[10px] text-slate-400 font-bold mt-0.5">{nom.analysisFeedbackCount} 份回饋 {nom.aiAnalysis ? '· AI 已分析' : ''}</p>
                        )}
                      </div>
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Profile;
