import React, { useState, useEffect, useMemo } from 'react';
import { Nomination as NominationType, User } from '../types';
import { api } from '../services/api';

interface ApprovalsProps {
  users: User[];
  nominations: NominationType[];
}

const Approvals: React.FC<ApprovalsProps> = ({ users, nominations: initialNominations }) => {
  const [nominations, setNominations] = useState<NominationType[]>(initialNominations);
  const [addingReviewerFor, setAddingReviewerFor] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  useEffect(() => {
    setNominations(initialNominations);
  }, [initialNominations]);

  const handleStatusChange = async (id: string, status: NominationType['status']) => {
    setIsSyncing(true);
    try {
      await api.updateNomination(id, { status });
      setNominations(prev => prev.map(n => n.id === id ? { ...n, status } : n));
    } catch (err) {
      alert("狀態更新失敗");
    } finally {
      setIsSyncing(false);
    }
  };

  const removeReviewer = async (nominationId: string, reviewerId: string) => {
    const targetNom = nominations.find(n => n.id === nominationId);
    if (!targetNom || targetNom.status !== 'Pending') return;
    
    const newReviewerIds = targetNom.reviewerIds.filter(r => r !== reviewerId);
    setIsSyncing(true);
    try {
      await api.updateNomination(nominationId, { reviewerIds: newReviewerIds });
      setNominations(prev => prev.map(n => 
        n.id === nominationId ? { ...n, reviewerIds: newReviewerIds } : n
      ));
    } catch (err) {
      alert("移除受邀人失敗");
    } finally {
      setIsSyncing(false);
    }
  };

  const addReviewer = async (nominationId: string, reviewerId: string) => {
    const targetNom = nominations.find(n => n.id === nominationId);
    if (!targetNom || targetNom.status !== 'Pending') return;
    if (targetNom.reviewerIds.includes(reviewerId)) return;
    
    if (targetNom.reviewerIds.length >= 10) {
      alert("受邀評鑑人數量已達上限 (10人)");
      return;
    }

    const newReviewerIds = [...targetNom.reviewerIds, reviewerId];
    setIsSyncing(true);
    try {
      await api.updateNomination(nominationId, { reviewerIds: newReviewerIds });
      setNominations(prev => prev.map(n => 
        n.id === nominationId ? { ...n, reviewerIds: newReviewerIds } : n
      ));
      if (newReviewerIds.length >= 10) {
        setAddingReviewerFor(null);
      }
    } catch (err) {
      alert("新增受邀人失敗");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredNominations = useMemo(() => {
    if (filter === 'pending') {
      return nominations.filter(n => n.status === 'Pending');
    }
    if (filter === 'approved') {
      return nominations.filter(n => n.status === 'Approved');
    }
    return nominations;
  }, [nominations, filter]);

  const counts = useMemo(() => ({
    pending: nominations.filter(n => n.status === 'Pending').length,
    approved: nominations.filter(n => n.status === 'Approved').length,
    total: nominations.length
  }), [nominations]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">審核名單</h1>
          <p className="text-slate-500 text-lg font-medium">身為主管，請確保下屬的評鑑名單能提供多元、客觀且具備成長價值的觀察視角。</p>
        </div>

        {/* 過濾器切換器 */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner shrink-0">
          <button 
            onClick={() => setFilter('pending')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              filter === 'pending' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            待處理
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {counts.pending}
            </span>
          </button>
          <button 
            onClick={() => setFilter('approved')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              filter === 'approved' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            歷史核准
            <span className={`px-2 py-0.5 rounded-md text-[10px] ${filter === 'approved' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {counts.approved}
            </span>
          </button>
        </div>
      </header>

      {filteredNominations.length === 0 ? (
        <div className="p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center animate-in fade-in">
          <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">
            {filter === 'pending' ? '目前沒有待處理的審核申請' : '目前沒有已核准的申請紀錄'}。
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredNominations.map((nom) => {
            const requester = users.find(u => u.id === nom.requesterId || u.email === nom.requesterId);
            const availableUsers = users.filter(u => 
              u.id !== nom.requesterId && 
              !nom.reviewerIds.includes(u.id) &&
              u.email !== nom.requesterId
            );

            return (
              <div key={nom.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/30 overflow-hidden group transition-all animate-in slide-in-from-bottom-2">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/50">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img src={requester?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nom.requesterId}`} className="w-16 h-16 rounded-2xl shadow-md border-2 border-white" alt="" />
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-white shadow-sm border border-white ${nom.status === 'Approved' ? 'bg-emerald-500' : nom.status === 'Rejected' ? 'bg-rose-500' : 'bg-indigo-600'}`}>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {nom.status === 'Approved' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          ) : nom.status === 'Rejected' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                          )}
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">受評下屬</p>
                      <p className="font-black text-slate-900 text-xl tracking-tight">{requester?.name || nom.requesterId}</p>
                      <p className="text-indigo-600 font-bold text-sm tracking-tight">{nom.title || '年度反饋邀請'}</p>
                    </div>
                  </div>
                  
                  {nom.status === 'Pending' ? (
                    <div className="flex gap-2">
                      <button
                        disabled={isSyncing}
                        onClick={() => handleStatusChange(nom.id, 'Approved')}
                        className="px-8 py-3 bg-slate-900 text-white text-sm font-black rounded-xl hover:bg-indigo-600 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSyncing ? '處理中...' : '確認並核准名單'}
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      </button>
                    </div>
                  ) : (
                    <div className={`px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest ${
                      nom.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {nom.status === 'Approved' ? '已核准' : '已駁回'}
                    </div>
                  )}
                </div>

                <div className="p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">受邀評鑑人名單 ({nom.reviewerIds.length} / 10)</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {nom.reviewerIds.map(rid => {
                      const reviewer = users.find(u => u.id === rid || u.email === rid);
                      return (
                        <div key={rid} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:bg-slate-50/50 transition-all group/item">
                          <div className="flex items-center gap-3">
                            <img src={reviewer?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rid}`} className="w-10 h-10 rounded-xl" alt="" />
                            <div className="min-w-0">
                              <p className="text-sm font-black text-slate-800 truncate">{reviewer?.name || rid}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{reviewer?.role || 'IC'}</p>
                            </div>
                          </div>
                          {nom.status === 'Pending' && (
                            <button 
                              onClick={() => removeReviewer(nom.id, rid)}
                              className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {nom.status === 'Pending' && (
                    <div className="mt-8 pt-8 border-t border-slate-50">
                      {!addingReviewerFor && (
                        <button 
                          onClick={() => setAddingReviewerFor(nom.id)}
                          disabled={nom.reviewerIds.length >= 10}
                          className="w-full flex items-center justify-center gap-3 p-5 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group/add disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <div className="w-10 h-10 bg-slate-100 group-hover/add:bg-indigo-600 group-hover/add:text-white rounded-xl flex items-center justify-center text-slate-400 transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                          </div>
                          <span className="text-base font-black text-slate-500 group-hover/add:text-indigo-600 transition-colors">
                            {nom.reviewerIds.length >= 10 ? '人數已達 10 人上限' : '為下屬增加評鑑維度 (新增人員)'}
                          </span>
                        </button>
                      )}

                      {addingReviewerFor === nom.id && (
                        <div className="p-8 bg-slate-50 border-2 border-indigo-100 rounded-[2.5rem] animate-in slide-in-from-top-4 duration-300">
                          <div className="flex justify-between items-center mb-6">
                            <div>
                              <h4 className="text-xl font-black text-slate-900">組織人員名冊</h4>
                              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">目前已選 {nom.reviewerIds.length} 人，尚可選 {10 - nom.reviewerIds.length} 人</p>
                            </div>
                            <button 
                              onClick={() => setAddingReviewerFor(null)} 
                              className="px-6 py-2.5 bg-white text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm transition-all"
                            >
                              取消新增
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {availableUsers.length === 0 ? (
                              <p className="col-span-full py-10 text-center text-slate-400 font-bold text-sm italic">沒有更多可選擇的人員。</p>
                            ) : (
                              availableUsers.map(u => (
                                <button
                                  key={u.id}
                                  onClick={() => addReviewer(nom.id, u.id)}
                                  disabled={isSyncing}
                                  className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-600 hover:shadow-lg transition-all text-left group/choice disabled:opacity-50"
                                >
                                  <img src={u.avatar} className="w-10 h-10 rounded-xl group-hover/choice:scale-105 transition-transform" alt="" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-900 truncate">{u.name}</p>
                                    <p className="text-[10px] text-slate-400 font-bold truncate uppercase">{u.role}</p>
                                  </div>
                                  <div className="ml-auto opacity-0 group-hover/choice:opacity-100 text-indigo-600 transition-opacity">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Approvals;