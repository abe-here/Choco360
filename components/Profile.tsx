import React, { useState, useEffect } from 'react';
import { User, SystemMessage, PRPRecord } from '../types';
import { api } from '../services/api';

interface ProfileProps {
  user: User;
  onUserUpdate: (updatedUser: User) => void;
  users: User[];
}

const Profile: React.FC<ProfileProps> = ({ user, onUserUpdate, users }) => {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isRefreshingAvatar, setIsRefreshingAvatar] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  
  const [prpRecords, setPrpRecords] = useState<PRPRecord[]>([]);
  const [isFetchingPrp, setIsFetchingPrp] = useState(false);
  
  const [tempAvatar, setTempAvatar] = useState(user.avatar);
  const [tempMotto, setTempMotto] = useState(user.motto || '');
  const [tempActiveSuperpowerId, setTempActiveSuperpowerId] = useState(user.activeSuperpowerId || '');

  useEffect(() => {
    fetchMessages();
    fetchPRP();
  }, [user.id]); // Added dependency for safety

  const fetchPRP = async () => {
    setIsFetchingPrp(true);
    try {
      const records = await api.getPRPRecords(user.id);
      setPrpRecords(records);
    } catch (err) {
      console.error("Failed to fetch PRP", err);
    } finally {
      setIsFetchingPrp(false);
    }
  };

  const fetchMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const msgs = await api.getSystemMessages();
      setMessages(msgs);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // 修改：僅更新預覽
  const handlePreviewAvatar = () => {
    setIsRefreshingAvatar(true);
    const newSeed = Math.random().toString(36).substring(7);
    const newAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${newSeed}`;
    
    // 模擬一點點載入感，讓使用者感覺有在「計算」
    setTimeout(() => {
      setTempAvatar(newAvatar);
      setIsRefreshingAvatar(false);
    }, 300);
  };

  // 新增：正式儲存所有變更
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

  // 新增：還原變更
  const handleCancelChanges = () => {
    setTempAvatar(user.avatar);
    setTempMotto(user.motto || '');
    setTempActiveSuperpowerId(user.activeSuperpowerId || '');
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsPosting(true);
    try {
      await api.postSystemMessage(user.id, newMessage);
      setNewMessage('');
      await fetchMessages();
    } catch (err) {
      alert("留言失敗");
    } finally {
      setIsPosting(false);
    }
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

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">個人中心</h1>
        <p className="text-slate-500 mt-2 text-lg">管理您的個人數位形象並與系統開發團隊對話。</p>
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
        
        {/* 整體儲存提示列 */}
        {hasChanges && (
          <div className="mt-8 p-6 bg-indigo-600/20 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 relative z-10">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-indigo-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-sm font-bold text-indigo-100">您有尚未儲存的個人檔案變更</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleCancelChanges}
                disabled={isSavingAvatar}
                className="px-4 py-2 hover:bg-white/10 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
              >
                取消還原
              </button>
              <button 
                onClick={handleSaveChanges}
                disabled={isSavingAvatar}
                className="px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {isSavingAvatar ? '儲存中...' : '確認儲存'}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* PRP 績效管理區塊 [Sprint 1] */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">PRP 績效管理</h2>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Personal Review Process & AI Synthesis</p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {isFetchingPrp && prpRecords.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center gap-4">
               <div className="w-6 h-6 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading records...</p>
            </div>
          ) : prpRecords.length === 0 ? (
            <div className="py-12 text-center rounded-[2rem] border-2 border-dashed border-slate-100">
               <p className="text-slate-300 italic font-bold">目前尚無歷史考核紀錄，將由管理員統一匯入處置後顯示。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {prpRecords.map(record => (
                <div key={record.id} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:bg-white hover:border-indigo-100 transition-all group overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-all">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">{record.period} 年度</p>
                      <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight italic">Achievement Report</h3>
                    </div>
                    <div className={`px-4 py-1.5 rounded-xl font-black text-lg ${
                      ['S', 'A'].includes(record.finalRating) ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {record.finalRating}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                      <span className="font-bold text-slate-700 text-xs">{record.department}</span>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-6">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Items Count</span>
                      <span className="font-bold text-slate-700 text-xs">{record.items?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Message Board */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">開發者留言板</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">給予系統優化建議或鼓勵</p>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {messages.length} 則留言
          </div>
        </div>

        {/* Input area */}
        <div className="p-8 bg-slate-50/50 border-b border-slate-100">
          <form onSubmit={handlePostMessage} className="space-y-4">
            <textarea
              required
              rows={3}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="有什麼話想對開發者說嗎？所有人都看得到您的留言唷！"
              className="w-full rounded-2xl border-slate-200 p-6 font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all shadow-inner bg-white"
            />
            <div className="flex justify-end">
              <button 
                type="submit"
                disabled={isPosting || !newMessage.trim()}
                className="px-10 py-3.5 bg-slate-900 text-white font-black rounded-xl hover:bg-indigo-600 transition-all disabled:opacity-30 shadow-xl shadow-slate-200"
              >
                {isPosting ? '留言傳送中...' : '送出留言'}
              </button>
            </div>
          </form>
        </div>

        {/* List area */}
        <div className="p-8 space-y-8 max-h-[500px] overflow-y-auto scrollbar-hide">
          {isLoadingMessages && messages.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 text-center text-slate-300 italic font-bold">目前尚無任何留言，搶當第一個！</div>
          ) : messages.map((msg) => (
            <div key={msg.id} className="flex gap-5 group animate-in fade-in slide-in-from-top-2">
              <img src={msg.userAvatar} className="w-12 h-12 rounded-2xl shadow-md flex-shrink-0" alt="" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-black text-slate-900">{msg.userName}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(msg.createdAt).toLocaleString()}</p>
                </div>
                <div className="p-5 bg-white border border-slate-100 rounded-2xl rounded-tl-none shadow-sm group-hover:border-indigo-100 transition-colors">
                  <p className="text-slate-700 leading-relaxed font-medium">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};

export default Profile;