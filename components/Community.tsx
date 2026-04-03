import React, { useState } from 'react';
import { User } from '../types';

interface CommunityProps {
  users: User[];
  currentUser: User | null;
}

const getSuperpowerColor = (category?: string) => {
  switch(category) {
    case 'strategic': return 'from-blue-500 to-indigo-500';
    case 'support': return 'from-pink-500 to-rose-500';
    case 'leadership': return 'from-amber-400 to-orange-500';
    default: return 'from-slate-700 to-slate-800';
  }
};

const Community: React.FC<CommunityProps> = ({ users, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // 結合真實的超能力資料
  const enhancedUsers = users.map(u => {
    let superpower = u.unlockedSuperpowers?.find(s => s.id === u.activeSuperpowerId);
    if (!superpower && u.unlockedSuperpowers && u.unlockedSuperpowers.length > 0) {
       superpower = u.unlockedSuperpowers[0];
    }
    return {
      ...u,
      displaySuperpower: superpower,
      displayMotto: u.motto || "I'm still exploring my superpowers."
    };
  }).filter(u => {
    const isActive = u.status !== 'resigned';
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         u.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (u.displaySuperpower && u.displaySuperpower.title.toLowerCase().includes(searchTerm.toLowerCase()));
    return isActive && matchesSearch;
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 blur-3xl -z-10 rounded-full"></div>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-black tracking-widest uppercase rounded-full mb-4">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          實驗功能預覽 (Under Construction)
        </div>
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Choco Community 🍫</h1>
        <p className="text-slate-500 mt-2 text-lg">發掘團隊夥伴的隱藏特質，看看大家眼中的超能力！</p>
      </header>

      {/* 搜尋列 */}
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center flex-shrink-0 text-slate-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input 
          type="text" 
          placeholder="搜尋夥伴姓名、部門或超能力..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-none text-lg font-bold text-slate-900 placeholder:text-slate-300 focus:ring-0 outline-none"
        />
      </section>

      {/* 英雄榜網格 */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {enhancedUsers.map(user => (
          <div key={user.id} className="group relative bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border border-white/5 cursor-pointer">
            
            {/* 炫光背景 (Aura) */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-tr ${user.displaySuperpower ? getSuperpowerColor(user.displaySuperpower.category) : 'from-slate-800 to-slate-900'} rounded-full blur-[40px] opacity-40 group-hover:opacity-70 group-hover:scale-125 transition-all duration-700 pointer-events-none`}></div>
            
            <div className="relative z-10 flex flex-col items-center text-center space-y-4">
              
              {/* 超能力標籤 */}
              <div className="h-6">
                <span className={`px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-black uppercase tracking-[0.2em] rounded-full text-white ${user.displaySuperpower ? 'opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0' : 'opacity-0'}`}>
                  {user.displaySuperpower?.title || 'NO SUPERPOWER'}
                </span>
              </div>

              {/* 頭像 */}
              <div className="relative">
                <div className="w-24 h-24 rounded-[1.5rem] bg-white/5 border border-white/10 p-2 relative z-10">
                  <img src={user.avatar} className="w-full h-full object-cover rounded-[1rem] shadow-inner" alt={user.name} />
                </div>
                {/* 發光外框效果 */}
                <div className={`absolute inset-0 bg-gradient-to-tr ${user.displaySuperpower ? getSuperpowerColor(user.displaySuperpower.category) : 'from-slate-800 to-slate-900'} rounded-[1.5rem] opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-500 -z-10`}></div>
              </div>

              {/* 資訊 */}
              <div>
                <h3 className="text-lg font-black tracking-tight">{user.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{user.department} / {user.role}</p>
              </div>

              {/* 格言 */}
              <p className="text-xs text-slate-300 font-medium italic mt-2 line-clamp-2 px-2">"{user.displayMotto}"</p>
              
              {/* 按鈕 */}
              <button className="mt-4 w-full py-2.5 bg-white/10 hover:bg-white text-white hover:text-slate-900 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300 shadow-lg">
                View Profile
              </button>

            </div>
          </div>
        ))}

        {enhancedUsers.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-400 font-bold">
            找不到符合的夥伴
          </div>
        )}
      </section>
    </div>
  );
};

export default Community;
