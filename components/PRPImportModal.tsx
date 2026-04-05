import React, { useState } from 'react';
import { User } from '../types';
import { prpImportService, ParsedPRP } from '../services/prpImportService';
import { api } from '../services/api';

interface PRPImportModalProps {
  userId?: string;
  users?: User[];
  isAdminMode?: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * PRP 匯入彈窗
 * 處理 Markdown 檔案讀取、Gemini 解析與最終資料存檔
 */
const PRPImportModal: React.FC<PRPImportModalProps> = ({ userId, users = [], isAdminMode = false, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: Upload, 2: Parsing, 3: Preview
  const [parsedData, setParsedData] = useState<ParsedPRP | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(userId || null);
  const [error, setError] = useState<string | null>(null);
  const [rawContent, setRawContent] = useState('');
  const [hasCache, setHasCache] = useState(false);

  React.useEffect(() => {
    if (localStorage.getItem('prp_debug_cache')) {
      setHasCache(true);
    }
  }, []);

  const loadFromCache = () => {
    try {
      const cache = JSON.parse(localStorage.getItem('prp_debug_cache') || '{}');
      if (cache.parsedData && cache.rawContent) {
        setParsedData(cache.parsedData);
        setRawContent(cache.rawContent);
        setStep(3);
        setError(null);
      }
    } catch (e) {
      console.error("Cache load error:", e);
      localStorage.removeItem('prp_debug_cache');
      setHasCache(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      setRawContent(content);
      setError(null);
      setStep(2);
      try {
        const data = await prpImportService.parsePRPMarkdown(content);
        setParsedData(data);
        
        // 如果是管理員模式，嘗試根據解析出的姓名自動匹配使用者
        if (isAdminMode && data.name) {
          const matchedUser = users.find(u => u.name.includes(data.name) || data.name.includes(u.name));
          if (matchedUser) {
            setSelectedUserId(matchedUser.id);
          }
        }
        
        // 為了除錯方便，將解析結果存入 localStorage
        localStorage.setItem('prp_debug_cache', JSON.stringify({ parsedData: data, rawContent: content }));
        setHasCache(true);
        
        setStep(3);
      } catch (err: any) {
        setError(err.message);
        setStep(1);
      }
    };
    reader.onerror = () => {
      setError("檔案讀取失敗");
      setStep(1);
    };
    reader.readAsText(file);
  };

  const handleConfirm = async () => {
    if (!parsedData || !selectedUserId) {
      if (!selectedUserId) setError("請先選擇要關聯的員工");
      return;
    }
    setStep(2); // 借用 Step 2 的 Loading 狀態
    console.log("🚀 [PRP Import] Starting save process...");
    
    try {
      await api.savePRPRecord({
        userId: selectedUserId,
        period: parsedData.period,
        department: parsedData.department,
        jobTitle: parsedData.jobTitle,
        employeeCode: parsedData.employeeCode,
        overallSelfSummary: parsedData.overallSelfSummary || '',
        overallManagerComments: parsedData.overallManagerComments || [],
        finalRating: parsedData.finalRating || '',
        source: 'import',
      } as any, parsedData.items as any);
      
      console.log("✅ [PRP Import] Save successful!");
      window.alert("🎉 績效紀錄儲存成功！");
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("🔴 [PRP Import] Save process failed:", err);
      // alert 在 api.ts 已經有噴過一次詳細的了，這裡做 UI 更新
      setError("儲存失敗：" + (err.message || "未知伺服器錯誤"));
      setStep(3);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-black italic tracking-tight">PRP 績效考核匯入</h3>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">AI-Assisted Document Parsing</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
          {step === 1 && (
            <div className="flex flex-col items-center justify-center py-20 border-4 border-dashed border-slate-100 rounded-[3rem] space-y-6">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center animate-bounce">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-slate-900">上傳考核 Markdown 檔案</p>
                <p className="text-slate-400 font-bold mt-1">請將 Google Doc 匯出的 .md 檔案拖曳至此</p>
              </div>
              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-[10px] font-black uppercase tracking-widest text-center">
                  ⚠️ {error}
                </div>
              )}
              <label className="cursor-pointer px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-100 active:scale-95">
                選擇檔案
                <input type="file" className="hidden" accept=".md,.txt" onChange={handleFileUpload} />
              </label>
              
              {hasCache && (
                <button 
                  onClick={loadFromCache}
                  className="px-6 py-2 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all underline underline-offset-4 text-xs"
                >
                  載入上一次成功解析的暫存資料 (Debug)
                </button>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col items-center justify-center py-24 space-y-8">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 bg-indigo-100 rounded-full animate-pulse"></div>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xl font-black text-slate-900 animate-pulse">
                  {parsedData ? "正在將績效紀錄同步至系統..." : "Gemini 正在理解您的考核文件..."}
                </p>
                <p className="text-slate-400 font-medium mt-2 text-sm italic">
                  {parsedData ? "正在處理員工關聯與 KPI 資料儲存" : "萃取項目、主管意見與評分數據中"}
                </p>
              </div>
            </div>
          )}

          {step === 3 && parsedData && (
            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-10">
              {/* Profile Bar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner text-center">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">年度</p><p className="font-black text-slate-900">{parsedData.period}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">文件姓名</p><p className="font-black text-slate-900">{parsedData.name}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最終等第</p><p className="font-black text-indigo-600 text-xl">{parsedData.finalRating || 'N/A'}</p></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">解析狀態</p><p className="text-emerald-500 font-black">AI PARSED ✓</p></div>
              </div>

              {/* Admin User Association */}
              {isAdminMode && (
                <div className={`p-6 rounded-3xl border flex flex-col md:flex-row gap-6 items-center justify-between transition-colors ${selectedUserId ? 'bg-indigo-50 border-indigo-100' : 'bg-rose-50 border-rose-100'}`}>
                   <div className="flex items-center gap-4 text-left">
                     <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedUserId ? 'bg-indigo-600 text-white' : 'bg-rose-600 text-white'}`}>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                     </div>
                     <div>
                       <p className="text-sm font-black text-slate-900">關聯系統員工</p>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                         {selectedUserId ? '已成功關聯至系統成員' : '⚠️ 請先選擇要將此績效檔案關聯給哪位員工'}
                       </p>
                     </div>
                   </div>
                   <div className="relative w-full md:w-64">
                     <select 
                       value={selectedUserId || ''} 
                       onChange={e => setSelectedUserId(e.target.value)}
                       className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-sm text-slate-900 appearance-none focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                     >
                       <option value="">選擇員工...</option>
                       {users.map(u => (
                         <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                       ))}
                     </select>
                     <svg className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                   </div>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-2 flex items-center gap-4">
                  <span className="flex-shrink-0">KPIs & 核心職能明細 ({parsedData.items.length})</span>
                  <div className="h-px bg-slate-100 flex-1"></div>
                </h4>
                <div className="grid grid-cols-1 gap-6">
                  {parsedData.items.map((item, i) => (
                    <div key={i} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${item.itemType === 'kpi' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {item.itemType}
                          </span>
                          <h5 className="mt-2 font-black text-slate-900 underline decoration-indigo-200 decoration-4 underline-offset-4">{item.itemLabel}</h5>
                        </div>
                        {item.itemRating && <div className="text-2xl font-black text-slate-200">{item.itemRating}</div>}
                      </div>
                      <div className="space-y-1">
                        {item.selfDescription.split('\n').map((line, li) => {
                          const cleanLine = line.trim();
                          if (!cleanLine) return null;
                          const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || /^\d+\./.test(cleanLine);
                          return (
                            <p key={li} className={`text-sm text-slate-600 font-medium leading-relaxed ${isBullet ? 'pl-4 relative' : ''}`}>
                              {isBullet && <span className="absolute left-0 text-indigo-300">•</span>}
                              {isBullet ? cleanLine.replace(/^[•\-\d+\.]\s*/, '') : cleanLine}
                            </p>
                          );
                        })}
                      </div>
                      
                      {item.evaluations && item.evaluations.length > 0 && (
                        <div className="mt-6 space-y-3 pt-4 border-t border-slate-50">
                          {item.evaluations.map((ev, ei) => (
                            <div key={ei} className="flex gap-4 items-start">
                              <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-1 rounded-lg flex-shrink-0 mt-1">{ev.label}</span>
                              <div className="flex-1">
                                <p className="text-sm text-slate-500 italic">"{ev.comment}"</p>
                                {ev.score && <p className="text-[10px] font-black text-slate-400 mt-1">Score: <span className="text-slate-900">{ev.score}</span></p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Overall Comments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 space-y-4">
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">綜合考核自述 (Self)</h4>
                  <div className="space-y-1">
                    {(parsedData.overallSelfSummary || '').split('\n').map((line, li) => {
                      const cleanLine = line.trim();
                      if (!cleanLine) return null;
                      const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || /^\d+\./.test(cleanLine);
                      return (
                        <p key={li} className={`text-sm text-indigo-900 font-bold leading-relaxed ${isBullet ? 'pl-4 relative' : ''}`}>
                          {isBullet && <span className="absolute left-0 text-indigo-300">•</span>}
                          {isBullet ? cleanLine.replace(/^[•\-\d+\.]\s*/, '') : cleanLine}
                        </p>
                      );
                    })}
                    {!parsedData.overallSelfSummary && <p className="text-sm text-slate-400">（無資料）</p>}
                  </div>
                </div>
                {parsedData.overallManagerComments && parsedData.overallManagerComments.length > 0 && (
                  <div className="p-8 bg-emerald-50/50 rounded-[2.5rem] border border-emerald-100 space-y-4">
                    <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">主管總結評語 (Manager)</h4>
                    <div className="space-y-4">
                      {parsedData.overallManagerComments.map((comment, idx) => (
                        <div key={idx} className="space-y-2">
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black uppercase">{comment.label}</span>
                          <div className="space-y-1">
                            {comment.comment.split('\n').map((line, li) => {
                              const cleanLine = line.trim();
                              if (!cleanLine) return null;
                              const isBullet = cleanLine.startsWith('•') || cleanLine.startsWith('-') || /^\d+\./.test(cleanLine);
                              return (
                                <p key={li} className={`text-sm text-emerald-900 font-bold leading-relaxed ${isBullet ? 'pl-4 relative' : ''}`}>
                                  {isBullet && <span className="absolute left-0 text-emerald-400">•</span>}
                                  {isBullet ? cleanLine.replace(/^[•\-\d+\.]\s*/, '') : cleanLine}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
           {step === 3 ? (
             <>
               <button onClick={() => setStep(1)} className="text-sm font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors underline underline-offset-4">重新解析</button>
               <div className="flex gap-4">
                 <button onClick={onClose} className="px-6 py-3 text-slate-400 font-black text-sm uppercase tracking-widest rounded-xl hover:bg-slate-100">取消</button>
                 <button onClick={handleConfirm} className="px-10 py-3 bg-slate-900 text-white font-black rounded-xl shadow-xl hover:bg-indigo-600 transition-all active:scale-95">確認並存入系統</button>
               </div>
             </>
           ) : (
             <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mx-auto flex items-center gap-2">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746v5.203c0 5.061-3.345 9.773-7.834 10.997-4.489-1.224-7.834-5.936-7.834-10.997V4.9zM10 3.14l-6.25 2.99v4.073c0 4.148 2.37 8.082 6.25 9.176 3.88-1.094 6.25-5.028 6.25-9.176V6.13L10 3.14z" clipRule="evenodd" /></svg>
                Secure AI Gateway - Your data is encrypted and safe
             </p>
           )}
        </div>
      </div>
    </div>
  );
};

export default PRPImportModal;
