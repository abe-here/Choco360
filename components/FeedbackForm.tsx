
import React, { useState, useEffect } from 'react';
import { User, Questionnaire, FeedbackEntry, FeedbackResponse, Nomination } from '../types';
import { api } from '../services/api';

interface FeedbackFormProps {
  users: User[];
  currentUser: User;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ users, currentUser }) => {
  const [tasks, setTasks] = useState<Nomination[]>([]);
  const [selectedTask, setSelectedTask] = useState<Nomination | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedQ, setSelectedQ] = useState<Questionnaire | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, { score?: number, text?: string }>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      const pendingTasks = await api.getNominationTasks(currentUser.id);
      setTasks(pendingTasks);
    } catch (err) {
      console.error("Failed to load tasks", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTask = async (task: Nomination) => {
    const targetUser = users.find(u => u.id === task.requesterId || u.email === task.requesterId);
    const qs = await api.getQuestionnaires();
    const targetQ = qs.find(q => q.id === task.questionnaireId);
    
    if (targetUser && targetQ) {
      setSelectedTask(task);
      setSelectedUser(targetUser);
      setSelectedQ(targetQ);
      setAnswers({});
    } else {
      alert("找不到對應的問卷或員工資料");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQ || !selectedUser || !selectedTask) return;

    const allRatingQuestions = selectedQ.dimensions.flatMap(d => d.questions.filter(q => q.type === 'rating'));
    const incomplete = allRatingQuestions.some(q => !answers[q.id]?.score);
    if (incomplete) {
      alert("請完成所有量分題的評比後再送出。");
      return;
    }

    setIsSubmitting(true);
    try {
      const responses: FeedbackResponse[] = [];
      selectedQ.dimensions.forEach(dim => {
        dim.questions.forEach(q => {
          const ans = answers[q.id];
          if (ans) {
            responses.push({
              questionId: q.id,
              score: ans.score,
              answerText: ans.text,
              dimensionName: dim.name
            });
          }
        });
      });

      await api.submitFeedback({
        id: '', 
        fromUserId: currentUser.id, 
        toUserId: selectedUser.id,
        questionnaireId: selectedQ.id, 
        nominationId: selectedTask.id, // 關鍵：建立與評鑑週期的強關聯
        responses,
        stopComments: '',
        startComments: '',
        continueComments: '',
        timestamp: new Date().toISOString()
      });

      setSubmitted(true);
      await loadTasks();
    } catch (err) {
      console.error(err);
      alert("提交失敗，請檢查網路連線");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white p-12 rounded-[3rem] border border-slate-200 text-center animate-in zoom-in-95 shadow-xl">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-3xl font-black text-slate-900">反饋提交成功！</h2>
        <p className="text-slate-500 mt-3 text-lg">您的回饋將協助同事（或是您自己）持續優化與成長。</p>
        <button onClick={() => { setSubmitted(false); setSelectedTask(null); }} className="mt-10 px-8 py-3 bg-slate-900 text-white font-black rounded-2xl">返回任務清單</button>
      </div>
    );
  }

  if (!selectedTask) {
    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <header>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">填寫反饋</h1>
          <p className="text-slate-500 mt-2 text-lg">以下是受邀請您提供的評鑑任務。您的見解非常寶貴。</p>
        </header>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">獲取任務清單中...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <p className="text-slate-400 font-black">目前沒有待處理的反饋任務。</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tasks.map((task) => {
              const requester = users.find(u => u.id === task.requesterId || u.email === task.requesterId);
              const isSelf = task.requesterId === currentUser.id;
              return (
                <button
                  key={task.id}
                  onClick={() => handleStartTask(task)}
                  className={`bg-white p-8 rounded-[2.5rem] border shadow-xl hover:shadow-2xl transition-all text-left flex flex-col justify-between group ${isSelf ? 'border-indigo-600' : 'border-slate-200'}`}
                >
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                         <img src={requester?.avatar} className="w-14 h-14 rounded-2xl shadow-sm group-hover:scale-105 transition-transform" alt="" />
                         {isSelf && <div className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-lg flex items-center justify-center text-[8px] font-black border-2 border-white">MY</div>}
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">受評人</p>
                        <p className="text-lg font-black text-slate-900">{isSelf ? '您自己 (自我評鑑)' : requester?.name || task.requesterId}</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-indigo-600 mb-1">{task.title}</h3>
                      <p className="text-xs text-slate-400 font-medium">針對該員工進行 360 度專業行為與文化評核。</p>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">截止日期</p>
                      <p className="text-xs font-bold text-rose-500">
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '未設定'}
                      </p>
                    </div>
                    <span className={`px-5 py-2.5 text-white text-[10px] font-black rounded-xl uppercase tracking-widest transition-colors ${isSelf ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-indigo-600'}`}>
                      開始填寫
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="mb-10 space-y-8">
        <button onClick={() => setSelectedTask(null)} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 text-xs font-black uppercase tracking-widest">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          返回任務清單
        </button>

        <div className="flex items-center gap-6">
          <img src={selectedUser?.avatar} className="w-20 h-20 rounded-[2rem] shadow-xl border-4 border-white" alt="" />
          <div className="flex-1">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
              {selectedUser?.id === currentUser.id ? '自我評鑑問卷' : '反饋問卷填寫'}
            </h1>
            <p className="text-slate-500 text-xl mt-3">
              {selectedUser?.id === currentUser.id ? '請誠實審視自己過去一段時間的表現' : (
                <>正在為 <span className="font-bold text-indigo-600">{selectedUser?.name}</span> 提供反饋</>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
        <form onSubmit={handleSubmit} className="p-10 space-y-24">
          {selectedQ.dimensions.map(dim => (
            <div key={dim.id} className="space-y-10">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-2 bg-indigo-600 rounded-full"></div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{dim.name}</h2>
                </div>
                <p className="text-slate-500 text-base font-bold pl-6 italic leading-relaxed">{dim.purpose}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-14">
                {dim.questions.map((q, qIdx) => (
                  <div key={q.id} className="space-y-6">
                    <div className="flex items-start gap-5">
                      <span className="flex-shrink-0 w-9 h-9 bg-slate-200 text-slate-700 border border-slate-300 rounded-xl flex items-center justify-center text-sm font-black shadow-sm">{qIdx + 1}</span>
                      <p className="text-xl font-bold text-slate-800 leading-snug pt-0.5">{q.text}</p>
                    </div>
                    
                    <div className="pl-14">
                      {q.type === 'rating' ? (
                        <div className="flex flex-wrap gap-3">
                          {[5, 4, 3, 2, 1].map(val => (
                            <button 
                              key={val} 
                              type="button" 
                              onClick={() => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], score: val } }))} 
                              className={`px-7 py-4 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${
                                answers[q.id]?.score === val 
                                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100 -translate-y-1' 
                                  : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                              }`}
                            >
                              {val === 5 ? '總是如此 (5)' : val === 4 ? '經常如此 (4)' : val === 3 ? '偶爾如此 (3)' : val === 2 ? '很少如此 (2)' : '不清楚 (1)'}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <textarea 
                          rows={4} 
                          value={answers[q.id]?.text || ''} 
                          onChange={e => setAnswers(p => ({ ...p, [q.id]: { ...p[q.id], text: e.target.value } }))}
                          placeholder={selectedUser?.id === currentUser.id ? "請記錄具體事例以佐證您的評比..." : "請輸入具體觀察、實例描述或改進建議..."}
                          className="w-full rounded-[2rem] border-slate-200 bg-slate-50/50 p-7 text-slate-900 font-medium outline-none focus:ring-4 focus:ring-indigo-100 focus:bg-white focus:border-indigo-600 transition-all shadow-inner"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-12 border-t border-slate-100">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="px-16 py-7 bg-slate-900 text-white font-black rounded-[2rem] shadow-2xl hover:bg-indigo-600 hover:-translate-y-1 transition-all disabled:opacity-30 flex items-center gap-4"
            >
              {isSubmitting ? '正在提交反饋...' : '完成填寫並送出'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;
