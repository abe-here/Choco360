import React, { useState, useEffect, useMemo } from 'react';
import { analyzeFeedback } from '../services/geminiService';
import { api } from '../services/api';
import { AIAnalysis, User, FeedbackEntry, Questionnaire, Nomination, Dimension, Question } from '../types';

// ==========================================
// 【子組件：分數標籤 (緊緻版)】
// ==========================================
const ScoreBadge: React.FC<{ score: number; isSelf?: boolean }> = ({ score, isSelf }) => {
  const getColor = (s: number, self: boolean) => {
    if (self) return 'text-white bg-indigo-600 border-indigo-600'; 
    if (s >= 4) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (s === 3) return 'text-orange-700 bg-orange-50 border-orange-200';
    if (s === 2) return 'text-rose-700 bg-rose-50 border-rose-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <div className={`w-7 h-7 rounded border ${getColor(score, !!isSelf)} flex items-center justify-center font-bold text-xs shadow-sm`}>
      {score}
    </div>
  );
};

// ==========================================
// 【手工 SVG 雷達圖組件】
// ==========================================
interface ManualRadarChartProps {
  data: { subject: string; peer: number; self: number }[];
  size?: number;
}

const ManualRadarChart: React.FC<ManualRadarChartProps> = ({ data, size = 400 }) => {
  const center = size / 2;
  const radius = (size / 2) * 0.7;
  const totalPoints = data.length;

  if (totalPoints < 3) return <div className="flex items-center justify-center h-full text-slate-300 italic">數據不足以生成雷達圖</div>;

  const getCoordinates = (index: number, value: number, max: number = 5) => {
    const angle = (Math.PI * 2 * index) / totalPoints - Math.PI / 2;
    const r = (Math.max(0, value) / max) * radius;
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
  };

  const gridLevels = [1, 2, 3, 4, 5].map(level => data.map((_, i) => {
    const { x, y } = getCoordinates(i, level);
    return `${x},${y}`;
  }).join(' '));

  const peerPath = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.peer);
    return `${x},${y}`;
  }).join(' ');

  const selfPath = data.map((d, i) => {
    const { x, y } = getCoordinates(i, d.self);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
      {gridLevels.map((points, i) => <polygon key={i} points={points} fill="none" stroke="#e2e8f0" strokeWidth="1" />)}
      {data.map((_, i) => {
        const { x, y } = getCoordinates(i, 5);
        return (
          <React.Fragment key={i}>
            <line x1={center} y1={center} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text
              x={center + (radius + 25) * Math.cos((Math.PI * 2 * i) / totalPoints - Math.PI / 2)}
              y={center + (radius + 25) * Math.sin((Math.PI * 2 * i) / totalPoints - Math.PI / 2)}
              textAnchor="middle"
              className="text-[10px] font-black fill-slate-400 uppercase tracking-tighter"
            >
              {data[i].subject}
            </text>
          </React.Fragment>
        );
      })}
      <polygon points={peerPath} fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="3" strokeLinejoin="round" />
      <polygon points={selfPath} fill="rgba(79, 70, 229, 0.2)" stroke="#4f46e5" strokeWidth="3" strokeLinejoin="round" />
      <circle cx={center} cy={center} r="3" fill="#cbd5e1" />
    </svg>
  );
};

// ==========================================
// 【我的報告主組件】
// ==========================================
interface ReportsProps {
  user: User;
}

