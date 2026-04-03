import React, { useState, useEffect, useMemo } from 'react';
import { analyzeFeedback } from '../services/geminiService';
import { api } from '../services/api';
import { AIAnalysis, User, FeedbackEntry, Questionnaire, Nomination, Dimension, Question } from '../types';

// ==========================================
// 【子組件：分數標籤】
// ==========================================
const ScoreBadge: React.FC<{ score: number; isSelf?: boolean }> = ({ score, isSelf }) => {
  const getColor = (s: number, self: boolean) => {
    if (self) return 'bg-indigo-600'; // 自評一律靛藍
    if (s >= 4) return 'bg-emerald-500';
    if (s === 3) return 'bg-orange-400';
    if (s === 2) return 'bg-rose-500';
    return 'bg-slate-500'; // 1分顯示深灰
  };

  return (
    <div className={`w-8 h-8 rounded-xl ${getColor(score, !!isSelf)} text-white flex items-center justify-center font-black text-sm shadow-sm transition-transform hover:scale-110`}>
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
    return feedbacks.filter(f => f.nominationId === selectedNomination.id);
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
    } catch (err) {
      console.error(err);
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
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 pb-20">
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
                <label className="block text-[10px] font-black text-amber-500 uppercase tracking-[0.2em]">管理員視角：切換人員</label>
                <select 
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="text-2xl font-black text-slate-900 bg-transparent border-none p-0 outline-none cursor-pointer hover:text-indigo-600 transition-colors max-w-full truncate"
                >
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <p className="text-xs text-slate-400 font-bold truncate">{targetUser.role || '員工 IC'} • {targetUser.department}</p>
              </div>
            ) : (
              <div className="min-w-0">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight truncate">{targetUser.name}</h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest truncate">{targetUser.role || '員工 IC'} • {targetUser.department}</p>
              </div>
            )}
          </div>
        </div>

        {/* 右側：週期與匯出按鈕組合 */}
        <div className="flex flex-col xl:flex-row items-center gap-4 w-full lg:w-auto">
          <div className="bg-slate-50 p-2 border border-slate-100 rounded-2xl w-full xl:w-auto min-w-[320px]">
            <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-1">評鑑週期切換</label>
            <select 
              value={selectedNomination?.id || ''}
              onChange={(e) => setSelectedNomination(myNominations.find(n => n.id === e.target.value) || null)}
              className="w-full bg-transparent border-none font-bold text-slate-800 outline-none px-3 cursor-pointer text-sm"
            >
              {myNominations.length > 0 ? (
                myNominations.map(n => <option key={n.id} value={n.id}>{n.title}</option>)
              ) : <option value="">尚無歷史報告</option>}
            </select>
          </div>

          <div className="flex gap-2 w-full xl:w-auto justify-center flex-shrink-0">
            <button 
              onClick={downloadMarkdown}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all shadow-sm group"
              title="下載 Markdown"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>MD 存檔</span>
            </button>
            <button 
              onClick={handlePrint}
              className="flex-1 xl:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-800 transition-all shadow-xl group border border-slate-800 whitespace-nowrap"
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
      <div className="hidden print:block text-center border-b-2 border-slate-900 pb-8 mb-12">
        <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">360 成長評鑑個人報告</h1>
        <div className="mt-4 flex justify-center gap-12 font-bold text-slate-600">
           <p>受評對象：{targetUser.name}</p>
           <p>評鑑週期：{selectedNomination?.title}</p>
           <p>生成日期：{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* 數據看板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-2xl flex flex-col items-center">
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

        <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden flex flex-col">
          <div className="relative z-10 flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Gemini AI 成長導師</h2>
              <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-1">基於 {selectedNomination?.analysisFeedbackCount || 0} 份回饋分析</p>
            </div>
            <button onClick={handleRunAI} disabled={isAnalyzing} className="px-6 py-2 bg-indigo-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-indigo-500 disabled:opacity-50 transition-all">
              {isAnalyzing ? '分析中...' : '生成 AI 洞察'}
            </button>
          </div>
          <div className="relative z-10 flex-1 overflow-y-auto pr-2 scrollbar-hide">
            {selectedNomination?.aiAnalysis ? (
              <div className="space-y-6 animate-in fade-in duration-700">
                <div className="p-6 bg-white/5 border border-white/10 rounded-3xl italic text-sm text-indigo-100 leading-relaxed">
                  「 {selectedNomination.aiAnalysis.summary} 」
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-3">
                    <p className="font-black text-emerald-400 uppercase tracking-widest">顯性優勢 (Strengths)</p>
                    {selectedNomination.aiAnalysis.strengths.map((s, i) => <div key={i} className="flex gap-2"><span>•</span>{s}</div>)}
                  </div>
                  <div className="space-y-3">
                    <p className="font-black text-amber-400 uppercase tracking-widest">待解盲點 (Growth Areas)</p>
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

      {/* 原始數據細節 */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="p-10 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">原始數據細項</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Raw Feedback Metrics & Details</p>
          </div>
          <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest">
            <span className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">自評標章</span>
            <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">他評標章</span>
          </div>
        </div>

        <div className="p-10 space-y-24">
          {currentQuestionnaire?.dimensions.map((dim, dIdx) => {
            const dimMetric = dimensionMetrics.find(m => m.subject === dim.name);
            return (
              <div key={dim.id} className="space-y-12 animate-in slide-in-from-bottom-4 break-inside-avoid">
                {/* 維度標題與摘要對照 */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg">{dIdx + 1}</div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{dim.name}</h3>
                      <p className="text-xs text-slate-400 font-bold italic mt-1">{dim.purpose}</p>
                    </div>
                  </div>
                  
                  {/* 【新增】：維度總平均摘要列 */}
                  <div className="flex gap-4">
                    <div className="px-6 py-3 bg-indigo-50/80 rounded-2xl border border-indigo-100 text-center min-w-[120px]">
                      <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">維度自評平均</p>
                      <p className="text-2xl font-black text-indigo-700">{dimMetric?.self || '--'}</p>
                    </div>
                    <div className="px-6 py-3 bg-emerald-50/80 rounded-2xl border border-emerald-100 text-center min-w-[120px]">
                      <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-1">維度他評平均</p>
                      <p className="text-2xl font-black text-emerald-700">{dimMetric?.peer || '--'}</p>
                    </div>
                  </div>
                </div>

                {/* 維度下的題目清單 */}
                <div className="space-y-16 pl-4">
                  {dim.questions.map((q, qIdx) => {
                    // 他評分數：計算時過濾 1 分
                    const peerResponsesForCalc = currentFeedbacks.filter(f => f.fromUserId !== user.id).flatMap(f => f.responses).filter(r => r.questionId === q.id && r.score && r.score > 1);
                    // 為了列出所有標籤，仍抓取包含 1 分的所有回覆
                    const allPeerResponsesForDisplay = currentFeedbacks.filter(f => f.fromUserId !== user.id).flatMap(f => f.responses).filter(r => r.questionId === q.id && r.score);
                    
                    const selfResponse = currentFeedbacks.filter(f => f.fromUserId === user.id).flatMap(f => f.responses).find(r => r.questionId === q.id);
                    
                    const peerAvg = peerResponsesForCalc.length > 0 ? (peerResponsesForCalc.reduce((a, c) => a + (c.score || 0), 0) / peerResponsesForCalc.length).toFixed(1) : '--';

                    return (
                      <div key={q.id} className="space-y-8">
                        <div className="flex items-start gap-3">
                          <span className="text-slate-300 font-black text-xs pt-1">{dIdx + 1}.{qIdx + 1}</span>
                          <h4 className="text-lg font-black text-slate-800 leading-snug">{q.text}</h4>
                        </div>

                        {q.type === 'rating' ? (
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pl-8">
                            <div className="md:col-span-3 space-y-8">
                              {/* 他評標章區 */}
                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 同事評分 (不計 1 分於平均)
                                </label>
                                <div className="flex flex-wrap gap-3">
                                  {allPeerResponsesForDisplay.map((res, i) => (
                                    <ScoreBadge key={i} score={res.score!} />
                                  ))}
                                  {allPeerResponsesForDisplay.length === 0 && <span className="text-xs text-slate-300 italic">尚無回饋</span>}
                                </div>
                              </div>

                              {/* 自評標章區：【樣式統一】 */}
                              <div className="space-y-3">
                                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span> 您的自評
                                </label>
                                <div className="flex">
                                  {selfResponse?.score ? (
                                    <ScoreBadge score={selfResponse.score} isSelf />
                                  ) : <span className="text-xs text-slate-300 italic">未填寫自評</span>}
                                </div>
                              </div>
                            </div>

                            {/* 問題級別對照卡片 */}
                            <div className="md:col-span-1 bg-slate-50/80 rounded-[2.5rem] p-6 flex flex-col justify-center gap-5 border border-slate-100 shadow-inner">
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span>本題他評平均</span>
                                <span className="text-lg text-emerald-600 font-black">{peerAvg}</span>
                              </div>
                              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <span>本題自評分值</span>
                                <span className="text-lg text-indigo-600 font-black">{selfResponse?.score || '--'}</span>
                              </div>
                              <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex">
                                <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${(selfResponse?.score || 0) * 20}%` }}></div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-6 pl-8">
                            {/* 自評文字區隔 */}
                            {selfResponse?.answerText && (
                              <div className="p-8 bg-indigo-50/50 border border-indigo-100 rounded-[2.5rem] space-y-3 shadow-sm">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> 您的自評觀點
                                </p>
                                <p className="text-sm font-bold text-indigo-900 leading-relaxed italic">"{selfResponse.answerText}"</p>
                              </div>
                            )}
                            {/* 他評文字回饋 */}
                            <div className="space-y-4">
                              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 px-2">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> 同事具體觀察描述
                              </p>
                              <div className="grid grid-cols-1 gap-4">
                                {currentFeedbacks
                                  .filter(f => f.fromUserId !== user.id)
                                  .flatMap(f => f.responses.filter(r => r.questionId === q.id && r.answerText))
                                  .map((res, i) => (
                                    <div key={i} className="p-7 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm italic text-sm text-slate-700 leading-relaxed hover:border-indigo-100 transition-all">
                                      "{res.answerText}"
                                    </div>
                                  ))}
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
