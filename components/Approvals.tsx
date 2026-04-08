import React, { useState, useEffect, useMemo } from 'react';
import { Nomination as NominationType, User, PRPRecord } from '../types';
import { api } from '../services/api';
import PRPEditPage from './PRPEditPage';
import Reports from './Reports';

interface ApprovalsProps {
  users: User[];
  nominations: NominationType[];
  currentUser: User;
}

type ApprovalsView = 'approvals' | 'team' | 'member-detail';

const Approvals: React.FC<ApprovalsProps> = ({ users, nominations: initialNominations, currentUser }) => {
  // ── 現有提名審核 state ──────────────────────────────────────────
  const [nominations, setNominations] = useState<NominationType[]>(initialNominations);
  const [addingReviewerFor, setAddingReviewerFor] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  // ── 我的團隊導航 state ──────────────────────────────────────────
  const [view, setView] = useState<ApprovalsView>('approvals');
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [memberDetailTab, setMemberDetailTab] = useState<'prp' | 'report'>('prp');

  // ── PRP 記錄 state ──────────────────────────────────────────────
  const [prpRecords, setPrpRecords] = useState<PRPRecord[]>([]);
  const [prpLoading, setPrpLoading] = useState(false);
  const [selectedPrpRecord, setSelectedPrpRecord] = useState<PRPRecord | null>(null);

  useEffect(() => {
    setNominations(initialNominations);
  }, [initialNominations]);

  // 直屬部屬清單
  const directReports = useMemo(() =>
    users.filter(u => u.managerEmail === currentUser.email && u.status !== 'resigned'),
    [users, currentUser.email]
  );

  // ── PRP fetch ───────────────────────────────────────────────────
  const fetchPRPRecords = async (userId: string) => {
    setPrpLoading(true);
    setPrpRecords([]);
    try {
      const records = await api.getPRPRecords(userId);
      setPrpRecords(records);
    } catch (err) {
      console.error('Failed to fetch PRP records:', err);
    } finally {
      setPrpLoading(false);
    }
  };

  const openMemberDetail = (member: User, tab: 'prp' | 'report' = 'prp') => {
    setSelectedMember(member);
    setMemberDetailTab(tab);
    setSelectedPrpRecord(null);
    setView('member-detail');
    if (tab === 'prp') fetchPRPRecords(member.id);
  };

  const switchMemberDetailTab = (tab: 'prp' | 'report') => {
    setMemberDetailTab(tab);
    setSelectedPrpRecord(null);
    if (tab === 'prp' && selectedMember) fetchPRPRecords(selectedMember.id);
  };

  // ── 提名審核操作 ─────────────────────────────────────────────────
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
      if (newReviewerIds.length >= 10) setAddingReviewerFor(null);
    } catch (err) {
      alert("新增受邀人失敗");
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredNominations = useMemo(() => {
    if (filter === 'pending') return nominations.filter(n => n.status === 'Pending');
    if (filter === 'approved') return nominations.filter(n => n.status === 'Approved');
    return nominations;
  }, [nominations, filter]);

  const counts = useMemo(() => ({
    pending: nominations.filter(n => n.status === 'Pending').length,
    approved: nominations.filter(n => n.status === 'Approved').length,
    total: nominations.length
  }), [nominations]);

  // ══════════════════════════════════════════════════════════════
  // 【畫面：成員詳情頁 PRP 記錄展示】
  // ══════════════════════════════════════════════════════════════
  if (view === 'member-detail' && selectedMember) {
    // 若已選定某筆 PRP 記錄，進入唯讀詳細頁
    if (selectedPrpRecord) {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <PRPEditPage
            record={selectedPrpRecord}
            users={users}
            isAdminMode={false}
            readOnly={true}
            onBack={() => setSelectedPrpRecord(null)}
            onSaved={() => {}}
          />
        </div>
      );
    }

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* 頂部導覽列 */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => { setView('team'); setSelectedMember(null); }}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-sm group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            返回我的團隊
          </button>
        </div>

        {/* 成員資訊卡 */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/30 p-8 flex items-center gap-6">
          <img
            src={selectedMember.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedMember.id}`}
            className="w-20 h-20 rounded-2xl shadow-md border-2 border-white object-cover"
            alt={selectedMember.name}
          />
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">直屬部屬</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{selectedMember.name}</h2>
            <p className="text-slate-500 font-semibold text-sm mt-0.5">{selectedMember.role} · {selectedMember.department}</p>
          </div>
        </div>

        {/* 詳情頁 sub-tab */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner w-fit">
          <button
            onClick={() => switchMemberDetailTab('prp')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              memberDetailTab === 'prp'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            📋 PRP 記錄
          </button>
          <button
            onClick={() => switchMemberDetailTab('report')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              memberDetailTab === 'report'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            📊 問卷報告
          </button>
        </div>

        {/* PRP 記錄 tab 內容 */}
        {memberDetailTab === 'prp' && (
          <div className="space-y-4">
            {prpLoading ? (
              <div className="p-20 text-center animate-pulse font-black text-slate-400 text-sm uppercase tracking-widest">
                載入中...
              </div>
            ) : prpRecords.length === 0 ? (
              <div className="p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
                <div className="w-14 h-14 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">此成員尚無 PRP 記錄</p>
              </div>
            ) : (
              prpRecords.map(record => (
                <button
                  key={record.id}
                  onClick={() => setSelectedPrpRecord(record)}
                  className="w-full bg-white rounded-[2rem] border border-slate-200 shadow-md shadow-slate-200/30 p-6 flex items-center justify-between hover:border-indigo-300 hover:shadow-lg transition-all group text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-base shadow-sm">
                      {record.period}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-base">{record.period} 年度績效記錄</p>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wide mt-0.5">
                        {record.department} · {record.jobTitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {record.finalRating && (
                      <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest ${
                        record.finalRating === 'S' ? 'bg-violet-100 text-violet-700' :
                        record.finalRating === 'A' ? 'bg-indigo-100 text-indigo-700' :
                        record.finalRating === 'B' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {record.finalRating}
                      </span>
                    )}
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* 問卷報告 tab 內容 */}
        {memberDetailTab === 'report' && (
          <div className="-mx-0">
            <Reports user={currentUser} subjectUser={selectedMember} />
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 【畫面：我的團隊列表】
  // ══════════════════════════════════════════════════════════════
  if (view === 'team') {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <header className="flex items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">主管中心</h1>
            <p className="text-slate-500 text-lg font-medium">管理您的團隊提名與成員資料。</p>
          </div>

          {/* 主分頁切換 */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner shrink-0">
            <button
              onClick={() => setView('approvals')}
              className="px-5 py-2.5 rounded-xl text-xs font-black transition-all text-slate-400 hover:text-slate-600"
            >
              提名審核
              <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-500">{counts.total}</span>
            </button>
            <button
              onClick={() => setView('team')}
              className="px-5 py-2.5 rounded-xl text-xs font-black transition-all bg-white text-indigo-600 shadow-sm"
            >
              我的團隊
              <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] bg-indigo-600 text-white">{directReports.length}</span>
            </button>
          </div>
        </header>

        {directReports.length === 0 ? (
          <div className="p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 text-center animate-in fade-in">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">目前沒有直屬部屬</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {directReports.map(member => (
              <div
                key={member.id}
                className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/30 p-7 flex flex-col gap-5 hover:border-indigo-200 hover:shadow-2xl transition-all"
              >
                {/* 成員資訊 */}
                <div className="flex items-center gap-4">
                  <img
                    src={member.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.id}`}
                    className="w-14 h-14 rounded-2xl shadow-md border-2 border-white object-cover"
                    alt={member.name}
                  />
                  <div className="min-w-0">
                    <p className="font-black text-slate-900 text-base truncate">{member.name}</p>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wide truncate mt-0.5">
                      {member.role} · {member.department}
                    </p>
                  </div>
                </div>

                {/* 動作按鈕 */}
                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => openMemberDetail(member, 'prp')}
                    className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 rounded-2xl text-sm font-bold text-slate-700 hover:text-indigo-700 transition-all group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">📋</span>
                      PRP 記錄
                    </span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openMemberDetail(member, 'report')}
                    className="w-full flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-2xl text-sm font-bold text-slate-700 hover:text-emerald-700 transition-all group"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-base">📊</span>
                      問卷報告
                    </span>
                    <svg className="w-4 h-4 text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // 【畫面：提名審核（現有功能）】
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">主管中心</h1>
          <p className="text-slate-500 text-lg font-medium">管理您的團隊提名與成員資料。</p>
        </div>

        {/* 主分頁切換 */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl shadow-inner shrink-0">
          <button
            onClick={() => setView('approvals')}
            className="px-5 py-2.5 rounded-xl text-xs font-black transition-all bg-white text-indigo-600 shadow-sm"
          >
            提名審核
            <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] bg-indigo-600 text-white">{counts.total}</span>
          </button>
          <button
            onClick={() => setView('team')}
            className="px-5 py-2.5 rounded-xl text-xs font-black transition-all text-slate-400 hover:text-slate-600"
          >
            我的團隊
            <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] bg-slate-200 text-slate-500">{directReports.length}</span>
          </button>
        </div>
      </header>

      {/* 子篩選器（僅提名審核模式顯示） */}
      <div className="flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">篩選</span>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            待處理
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${filter === 'pending' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {counts.pending}
            </span>
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 ${
              filter === 'approved'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            歷史核准
            <span className={`px-1.5 py-0.5 rounded text-[10px] ${filter === 'approved' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {counts.approved}
            </span>
          </button>
        </div>
      </div>

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
              u.email !== nom.requesterId &&
              u.status !== 'resigned'
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