const Reports: React.FC<ReportsProps> = ({ user }) => {
  const [myNominations, setMyNominations] = useState<Nomination[]>([]);
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([]);
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 【新增】：管理員功能 - 查看不同用戶的報告
  const [targetUserId, setTargetUserId] = useState(user.id);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [targetUser, setTargetUser] = useState<User>(user);

  useEffect(() => {
    fetchInitialData();
  }, [targetUserId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [noms, fbs, qs, users] = await Promise.all([
        api.getNominationsByRequester(targetUserId),
        api.getFeedbacksForUser(targetUserId),
        api.getQuestionnaires(),
        user.isSystemAdmin ? api.getUsers() : Promise.resolve([])
      ]);


      setMyNominations(noms);
      setFeedbacks(fbs);
      setQuestionnaires(qs);
      setAllUsers(users);
      
      if (user.isSystemAdmin) {
        const tUser = users.find(u => u.id === targetUserId);
        if (tUser) setTargetUser(tUser);
      } else {
        setTargetUser(user);
      }

      // 【優化邏輯】：自動選取最新且「已有數據」的週期
      if (noms.length > 0) {
        const nominationWithData = noms.find(n => fbs.some(f => f.nominationId === n.id));
        setSelectedNomination(nominationWithData || noms[0]);
      } else {
        setSelectedNomination(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const currentFeedbacks = useMemo(() => {
    if (!selectedNomination) return [];
    // 優先按 nominationId 精確比對（新資料）
    const byNomination = feedbacks.filter(f => f.nominationId === selectedNomination.id);
    if (byNomination.length > 0) return byNomination;
    // Fallback：若 nomination_id 為 null（舊資料），改用 questionnaireId 相容顯示
    const byQuestionnaire = feedbacks.filter(f => !f.nominationId && f.questionnaireId === selectedNomination.questionnaireId);
    return byQuestionnaire;
  }, [selectedNomination, feedbacks]);

  const currentQuestionnaire = useMemo(() => {
    if (!selectedNomination) return null;
    return questionnaires.find(q => q.id === selectedNomination.questionnaireId);
  }, [selectedNomination, questionnaires]);

  // 【強化邏輯】：計算維度平均值，排除 1 分 (不清楚)
  const dimensionMetrics = useMemo(() => {
    if (!currentQuestionnaire || !currentFeedbacks.length) return [];
    return currentQuestionnaire.dimensions
      .filter(dim => dim.questions.some(q => q.type === 'rating'))
      .map(dim => {
      // 他評平均計算：過濾掉 score === 1
      const peerResponses = currentFeedbacks
        .filter(f => f.fromUserId !== targetUser.id)
        .flatMap(f => f.responses)
        .filter(r => r.dimensionName === dim.name && r.score && r.score > 1);

      // 自評平均計算
      const selfResponses = currentFeedbacks
        .filter(f => f.fromUserId === targetUser.id)
        .flatMap(f => f.responses)
        .filter(r => r.dimensionName === dim.name && r.score);

      const peerAvg = peerResponses.length > 0 
        ? peerResponses.reduce((acc, curr) => acc + (curr.score || 0), 0) / peerResponses.length 
        : 0;
      
      const selfAvg = selfResponses.length > 0 
        ? selfResponses.reduce((acc, curr) => acc + (curr.score || 0), 0) / selfResponses.length 
        : 0;

      return { subject: dim.name, peer: parseFloat(peerAvg.toFixed(1)), self: parseFloat(selfAvg.toFixed(1)) };
    });
  }, [currentQuestionnaire, currentFeedbacks, targetUser.id]);

  const handleRunAI = async () => {
    if (!selectedNomination || !currentQuestionnaire || currentFeedbacks.length < 2) {
      alert("數據不足（需包含自評與至少一位他評）");
      return;
    }
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeFeedback(currentFeedbacks, currentQuestionnaire);
      await api.updateNominationAnalysis(selectedNomination.id, analysis, currentFeedbacks.length);
      setSelectedNomination(prev => prev ? { ...prev, aiAnalysis: analysis, analysisFeedbackCount: currentFeedbacks.length } : null);
    } catch (err: any) {
      console.error(err);
      alert(err instanceof Error ? err.message : err?.message || 'AI 分析產生失敗，請確認資料庫權限或稍後再試。');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ==========================================
  // 【匯出功能】：Markdown
  // ==========================================
  const downloadMarkdown = () => {
    if (!selectedNomination || !currentQuestionnaire) return;

    let md = `# ${selectedNomination.title} - 成長報告\n\n`;
    md += `**受評人**: ${targetUser.name}\n`;
    md += `**生成時間**: ${new Date().toLocaleDateString()}\n\n`;

    if (selectedNomination.aiAnalysis) {
      md += `## AI 成長導師分析 (基於 ${selectedNomination.analysisFeedbackCount} 份回饋)\n\n`;
      md += `> ${selectedNomination.aiAnalysis.summary}\n\n`;
      md += `### 顯性優勢 (Strengths)\n`;
      selectedNomination.aiAnalysis.strengths.forEach(s => md += `- ${s}\n`);
      md += `\n### 待解盲點 (Growth Areas)\n`;
      selectedNomination.aiAnalysis.growthAreas.forEach(g => md += `- ${g}\n`);
      md += `\n`;
    }

    md += `## 維度指標摘要\n\n`;
    md += `| 維度 | 自評平均 | 他評平均 | 落差 |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    dimensionMetrics.forEach(m => {
      const diff = (m.peer - m.self).toFixed(1);
      md += `| ${m.subject} | ${m.self} | ${m.peer} | ${diff} |\n`;
    });
    md += `\n`;

    md += `## 詳細回饋內容\n\n`;
    currentQuestionnaire.dimensions.forEach((dim, dIdx) => {
      md += `### ${dIdx + 1}. ${dim.name}\n`;
      dim.questions.forEach((q, qIdx) => {
        md += `#### ${dIdx + 1}.${qIdx + 1} ${q.text}\n`;
        const selfRes = currentFeedbacks.find(f => f.fromUserId === targetUser.id)?.responses.find(r => r.questionId === q.id);
        const peerRes = currentFeedbacks.filter(f => f.fromUserId !== targetUser.id).flatMap(f => f.responses).filter(r => r.questionId === q.id);

        if (q.type === 'rating') {
          const pAvg = peerRes.length > 0 ? (peerRes.filter(r => r.score && r.score > 1).reduce((a, c) => a + (c.score || 0), 0) / peerRes.filter(r => r.score && r.score > 1).length).toFixed(1) : '--';
          md += `- **自評分數**: ${selfRes?.score || '--'}\n`;
          md += `- **他評平均**: ${pAvg}\n`;
        } else {
          if (selfRes?.answerText) md += `- **您的看法**: *"${selfRes.answerText}"*\n`;
          md += `- **同事觀察**:\n`;
          peerRes.filter(r => r.answerText).forEach(r => md += `  - *"${r.answerText}"*\n`);
        }
        md += `\n`;
      });
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${targetUser.name}_Growth_Report_${selectedNomination.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400">DATA SYNCHRONIZING...</div>;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-20 print:space-y-6 print:pb-0 print:bg-white">
      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white; }
        }
      `}</style>
      <header className="print:hidden">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">個人成長報告</h1>
        <p className="text-slate-500 text-lg mt-1 tracking-tight">專屬於您的專業表現深度洞察與分析。</p>
      </header>
      
      {/* 【新版佈局：Dossier Card】 */}
      <div className="bg-white rounded-[3rem] p-8 md:p-10 border border-slate-100 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 animate-in fade-in slide-in-from-top-4 print:hidden">
        {/* 左側：受評人資訊 */}
        <div className="flex items-center gap-6 w-full lg:w-auto min-w-0">
          <div className="relative group flex-shrink-0">
            <img 
              src={targetUser.avatar} 
              alt={targetUser.name} 
              className="w-20 h-20 rounded-[2rem] border-4 border-slate-50 shadow-lg object-cover group-hover:scale-105 transition-transform" 
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
          </div>
          
          <div className="space-y-1 flex-1 min-w-0">
            {user.isSystemAdmin ? (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest">管理員視角：切換人員</label>
                <select 
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="text-lg font-black text-slate-900 bg-transparent border-none p-0 outline-none cursor-pointer hover:text-indigo-600 transition-colors max-w-full truncate"
                >
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <p className="text-xs text-slate-500 font-semibold truncate mt-0.5">{targetUser.role || '員工 IC'} • {targetUser.department}</p>
              </div>
            ) : (
              <div className="min-w-0 space-y-1">
                <h2 className="text-lg font-black text-slate-900 tracking-tight truncate">{targetUser.name}</h2>
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider truncate mt-0.5">{targetUser.role || '員工 IC'} • {targetUser.department}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右側：週期與匯出按鈕組合 */}
        <div className="flex flex-col xl:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="bg-slate-50 py-2.5 px-4 border border-slate-100 rounded-2xl w-full xl:w-auto min-w-[280px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">評鑑週期切換</label>
            <select 
              value={selectedNomination?.id || ''}
              onChange={(e) => setSelectedNomination(myNominations.find(n => n.id === e.target.value) || null)}
              className="w-full bg-transparent border-none font-bold text-slate-800 outline-none p-0 cursor-pointer text-sm"
            >
              {myNominations.length > 0 ? (
                myNominations.map(n => <option key={n.id} value={n.id}>{n.title}</option>)
              ) : <option value="">尚無歷史報告</option>}
            </select>
          </div>

          <div className="flex gap-2 w-full xl:w-auto justify-center flex-shrink-0">
            <button 
              onClick={downloadMarkdown}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-white border border-slate-200 text-slate-700 font-bold text-[13px] rounded-xl hover:bg-slate-50 transition-all shadow-sm group"
              title="下載 Markdown"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>MD 存檔</span>
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-slate-900 text-white font-bold text-[13px] rounded-xl hover:bg-slate-800 transition-all shadow-md group border border-slate-800 whitespace-nowrap"
              title="列印報告 (PDF)"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>PDF 匯出</span>
            </button>
          </div>
        </div>
      </div>

      {/* 打印標題 (僅在列印時顯示) */}
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-4 mb-6">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">360 成長評鑑個人報告</h1>
        <div className="mt-3 flex justify-center gap-8 font-bold text-slate-700 text-sm">
           <p>受評對象：{targetUser.name}</p>
           <p>評鑑週期：{selectedNomination?.title}</p>
           <p>生成日期：{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* 數據看板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print:flex print:flex-col print:gap-6">
        <section className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl flex flex-col items-center print:p-6 print:shadow-none print:border-slate-300 print:break-inside-avoid print:rounded-2xl">
          <div className="w-full flex justify-between items-center mb-8">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">落差分析雷達圖</h2>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">自評</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">他評平均</span>
              </div>
            </div>
          </div>
          <div className="w-full aspect-square max-w-[400px]">
            <ManualRadarChart data={dimensionMetrics} />
          </div>
        </section>

        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col print:bg-slate-50 print:text-slate-900 print:shadow-none print:border print:border-slate-300 print:p-8 print:break-inside-avoid print:rounded-2xl">
          <div className="relative z-10 flex justify-between items-start mb-8 print:mb-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight print:text-slate-900">Gemini AI 成長導師</h2>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-1 print:text-slate-500">基於 {selectedNomination?.analysisFeedbackCount || 0} 份回饋分析</p>
            </div>
            <button onClick={handleRunAI} disabled={isAnalyzing} className="px-6 py-2 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 transition-all">
              {isAnalyzing ? '分析中...' : '生成 AI 洞察'}
            </button>
          </div>
          <div className="relative z-10 flex-1 overflow-y-auto pr-2 scrollbar-hide">
            {selectedNomination?.aiAnalysis ? (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl italic text-sm text-indigo-100 leading-relaxed print:bg-white print:border-slate-200 print:text-slate-700 print:rounded-2xl">
                  「 {selectedNomination.aiAnalysis.summary} 」
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs print:text-slate-800">
                  <div className="space-y-3">
                    <p className="font-black text-emerald-400 uppercase tracking-widest print:text-emerald-700">顯性優勢 (Strengths)</p>
                    {selectedNomination.aiAnalysis.strengths.map((s, i) => <div key={i} className="flex gap-2"><span>•</span>{s}</div>)}
                  </div>
                  <div className="space-y-3">
                    <p className="font-black text-amber-400 uppercase tracking-widest print:text-amber-700">待解盲點 (Growth Areas)</p>
                    {selectedNomination.aiAnalysis.growthAreas.map((g, i) => <div key={i} className="flex gap-2"><span>•</span>{g}</div>)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/10 rounded-[2.5rem] bg-white/5">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-white font-black uppercase tracking-widest text-xs mb-2">AI 導師準備中</p>
                <p className="text-slate-400 text-[10px] leading-relaxed max-w-[200px]">
                  {currentFeedbacks.length < 2 
                    ? "數據收集完成後將由 AI 自動生成洞察（需包含自評與至少一位他評）。" 
                    : "數據已滿足，請點擊上方按鈕生成 AI 深度分析。"}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 原始數據細節 (緊緻表格版) */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden mt-8 print:shadow-none print:mt-4 print:border-none">
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 print:py-4 print:bg-white print:border-b-2 print:border-slate-300 print:break-after-avoid">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">原始數據細項</h2>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Raw Feedback Metrics & Details</p>
          </div>
          <div className="flex gap-3 text-[10px] font-bold uppercase tracking-widest">
            <span className="text-indigo-700 bg-indigo-50 px-2.5 py-1.5 rounded-md border border-indigo-200 shadow-sm flex items-center gap-1.5"><span className="w-2 h-2 bg-indigo-500 rounded-sm"></span>您的自評</span>
            <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-md border border-emerald-200 shadow-sm flex items-center gap-1.5"><span className="w-2 h-2 bg-emerald-500 rounded-sm"></span>同事評分</span>
          </div>
        </div>

        <div className="flex flex-col">
          {currentQuestionnaire?.dimensions.map((dim, dIdx) => {
            const dimMetric = dimensionMetrics.find(m => m.subject === dim.name);
            return (
              <div key={dim.id} className="border-b-4 border-slate-200 last:border-b-0 animate-in slide-in-from-bottom-4 print:border-b-2">
                {/* 維度標題與摘要對照 (表頭) */}
                <div className="px-8 py-5 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative print:bg-slate-50 print:border-slate-300 print:py-4 print:break-after-avoid print:break-inside-avoid">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-black text-lg border border-slate-700 print:bg-white print:text-slate-900 print:border-slate-400">{dIdx + 1}</div>
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight print:text-slate-900">{dim.name}</h3>
                      <p className="text-xs text-slate-400 font-medium italic mt-0.5 print:text-slate-600">{dim.purpose}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-8 items-center bg-slate-800/50 py-2 px-6 rounded-2xl border border-slate-700/50 print:bg-white print:border-slate-300">
                    <div className="text-center">
                      <span className="block text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1 print:text-indigo-600">維度自評均標</span>
                      <span className="text-xl font-black text-white leading-none print:text-indigo-700">{dimMetric?.self || '--'}</span>
                    </div>
                    <div className="w-px h-8 bg-slate-700 print:bg-slate-300"></div>
                    <div className="text-center">
                      <span className="block text-[9px] font-bold text-emerald-400 uppercase tracking-widest mb-1 print:text-emerald-700">維度他評均標</span>
                      <span className="text-xl font-black text-white leading-none print:text-emerald-700">{dimMetric?.peer || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* 維度下的題目清單 (表格列) */}
                <div className="divide-y border-t border-slate-100 divide-slate-100 bg-white">
                  {dim.questions.map((q, qIdx) => {
                    const peerResponsesForCalc = currentFeedbacks.filter(f => f.fromUserId !== targetUser.id).flatMap(f => f.responses).filter(r => r.questionId === q.id && r.score && r.score > 1);
                    const allPeerResponsesForDisplay = currentFeedbacks.filter(f => f.fromUserId !== targetUser.id).flatMap(f => f.responses).filter(r => r.questionId === q.id && r.score);
                    const selfResponse = currentFeedbacks.filter(f => f.fromUserId === targetUser.id).flatMap(f => f.responses).find(r => r.questionId === q.id);
                    const peerAvg = peerResponsesForCalc.length > 0 ? (peerResponsesForCalc.reduce((a, c) => a + (c.score || 0), 0) / peerResponsesForCalc.length).toFixed(1) : '--';
                    
                    const selfScoreNum = selfResponse?.score || 0;
                    const peerAvgNum = parseFloat(peerAvg) || 0;
                    const toPct = (val: number) => Math.max(0, Math.min(100, ((val - 1) / 4) * 100));
                    const selfPct = toPct(selfScoreNum);
                    const peerPct = toPct(peerAvgNum);
                    const minPct = Math.min(selfPct, peerPct);
                    const maxPct = Math.max(selfPct, peerPct);
                    const gapPct = maxPct - minPct;

                    return (
                      <div key={q.id} className="px-8 py-8 hover:bg-slate-50/50 transition-colors group print:break-inside-avoid print:py-5 print:px-4">
                        {q.type === 'rating' ? (
                          <div className="flex flex-col gap-6">
                            {/* 上半部：題目與落差長條圖 */}
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8">
                              {/* 題目 */}
                              <div className="flex items-start gap-4 flex-1">
                                <span className="text-slate-300 font-black text-sm pt-0 w-8 flex-shrink-0 text-right">{dIdx + 1}.{qIdx + 1}</span>
                                <h4 className="text-[15px] font-semibold text-slate-800 leading-relaxed pr-4">{q.text}</h4>
                              </div>
                              
                              {/* 比較數值看板 */}
                              <div className="flex-shrink-0 w-full xl:w-auto flex items-center pl-[3.25rem] xl:pl-0 mt-2 xl:mt-0">
                                <div className="flex items-center gap-5 xl:gap-8 bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80 shadow-sm w-full xl:w-auto justify-between xl:justify-start">
                                  <div className="flex flex-col items-center min-w-[3.5rem]">
                                    <span className="text-[10px] font-bold text-indigo-400 tracking-wider mb-1.5 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>自評
                                    </span>
                                    <span className="text-2xl font-black text-indigo-600 leading-none">
                                      {selfScoreNum > 0 ? selfScoreNum.toFixed(1) : '--'}
                                    </span>
                                  </div>
                                  
                                  <div className="flex flex-col items-center justify-center min-w-[5rem]">
                                    {(selfScoreNum > 0 && peerAvgNum > 0) ? (
                                      <>
                                        <span className={`text-xs font-black px-2 py-1 rounded-md shadow-sm ${
                                          selfScoreNum > peerAvgNum 
                                            ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                                            : selfScoreNum < peerAvgNum 
                                              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                                        }`}>
                                          {selfScoreNum > peerAvgNum ? `-${(selfScoreNum - peerAvgNum).toFixed(1)}` : selfScoreNum < peerAvgNum ? `+${(peerAvgNum - selfScoreNum).toFixed(1)}` : '0.0'}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 mt-1.5 whitespace-nowrap">
                                          {selfScoreNum > peerAvgNum ? '自評 > 他評' : selfScoreNum < peerAvgNum ? '自評 < 他評' : '認知一致'}
                                        </span>
                                      </>
                                    ) : (
                                      <div className="w-px h-8 bg-slate-200"></div>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-center min-w-[3.5rem]">
                                    <span className="text-[10px] font-bold text-emerald-500 tracking-wider mb-1.5 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>他評
                                    </span>
                                    <span className="text-2xl font-black text-emerald-600 leading-none">{peerAvg}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* 下半部：同事評分細項 (只在題目下方折疊展示) */}
                            <div className="pl-[3.25rem]">
                              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">同事評分分佈 ({allPeerResponsesForDisplay.length} 則)</span>
                                <div className="flex flex-wrap gap-2">
                                  {allPeerResponsesForDisplay.map((res, i) => (
                                    <ScoreBadge key={i} score={res.score!} />
                                  ))}
                                  {allPeerResponsesForDisplay.length === 0 && <span className="text-xs text-slate-300 italic">尚未收到回饋</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-6 items-start">
                            {/* 題目描述 */}
                            <div className="flex items-start gap-4">
                              <span className="text-slate-300 font-black text-sm pt-0 w-8 flex-shrink-0 text-right">{dIdx + 1}.{qIdx + 1}</span>
                              <div>
                                <span className="inline-block text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded mb-2">簡答文字題</span>
                                <h4 className="text-[15px] font-semibold text-slate-800 leading-relaxed max-w-4xl">{q.text}</h4>
                              </div>
                            </div>
                            
                            {/* 問答內容 */}
                            <div className="w-full pl-[3.25rem] space-y-4">
                              {selfResponse?.answerText && (
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 shadow-sm relative">
                                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 rounded-l-xl"></div>
                                  <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 您的自評觀點
                                  </p>
                                  <p className="text-[14px] font-medium text-indigo-900 leading-relaxed">"{selfResponse.answerText}"</p>
                                </div>
                              )}
                              
                              <div className="space-y-2.5">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full"></span> 同事具體意見 ({currentFeedbacks.filter(f => f.fromUserId !== targetUser.id).flatMap(f => f.responses.filter(r => r.questionId === q.id && r.answerText)).length} 則)
                                </p>
                                <ul className="space-y-2.5">
                                  {currentFeedbacks
                                    .filter(f => f.fromUserId !== targetUser.id)
                                    .flatMap(f => f.responses.filter(r => r.questionId === q.id && r.answerText))
                                    .map((res, i) => (
                                      <li key={i} className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:border-emerald-200 transition-colors text-[14px] text-slate-700 leading-relaxed">
                                        "{res.answerText}"
                                      </li>
                                    ))}
                                  {currentFeedbacks.filter(f => f.fromUserId !== targetUser.id).flatMap(f => f.responses.filter(r => r.questionId === q.id && r.answerText)).length === 0 && (
                                      <li className="text-sm text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center">目前無任何同事留下文字回饋</li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Reports;