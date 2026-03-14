import React, { useState, useEffect } from 'react';
import { User, SystemMessage } from '../types';
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
  
  // 新增：暫存頭像狀態，預設為當前頭像
  const [tempAvatar, setTempAvatar] = useState(user.avatar);

  useEffect(() => {
    fetchMessages();
  }, []);

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

  // 新增：正式儲存頭像
  const handleSaveAvatar = async () => {
    setIsSavingAvatar(true);
    try {
      await api.updateAvatar(user.id, tempAvatar);
      onUserUpdate({ ...user, avatar: tempAvatar });
      // 成功後，暫存與正式會同步，按鈕會自動消失
    } catch (err) {
      alert("儲存頭像失敗，請檢查網路連線");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  // 新增：還原頭像
  const handleCancelAvatar = () => {
    setTempAvatar(user.avatar);
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
  const hasAvatarChange = tempAvatar !== user.avatar;

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
              <img 
                src={tempAvatar} 
                className={`w-40 h-40 rounded-[3rem] border-4 border-white/20 shadow-2xl bg-slate-800 transition-all ${isRefreshingAvatar ? 'opacity-50 scale-95 blur-sm' : ''} ${hasAvatarChange ? 'ring-4 ring-indigo-500 ring-offset-4 ring-offset-slate-900' : ''}`} 
                alt={user.name} 
              />
              <button 
                onClick={handlePreviewAvatar}
                disabled={isRefreshingAvatar || isSavingAvatar}
                className="absolute -bottom-2 -right-2 w-12 h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl flex items-center justify-center shadow-xl transition-all active:scale-90 disabled:opacity-50"
                title="刷新隨機預覽"
              >
                <svg className={`w-6 h-6 ${isRefreshingAvatar ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            
            {/* 儲存動作區：僅在有變動時顯示 */}
            {hasAvatarChange && (
              <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex gap-2">
                  <button 
                    onClick={handleSaveAvatar}
                    disabled={isSavingAvatar}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2"
                  >
                    {isSavingAvatar ? (
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                    儲存頭像
                  </button>
                  <button 
                    onClick={handleCancelAvatar}
                    disabled={isSavingAvatar}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                  >
                    取消還原
                  </button>
                </div>
                <p className="text-[9px] font-bold text-indigo-400 animate-pulse">您目前的頭像尚未儲存</p>
              </div>
            )}
            
            {!hasAvatarChange && (
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-white/5 px-4 py-1.5 rounded-full border border-white/10">Avatar Seed Engine v7</span>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
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