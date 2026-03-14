
import React, { useState, useEffect, useMemo } from 'react';
import { User, Questionnaire } from '../types';
import { api } from '../services/api';

interface NominationProps {
  users: User[];
  user: User;
}

const Nomination: React.FC<NominationProps> = ({ users, user }) => {
  const [step, setStep] = useState(1);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQ, setSelectedQ] = useState<Questionnaire | null>(null);
  const [invitationTitle, setInvitationTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previewQ, setPreviewQ] = useState<Questionnaire | null>(null);

  // --- 新增過濾與搜尋狀態 ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const DEPARTMENTS = ['Product', 'Data', 'Marketing', 'Content', 'HR/ADM', 'AVOD', 'Finance'];

  useEffect(() => {
    const loadData = async () => {
      const qs = await api.getQuestionnaires();
      setQuestionnaires(qs);
      if (qs.length > 0) {
        setSelectedQ(qs[0]);
      }
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 14);
      setDueDate(defaultDate.toISOString().split('T')[0]);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedQ) {
      setInvitationTitle(`${selectedQ.title} for ${user.name}`);
    }
  }, [selectedQ, user.name]);

  const toggleReviewer = (id: string) => {
    if (selectedReviewers.includes(id)) {
      setSelectedReviewers(prev => prev.filter(i => i !== id));
    } else {
      if (selectedReviewers.length < 8) {
        setSelectedReviewers(prev => [...prev, id]);
      }
    }
  };

  // --- 計算過濾後的名單 ---
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const isNotSelf = u.id !== user.id;
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'All' || u.department === selectedDept;
      return isNotSelf && matchesSearch && matchesDept;
    });
  }, [users, user.id, searchTerm, selectedDept]);

  const handleSubmit = async () => {
    if (!selectedQ) return;
    setIsSubmitting(true);
    try {
      const managerTarget = user.managerEmail || 'abraham.chien@choco.media';
      await api.saveNomination({
        requesterId: user.id,
        reviewerIds: selectedReviewers,
        status: 'Pending',
        managerId: managerTarget, 
        title: invitationTitle,
        questionnaireId: selectedQ.id,
        dueDate: new Date(dueDate).toISOString()
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Nomination failed:", err);
      alert("提名失敗，請確認資料庫連線。");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white p-12 rounded-[3rem] border border-slate-200 text-center animate-in zoom-in-95 shadow-xl shadow-slate-200/50">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900">反饋邀請已發送！</h2>
        <p className="text-slate-500 mt-3 text-lg">您的主管將審核名單，通過後您也需進行「自我評鑑」。</p>
        <button 
          onClick={() => { setSubmitted(false); setStep(1); setSelectedReviewers([]); }} 
          className="mt-10 px-8 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all"
        >
          建立另一個邀請
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-full uppercase tracking-widest">Step {step} of 2</span>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">建立反饋邀請</h1>
        </div>
        <p className="text-slate-500 text-lg">
          {step === 1 
            ? '請先選擇適合您職位的評鑑問卷，您可以點擊預覽確認具體問項。' 
            : '邀請合適的同事為您的專業表現提供反饋（這不是要去評價他人）。'}
        </p>
      </header>

      {step === 1 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-right-4">
          <div className="p-10 space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">1. 選擇測評問卷</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questionnaires.map((q) => (
                  <div
                    key={q.id}
                    className={`p-6 rounded-3xl border-2 transition-all relative ${
                      selectedQ?.id === q.id 
                        ? 'border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-600/5' 
                        : 'border-slate-100 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedQ?.id === q.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <button 
                        onClick={() => setPreviewQ(q)}
                        className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                      >
                        預覽內容
                      </button>
                    </div>
                    <button 
                      onClick={() => setSelectedQ(q)}
                      className="text-left w-full"
                    >
                      <p className="font-black text-slate-900">{q.title}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1 line-clamp-1">{q.description}</p>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">2. 邀請標題</label>
                <input 
                  type="text" 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 font-black text-lg outline-none focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all shadow-inner"
                  value={invitationTitle}
                  onChange={(e) => setInvitationTitle(e.target.value)}
                  placeholder="請輸入本次反饋邀請的明確名稱"
                />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">3. 預設截止日期</label>
                <div className="relative">
                  <input 
                    type="date" 
                    readOnly
                    className="w-full px-6 py-5 bg-slate-100 border border-slate-200 rounded-3xl text-slate-400 font-black text-lg outline-none cursor-not-allowed"
                    value={dueDate}
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-200 px-3 py-1 rounded-lg">
                    System Default (14 Days)
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold italic ml-1">* 為了確保數據即時性，系統目前預設評鑑週期為 14 天。</p>
              </div>
            </div>
          </div>
          <div className="p-8 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-3"
            >
              下一步：選擇誰來評鑑您
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-right-4">
          <div className="p-8 border-b border-slate-200 bg-slate-50 space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={() => setStep(1)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">當前設定</p>
                  <p className="font-bold text-indigo-600 truncate max-w-[200px]">{invitationTitle}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">已挑選人員</p>
                <p className="font-black text-slate-900 text-xl">{selectedReviewers.length} / 8</p>
              </div>
            </div>

            {/* 搜尋與部門過濾器區塊 */}
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="搜尋同事姓名或信箱..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-6 py-3.5 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm" 
                />
                <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['All', ...DEPARTMENTS].map(dept => (
                  <button
                    key={dept}
                    onClick={() => setSelectedDept(dept)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm ${
                      selectedDept === dept 
                        ? 'bg-indigo-600 text-white shadow-indigo-100' 
                        : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    {dept === 'All' ? '全部門' : dept}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-h-[300px]">
            {filteredUsers.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-300">
                <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="font-black text-sm uppercase tracking-widest">找不到符合條件的同事</p>
              </div>
            ) : filteredUsers.map((member) => (
              <button
                key={member.id}
                onClick={() => toggleReviewer(member.id)}
                className={`flex items-center gap-4 p-5 rounded-[2rem] border-2 transition-all text-left group ${
                  selectedReviewers.includes(member.id) 
                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-600/5' 
                    : 'border-slate-50 bg-slate-50/50 hover:bg-white hover:border-slate-200'
                }`}
              >
                <div className="relative">
                  <img src={member.avatar} className="w-14 h-14 rounded-2xl shadow-sm group-hover:scale-105 transition-transform" alt="" />
                  {selectedReviewers.includes(member.id) && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-lg flex items-center justify-center border-2 border-white">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-900 truncate">{member.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold truncate uppercase tracking-tight">{member.role} · {member.department}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="p-8 border-t border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
               <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
               <p className="text-sm text-slate-400 font-medium italic">系統核准後，您也會收到一份「自評」任務。</p>
            </div>
            <button
              disabled={selectedReviewers.length === 0 || isSubmitting}
              onClick={handleSubmit}
              className="w-full md:w-auto px-12 py-5 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-indigo-600 transition-all disabled:opacity-30 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  送出反饋邀請
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 預覽彈窗 */}
      {previewQ && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewQ(null)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black">{previewQ.title}</h3>
                <p className="text-indigo-100 text-xs font-bold mt-1">問卷內容預覽</p>
              </div>
              <button onClick={() => setPreviewQ(null)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8 scrollbar-hide">
              {previewQ.dimensions.map((dim, i) => (
                <div key={i} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-black text-xs">{i + 1}</div>
                    <h4 className="font-black text-slate-900 text-lg">{dim.name}</h4>
                  </div>
                  <ul className="space-y-2.5 ml-11">
                    {dim.questions.map((q, j) => (
                      <li key={j} className="text-sm font-medium text-slate-600 flex gap-2">
                        <span className="text-slate-300">•</span>
                        <span>{q.text} <span className="text-[10px] font-black text-slate-300 uppercase ml-2">[{q.type === 'rating' ? '量分' : '簡答'}]</span></span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
              <button onClick={() => setPreviewQ(null)} className="px-10 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all">關閉預覽</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Nomination;
