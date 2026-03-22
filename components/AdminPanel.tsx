
import React, { useState, useMemo, useEffect } from 'react';
import { User, Questionnaire, Nomination, FeedbackEntry, QuestionType, NotificationLog } from '../types';
import { api } from '../services/api';
import { slackService } from '../services/slackService';

interface AdminPanelProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  questionnaires: Questionnaire[];
  setQuestionnaires: React.Dispatch<React.SetStateAction<Questionnaire[]>>;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '剛剛';
  if (diffMin < 60) return `${diffMin} 分鐘前`;
  if (diffHour < 24) return `${diffHour} 小時前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return date.toLocaleDateString();
}

function parseNotificationGroup(text: string): string {
  const cleanStr = text.replace(/^\[重新發送失敗\] /, '').replace(/^\[重新發送\] /, '').trim();
  let match;
  
  if ((match = cleanStr.match(/提醒核准 (.+) 的 (.+)/))) {
    return `${match[1]} - ${match[2]}`;
  }
  if ((match = cleanStr.match(/通知 (.+) 的新評量任務: (.+)/))) {
    return `${match[1]} - ${match[2]}`;
  }
  if ((match = cleanStr.match(/通知收到新回饋: (.+)/))) {
    return match[1];
  }
  if ((match = cleanStr.match(/提醒完成 \d+ 項評量任務: (.+)/))) {
    return match[1];
  }
  if ((match = cleanStr.match(/提醒核准 (.+)/))) {
    return match[1];
  }
  if (cleanStr.includes('項評量任務')) {
    return '批次綜合評量提醒'; 
  }
  return '未分類系統通知';
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, setUsers, questionnaires, setQuestionnaires }) => {
  const [activeSubTab, setActiveSubTab] = useState<'activity' | 'users' | 'forms' | 'system' | 'notifications'>('activity');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  
  // --- 活動監控狀態 (Nominations) ---
  const [allNominations, setAllNominations] = useState<Nomination[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<FeedbackEntry[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  
  const [isManageDrawerOpen, setIsManageDrawerOpen] = useState(false);
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [isAddingInDrawer, setIsAddingInDrawer] = useState(false);
  const [drawerSearchSearch, setDrawerSearchSearch] = useState('');
  
  // 刪除確認側邊欄狀態
  const [isDeleteDrawerOpen, setIsDeleteDrawerOpen] = useState(false);
  const [nominationToDelete, setNominationToDelete] = useState<Nomination | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeletingProcess, setIsDeletingProcess] = useState(false);

  // --- 員工管理狀態 (Users) ---
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; email?: string; managerEmail?: string }>({});
  const [userDeleteConfirmStep, setUserDeleteConfirmStep] = useState(0); 

  // --- 問卷設計狀態 (Forms) ---
  const [isFormPanelOpen, setIsFormPanelOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Partial<Questionnaire> | null>(null);
  const [isSavingForm, setIsSavingForm] = useState(false);

  // --- 系統資訊狀態 ---
  const [versionData, setVersionData] = useState<string>('');

  // --- 通知管理狀態 ---
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isSendingBatch, setIsSendingBatch] = useState(false);
  const [sendingTarget, setSendingTarget] = useState<string | null>(null);
  const [expandedLogGroups, setExpandedLogGroups] = useState<Set<string>>(new Set());

  // --- 常數定義 ---
  const DEPARTMENTS = ['Product', 'Data', 'Marketing', 'Content', 'HR/ADM', 'AVOD', 'Finance'];
  const ROLES = ['PM', 'Designer', 'Developer', 'QA', 'IT', 'DA/DE', 'CS', 'Content', 'HR/ADM', 'AVOD', 'Marketing', 'Finance'];
  
  const MANAGERS = useMemo(() => {
    return users.filter(u => u.isManager || u.isSystemAdmin).sort((a, b) => a.name.localeCompare(b.name));
  }, [users]);

  const groupedLogs = useMemo(() => {
    const groups: Record<string, NotificationLog[]> = {};
    notificationLogs.forEach(log => {
      const groupName = parseNotificationGroup(log.messageText);
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(log);
    });
    
    return Object.keys(groups).map(name => {
      const logs = groups[name].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return {
        id: name,
        title: name,
        latestTime: new Date(logs[0].createdAt || 0),
        logs
      };
    }).sort((a, b) => b.latestTime.getTime() - a.latestTime.getTime());
  }, [notificationLogs]);

  const toggleLogGroup = (groupId: string) => {
    setExpandedLogGroups(prev => {
       const next = new Set(prev);
       if (next.has(groupId)) next.delete(groupId);
       else next.add(groupId);
       return next;
    });
  };

  useEffect(() => {
    fetchActivityData();
    fetchVersionData();
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const logs = await api.getNotificationLogs();
      setNotificationLogs(logs || []);
    } catch {
      // 忽略錯誤
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSendBatchReminders = async () => {
    if (!window.confirm("確定要手動觸發全局的批次通知催繳嗎？這將會掃描所有未完成的任務並發送提醒。")) return;
    setIsSendingBatch(true);
    try {
      const res = await api.sendBatchReminders();
      alert(`✅ 批次發送完成！\n成功: ${res.sent} 筆\n失敗: ${res.failed} 筆`);
      await fetchLogs();
    } catch (e: any) {
      alert(`批次發送失敗: ${e.message}`);
    } finally {
      setIsSendingBatch(false);
    }
  };

  const handleSendSingleReminder = async (nom: any) => {
    if (!window.confirm(`確定要針對「${nom.title}」發送催繳通知嗎？這會提醒所有尚未填寫的人。`)) return;
    setSendingTarget(nom.id);
    try {
      const res = await api.sendReminderForNomination(nom.id);
      alert(`✅ 單一表單催繳發送完成！\n成功: ${res.sent} 筆\n失敗: ${res.failed} 筆`);
      await fetchLogs();
    } catch (e: any) {
      alert(`發送失敗: ${e.message}`);
    } finally {
      setSendingTarget(null);
    }
  };

  const handleClearLogs = async () => {
    if (!window.confirm("確定要清空所有發送紀錄嗎？此操作不可復原。")) return;
    try {
      await api.clearNotificationLogs();
      setNotificationLogs([]);
      alert('已清空歷史紀錄。');
    } catch (e: any) {
      alert(`清空失敗: ${e.message}`);
    }
  };

  const resendLog = async (log: NotificationLog) => {
    try {
       // Just reuse the api logic to send based on log content
       // We can simply call slackService with basic payload
       await slackService.sendDirectMessageByEmail(log.recipientEmail, { text: `[重新發送] ${log.messageText}` });
       await api.logNotification({ ...log, status: 'sent', messageText: `[重新發送] ${log.messageText}`, createdAt: undefined, id: undefined });
       alert('重新發送成功！');
       fetchLogs();
    } catch (e: any) {
       await api.logNotification({ ...log, status: 'failed', errorMessage: e.message, messageText: `[重新發送失敗] ${log.messageText}`, createdAt: undefined, id: undefined });
       alert(`重新發送失敗: ${e.message}`);
       fetchLogs();
    }
  };

  const sendManualNotification = async (type: string, email: string, requesterName: string, title: string) => {
    try {
      if (type === 'manager_approval') {
        await slackService.notifyManagerOfNomination(email, requesterName, title);
        await api.logNotification({ recipientEmail: email, notificationType: '手動推播 - 主管核准要求', messageText: `提醒核准 ${requesterName} 的 ${title}`, status: 'sent' });
      } else if (type === 'reviewer_task') {
        await slackService.notifyReviewerOfPendingTasks(email, 1, [{ requesterName, title }]);
        await api.logNotification({ recipientEmail: email, notificationType: '手動推播 - 評量任務提醒', messageText: `提醒完成 1 項評量任務: ${title}`, status: 'sent' });
      }
      alert('已成功發送 Slack 通知！');
      fetchLogs();
    } catch (e: any) {
      alert(`發送失敗: ${e.message}`);
      await api.logNotification({ recipientEmail: email, notificationType: type === 'manager_approval' ? '手動推播 - 主管核准要求' : '手動推播 - 評量任務提醒', messageText: `提醒 ${title}`, status: 'failed', errorMessage: e.message });
      fetchLogs();
    }
  };

  const fetchVersionData = async () => {
    try {
      // VERSION.md is in the project root, but fetch works from the public/dev server root.
      // We'll try fetching it directly, or fallback to a hardcoded version if needed.
      const resp = await fetch('/VERSION.md');
      if (resp.ok) {
        const text = await resp.text();
        setVersionData(text);
      }
    } catch (e) {
      console.error("Failed to fetch version data", e);
    }
  };

  const fetchActivityData = async () => {
    setIsLoadingActivity(true);
    try {
      const [noms, fbs] = await Promise.all([
        api.getAllNominations(),
        api.getAllFeedbacks()
      ]);
      setAllNominations(noms || []);
      setAllFeedbacks(fbs || []);
    } catch (err) {
      console.error("Failed to fetch activity data", err);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           u.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = selectedDept === 'All' || u.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [users, searchTerm, selectedDept]);

  const nominationStats = useMemo(() => {
    return allNominations.map(nom => {
      // 關鍵修正：使用 nominationId 進行過濾，而非 questionnaireId
      // 這確保了統計數據精確對應到該次評鑑週期
      const responses = allFeedbacks.filter(f => f.nominationId === nom.id);
      const totalExpected = (nom.reviewerIds?.length || 0) + 1; 
      const respondedCount = responses.length;
      
      let statusLabel = '待審核';
      let statusColor = 'bg-amber-100 text-amber-700';
      
      if (nom.status === 'Approved') {
        if (respondedCount >= totalExpected) {
          statusLabel = '已完成';
          statusColor = 'bg-emerald-100 text-emerald-700';
        } else {
          statusLabel = '進行中';
          statusColor = 'bg-indigo-100 text-indigo-700';
        }
      } else if (nom.status === 'Rejected') {
        statusLabel = '已駁回';
        statusColor = 'bg-rose-100 text-rose-700';
      }

      return { ...nom, respondedCount, totalExpected, statusLabel, statusColor };
    });
  }, [allNominations, allFeedbacks]);

  const executeDeleteNomination = async () => {
    if (!nominationToDelete) return;
    setIsDeletingProcess(true);
    try {
      await api.deleteNomination(nominationToDelete.id);
      setAllNominations(prev => prev.filter(n => n.id !== nominationToDelete.id));
      setIsDeleteDrawerOpen(false);
      setNominationToDelete(null);
    } catch (err) {
      alert("刪除失敗。");
    } finally {
      setIsDeletingProcess(false);
    }
  };

  const handleUpdateReviewers = async (newIds: string[]) => {
    if (!selectedNomination) return;
    setIsSyncing(true);
    try {
      await api.updateNomination(selectedNomination.id, { reviewerIds: newIds });
      const updatedNoms = allNominations.map(n => n.id === selectedNomination.id ? { ...n, reviewerIds: newIds } : n);
      setAllNominations(updatedNoms);
      setSelectedNomination({ ...selectedNomination, reviewerIds: newIds });
    } catch (err) {
      alert("更新名單失敗");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateManager = async (managerEmail: string) => {
    if (!selectedNomination) return;
    setIsSyncing(true);
    try {
      await api.updateNomination(selectedNomination.id, { managerId: managerEmail });
      const updatedNoms = allNominations.map(n => n.id === selectedNomination.id ? { ...n, managerId: managerEmail } : n);
      setAllNominations(updatedNoms);
      setSelectedNomination({ ...selectedNomination, managerId: managerEmail });
    } catch (err) {
      alert("更新審核主管失敗");
    } finally {
      setIsSyncing(false);
    }
  };

  const openUserEditor = (user?: User) => {
    setFieldErrors({});
    setUserDeleteConfirmStep(0);
    if (user) {
      setEditingUser({ ...user });
    } else {
      setEditingUser({
        name: '', 
        email: '', 
        role: ROLES[0], 
        department: DEPARTMENTS[0],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
        isSystemAdmin: false, 
        isManager: false, 
        managerEmail: MANAGERS[0]?.email || ''
      });
    }
    setIsUserDrawerOpen(true);
  };

  const handleUserSubmit = async () => {
    if (!editingUser) return;
    const errors: any = {};
    if (!editingUser.name?.trim()) errors.name = '請輸入姓名';
    if (!editingUser.email?.trim()) errors.email = '請輸入信箱';
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setIsSavingUser(true);
    try {
      const savedUser = await api.updateUser(editingUser);
      if (editingUser.id) {
        setUsers(prev => prev.map(u => u.id === savedUser.id ? savedUser : u));
      } else {
        setUsers(prev => [...prev, savedUser]);
      }
      setIsUserDrawerOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`儲存員工失敗: ${err.message || '請確認網路連線'}`);
    } finally { 
      setIsSavingUser(false); 
    }
  };

  const processDeleteUser = async () => {
    if (!editingUser?.id) return;
    setIsSavingUser(true);
    try {
      await api.deleteUser(editingUser.id);
      setUsers(prev => prev.filter(u => u.id !== editingUser.id));
      setIsUserDrawerOpen(false);
    } catch (err) {
      alert("刪除員工失敗");
    } finally { setIsSavingUser(false); }
  };

  const renderActivityMonitoring = () => (
    <div className="space-y-6">
      <div className="px-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
            全域活動儀表板
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">監控所有進行中的評鑑週期</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleSendBatchReminders} 
            disabled={isSendingBatch}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
          >
            {isSendingBatch ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
            發送待處理統整提醒
          </button>
          <button 
            onClick={fetchActivityData} 
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-600 transition-all shadow-sm"
          >
            <svg className={`w-3.5 h-3.5 ${isLoadingActivity ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            重新整理數據
          </button>
        </div>
      </div>
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">受評人 / 標題</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">狀態</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">填寫進度</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingActivity ? (
                <tr>
                   <td colSpan={4} className="py-20 text-center">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">載入監控數據中...</p>
                   </td>
                </tr>
              ) : nominationStats.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-32 text-center text-slate-300">
                    <p className="font-bold italic">目前無任何進行中的評鑑邀請</p>
                  </td>
                </tr>
              ) : nominationStats.map((nom) => {
                const requester = users.find(u => u.id === nom.requesterId || u.email === nom.requesterId);
                const progressPercent = (nom.respondedCount / nom.totalExpected) * 100;
                return (
                  <tr key={nom.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={requester?.avatar} className="w-10 h-10 rounded-xl bg-slate-100 shadow-sm" alt="" />
                        <div>
                          <p className="font-black text-slate-900 leading-none mb-1.5">{requester?.name || '未知人員'}</p>
                          <p className="text-[10px] text-indigo-600 font-black uppercase tracking-wider truncate max-w-[200px]">{nom.title}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${nom.statusColor}`}>
                        {nom.statusLabel}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-full max-w-[140px] space-y-2">
                        <div className="flex justify-between items-center text-[9px] font-black">
                           <span className="text-slate-400">{nom.respondedCount} / {nom.totalExpected}</span>
                           <span className="text-indigo-600">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {nom.status === 'Approved' && nom.respondedCount < nom.totalExpected && (
                          <button 
                            disabled={sendingTarget === nom.id}
                            onClick={() => handleSendSingleReminder(nom)} 
                            className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm disabled:opacity-50" 
                            title="催促此表單未完成者"
                          >
                            {sendingTarget === nom.id ? <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin block"></span> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>}
                          </button>
                        )}
                        <button onClick={() => { setSelectedNomination(nom); setIsManageDrawerOpen(true); }} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm" title="調整名單與移轉主管"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg></button>
                        <button onClick={() => { setNominationToDelete(nom); setIsDeleteDrawerOpen(true); }} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm" title="刪除問卷"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center px-4">
        <div className="relative w-full md:w-96">
          <input type="text" placeholder="搜尋姓名或信箱..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm" />
          <svg className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <button onClick={() => openUserEditor()} className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center justify-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          新增員工
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4 animate-in slide-in-from-left duration-500">
        {['All', ...DEPARTMENTS].map(dept => (
          <button
            key={dept}
            onClick={() => setSelectedDept(dept)}
            className={`px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all shadow-sm active:scale-95 ${
              selectedDept === dept 
                ? 'bg-indigo-600 text-white shadow-indigo-100 -translate-y-0.5' 
                : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            {dept === 'All' ? '全部門' : dept}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
        {filteredUsers.length === 0 ? (
          <div className="p-24 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">找不到符合條件的員工</p>
            <button onClick={() => { setSearchTerm(''); setSelectedDept('All'); }} className="mt-4 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:underline">清除過濾條件</button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">員工</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">角色 / 部門</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">直屬主管</th>
                <th className="px-8 py-5 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <img src={user.avatar} className="w-10 h-10 rounded-xl bg-slate-100 shadow-sm transition-transform group-hover:scale-105" alt="" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-slate-900">{user.name}</p>
                          {user.isSystemAdmin && (
                            <span className="px-2 py-0.5 bg-indigo-900 text-white text-[9px] font-black rounded-md uppercase tracking-wider shadow-sm">系統管理員</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-700 text-sm">{user.role}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{user.department}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-slate-700 text-sm">
                      {users.find(u => u.email === user.managerEmail)?.name || user.managerEmail || '--'}
                    </p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button onClick={() => openUserEditor(user)} className="px-6 py-2.5 bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">詳情與編輯</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  const renderFormManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4 px-4">
        <div>
           <h2 className="text-2xl font-black text-slate-900">問卷版本庫</h2>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">管理各類職位的測評架構</p>
        </div>
        <button onClick={() => {
          setEditingForm({ title: '', description: '', active: true, dimensions: [{ id: `d_${Date.now()}`, name: '新維度', purpose: '', questions: [{ id: `q_${Date.now()}`, text: '', type: 'rating' as QuestionType }] }] });
          setIsFormPanelOpen(true);
        }} className="px-6 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
          建立新問卷
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {questionnaires.map((q) => (
          <div key={q.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl relative overflow-hidden group hover:border-indigo-200 transition-all">
            <div className="absolute top-0 right-0 p-6">
              <button 
                onClick={async () => {
                  const updated = { ...q, active: !q.active };
                  await api.upsertQuestionnaire(updated);
                  const freshQs = await api.getQuestionnaires();
                  setQuestionnaires(freshQs);
                }}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${q.active ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-600 hover:text-white'}`}
              >
                {q.active ? '使用中' : '已停用'}
              </button>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{q.title}</h3>
              <p className="text-sm text-slate-500 font-medium mt-1 line-clamp-2">{q.description || '暫無描述'}</p>
              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex gap-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{q.dimensions?.length || 0} 個維度</p>
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">v{new Date(q.createdAt || '').toLocaleDateString()}</p>
                </div>
                <button onClick={() => { setEditingForm(q); setIsFormPanelOpen(true); }} className="text-indigo-600 font-black text-sm hover:underline text-sm uppercase tracking-widest">編輯問卷</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderUserEditor = () => {
    if (!isUserDrawerOpen || !editingUser) return null;
    const SelectWrapper = ({ label, value, onChange, options, error }: any) => (
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
        <div className="relative">
          <select value={value} onChange={e => onChange(e.target.value)} className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold text-slate-900 outline-none appearance-none transition-all ${error ? 'border-rose-300' : 'border-slate-200 hover:border-indigo-300'}`}>
            {options.map((opt: any) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <svg className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </div>
        {error && <p className="text-[10px] text-rose-500 font-bold ml-1">{error}</p>}
      </div>
    );
    return (
      <>
        <div onClick={() => setIsUserDrawerOpen(false)} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-in fade-in" />
        <div className="fixed top-0 right-0 z-[101] h-full w-full max-w-md bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div><h2 className="text-2xl font-black text-slate-900">{editingUser.id ? '編輯員工資料' : '新增員工'}</h2></div>
            <button onClick={() => setIsUserDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
            <div className="flex justify-center pb-4"><img src={editingUser.avatar} className="w-24 h-24 rounded-[2rem] shadow-xl bg-slate-100 border-4 border-white shadow-slate-200/50" alt="" /></div>
            <div className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">顯示姓名</label><input value={editingUser.name || ''} onChange={e => setEditingUser(p => ({ ...p!, name: e.target.value }))} className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all ${fieldErrors.name ? 'border-rose-300' : 'border-slate-200'}`} /></div>
              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">公司信箱</label><input disabled={!!editingUser.id} value={editingUser.email || ''} onChange={e => setEditingUser(p => ({ ...p!, email: e.target.value }))} className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl font-bold text-slate-900 outline-none ${editingUser.id ? 'opacity-50' : ''}`} /></div>
              <div className="grid grid-cols-2 gap-4">
                <SelectWrapper label="職位角色" value={editingUser.role} onChange={(v: string) => setEditingUser(p => ({ ...p!, role: v }))} options={ROLES.map(r => ({ label: r, value: r }))} />
                <SelectWrapper label="所屬部門" value={editingUser.department} onChange={(v: string) => setEditingUser(p => ({ ...p!, department: v }))} options={DEPARTMENTS.map(d => ({ label: d, value: d }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SelectWrapper label="系統權限" value={editingUser.isSystemAdmin ? 'admin' : 'user'} onChange={(v: string) => setEditingUser(p => ({ ...p!, isSystemAdmin: v === 'admin' }))} options={[{label: '一般使用者', value: 'user'}, {label: '系統管理員', value: 'admin'}]} />
                <SelectWrapper label="是否為主管" value={editingUser.isManager ? 'yes' : 'no'} onChange={(v: string) => setEditingUser(p => ({ ...p!, isManager: v === 'yes' }))} options={[{label: '否', value: 'no'}, {label: '是', value: 'yes'}]} />
              </div>
              <SelectWrapper label="直屬主管 (審核人)" value={editingUser.managerEmail || ''} onChange={(v: string) => setEditingUser(p => ({ ...p!, managerEmail: v }))} options={MANAGERS.map(m => ({ label: m.name, value: m.email }))} />
            </div>
            {editingUser.id && (
              <div className="pt-6 border-t border-slate-100">
                {userDeleteConfirmStep === 0 ? (
                  <button type="button" onClick={() => setUserDeleteConfirmStep(1)} className="w-full py-4 text-rose-500 font-bold text-sm hover:bg-rose-50 rounded-2xl transition-all">刪除此員工帳號</button>
                ) : (
                  <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 space-y-4 animate-in zoom-in-95">
                    <p className="text-xs font-bold text-rose-600 text-center">確定要永久刪除此帳號嗎？此操作不可復原。</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setUserDeleteConfirmStep(0)} className="flex-1 py-2 bg-white text-slate-600 font-bold text-xs rounded-xl border border-rose-200 shadow-sm transition-all hover:bg-slate-50">取消</button>
                      <button type="button" onClick={processDeleteUser} className="flex-1 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all hover:bg-rose-700">確認刪除</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-8 border-t bg-white flex gap-4 shadow-2xl shadow-slate-900/10">
            <button type="button" onClick={() => setIsUserDrawerOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">取消</button>
            <button type="button" onClick={handleUserSubmit} disabled={isSavingUser} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-xl disabled:opacity-50">{isSavingUser ? '正在儲存...' : '儲存資料'}</button>
          </div>
        </div>
      </>
    );
  };

  const renderFormEditor = () => {
    if (!isFormPanelOpen || !editingForm) return null;
    const handleFormSubmitInternal = async () => {
      if (!editingForm.title?.trim()) { alert("請輸入問卷標題"); return; }
      setIsSavingForm(true);
      try { 
        await api.upsertQuestionnaire(editingForm); 
        const freshQs = await api.getQuestionnaires();
        setQuestionnaires(freshQs); 
        setIsFormPanelOpen(false); 
      } catch (err: any) { 
        alert(`失敗: ${err.message}`); 
      } finally { 
        setIsSavingForm(false); 
      }
    };
    return (
      <>
        <div onClick={() => setIsFormPanelOpen(false)} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-in fade-in" />
        <div className="fixed top-0 right-0 z-[101] h-full w-full max-w-5xl bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white shadow-lg">
            <div>
              <h2 className="text-2xl font-black">{editingForm.id ? '編輯問卷架構' : '設計新問卷'}</h2>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mt-1">注意：修改問卷可能影響數據進度一致性</p>
            </div>
            <button onClick={() => setIsFormPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide bg-slate-50/30">
            <section className="space-y-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">問卷標題</label>
                <input 
                  value={editingForm.title || ''} 
                  onChange={e => setEditingForm(p => ({ ...p!, title: e.target.value }))} 
                  className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-lg" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">版本描述</label>
                <textarea 
                  rows={2} 
                  value={editingForm.description || ''} 
                  onChange={e => setEditingForm(p => ({ ...p!, description: e.target.value }))} 
                  className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all" 
                />
              </div>
            </section>
            <div className="space-y-8">
              {editingForm.dimensions?.map((dim, dIdx) => (
                <div key={dim.id || dIdx} className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden animate-in slide-in-from-bottom-2">
                  <div className="p-6 bg-slate-900 text-white flex justify-between items-center gap-4">
                    <input value={dim.name} onChange={e => {
                      setEditingForm(prev => {
                        if (!prev) return prev;
                        const newDims = [...(prev.dimensions || [])];
                        newDims[dIdx] = { ...dim, name: e.target.value };
                        return { ...prev, dimensions: newDims };
                      });
                    }} className="bg-transparent border-none font-black text-xl p-0 focus:ring-0 w-full text-white" />
                    <button type="button" onClick={() => {
                      setEditingForm(prev => {
                        if (!prev) return prev;
                        return { ...prev, dimensions: (prev.dimensions || []).filter((_, i) => i !== dIdx) };
                      });
                    }} className="text-white/40 hover:text-white transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" /></svg></button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">評鑑目的 (AI 分析關鍵)</label>
                      <input 
                        value={dim.purpose} 
                        onChange={e => {
                          setEditingForm(prev => {
                            if (!prev) return prev;
                            const newDims = [...(prev.dimensions || [])];
                            newDims[dIdx] = { ...dim, purpose: e.target.value };
                            return { ...prev, dimensions: newDims };
                          });
                        }} 
                        className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none shadow-inner" 
                      />
                    </div>
                    <div className="space-y-4">
                      {dim.questions.map((qu, qIdx) => (
                        <div key={qu.id || qIdx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm items-center">
                          <textarea 
                            rows={1} 
                            value={qu.text} 
                            onChange={e => {
                              setEditingForm(prev => {
                                if (!prev) return prev;
                                const newDims = [...(prev.dimensions || [])];
                                const newQuestions = [...newDims[dIdx].questions];
                                newQuestions[qIdx] = { ...qu, text: e.target.value };
                                newDims[dIdx] = { ...newDims[dIdx], questions: newQuestions };
                                return { ...prev, dimensions: newDims };
                              });
                            }} 
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 resize-none outline-none focus:border-indigo-300 transition-all" 
                          />
                          <select 
                            value={qu.type} 
                            onChange={e => {
                              setEditingForm(prev => {
                                if (!prev) return prev;
                                const newDims = [...(prev.dimensions || [])];
                                const newQuestions = [...newDims[dIdx].questions];
                                newQuestions[qIdx] = { ...qu, type: e.target.value as QuestionType };
                                newDims[dIdx] = { ...newDims[dIdx], questions: newQuestions };
                                return { ...prev, dimensions: newDims };
                              });
                            }} 
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-500 outline-none"
                          >
                            <option value="rating">量分</option>
                            <option value="text">簡答</option>
                          </select>
                          <button type="button" onClick={() => {
                            setEditingForm(prev => {
                              if (!prev) return prev;
                              const newDims = [...(prev.dimensions || [])];
                              const newQuestions = newDims[dIdx].questions.filter((_, idx) => idx !== qIdx);
                              newDims[dIdx] = { ...newDims[dIdx], questions: newQuestions };
                              return { ...prev, dimensions: newDims };
                            });
                          }} className="text-slate-300 hover:text-rose-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => {
                        setEditingForm(prev => {
                          if (!prev) return prev;
                          const newDims = [...(prev.dimensions || [])];
                          const newQuestions = [...newDims[dIdx].questions, { id: `q_${Date.now()}_${Math.random()}`, text: '', type: 'rating' as QuestionType }];
                          newDims[dIdx] = { ...newDims[dIdx], questions: newQuestions };
                          return { ...prev, dimensions: newDims };
                        });
                      }} className="text-xs font-black text-indigo-600 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>新增問項</button>
                    </div>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => setEditingForm(prev => {
                if (!prev) return prev;
                return { 
                  ...prev, 
                  dimensions: [...(prev.dimensions || []), { id: `d_${Date.now()}_${Math.random()}`, name: '', purpose: '', questions: [{ id: `q_${Date.now()}_${Math.random()}`, text: '', type: 'rating' as QuestionType }] }] 
                };
              })} className="w-full py-5 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black hover:border-indigo-300 hover:text-indigo-600 transition-all">+ 新增評鑑維度區塊</button>
            </div>
          </div>
          <div className="p-8 border-t bg-white flex gap-4 shadow-2xl shadow-slate-900/10">
            <button onClick={() => setIsFormPanelOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all">放棄修改</button>
            <button onClick={handleFormSubmitInternal} disabled={isSavingForm} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-600 transition-all disabled:opacity-50">{isSavingForm ? '正在發佈...' : '確認並發佈問卷'}</button>
          </div>
        </div>
      </>
    );
  };

  const renderManageDrawer = () => {
    if (!isManageDrawerOpen || !selectedNomination) return null;
    const currentReviewerIds = selectedNomination.reviewerIds || [];
    
    // 關鍵修正：這裡的 selfFinished 與 isFinished 也必須使用 nominationId 檢查
    const selfFinished = allFeedbacks.some(f => 
      f.fromUserId === selectedNomination.requesterId && 
      f.nominationId === selectedNomination.id
    );
    
    const availableUsersForAdding = users.filter(u => 
      u.id !== selectedNomination.requesterId && 
      !currentReviewerIds.includes(u.id) &&
      u.email !== selectedNomination.requesterId &&
      (u.name.toLowerCase().includes(drawerSearchSearch.toLowerCase()) || u.email.toLowerCase().includes(drawerSearchSearch.toLowerCase()))
    );

    return (
      <>
        <div onClick={() => { setIsManageDrawerOpen(false); setIsAddingInDrawer(false); }} className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md animate-in fade-in" />
        <div className="fixed top-0 right-0 z-[101] h-full w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-900">管理評鑑週期</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">行政干預與權限移轉</p>
            </div>
            <button onClick={() => { setIsManageDrawerOpen(false); setIsAddingInDrawer(false); }} className="p-2 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
             <div className="space-y-4 bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">移轉審核主管 (Approver)</label>
                  {isSyncing && <div className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>}
                </div>
                <div className="relative">
                  <select 
                    value={selectedNomination.managerId}
                    onChange={(e) => handleUpdateManager(e.target.value)}
                    disabled={isSyncing}
                    className="w-full px-5 py-4 bg-white border border-indigo-100 rounded-2xl font-bold text-slate-900 outline-none appearance-none transition-all focus:ring-4 focus:ring-indigo-100"
                  >
                    {MANAGERS.map(m => (
                      <option key={m.email} value={m.email}>{m.name} ({m.email})</option>
                    ))}
                  </select>
                  <svg className="w-4 h-4 absolute right-5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </div>
                <p className="text-[9px] font-bold text-indigo-400 italic px-1">變更後，此邀請函將移至新主管的審核清單中。</p>
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">受評人自評進度</label>
                <div className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm ${selfFinished ? 'bg-emerald-500' : 'bg-indigo-600'}`}>
                      {selfFinished ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                    </div>
                    <p className="text-sm font-black text-slate-900">自我評鑑問卷</p>
                  </div>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${selfFinished ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-indigo-400 border border-indigo-100'}`}>
                    {selfFinished ? '已繳卷' : '待填寫'}
                  </span>
                </div>
                {selectedNomination.status === 'Pending' && (
                  <button onClick={() => sendManualNotification('manager_approval', selectedNomination.managerId, users.find(u=>u.id===selectedNomination.requesterId)?.name || '同仁', selectedNomination.title)} className="w-full py-3 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-black text-xs hover:bg-amber-100 transition-all">
                    催促主管進行核准
                  </button>
                )}
             </div>

             <div className="space-y-4">
               <div className="flex justify-between items-end">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">受邀人繳卷狀態 ({currentReviewerIds.length})</label>
                 <button onClick={() => setIsAddingInDrawer(!isAddingInDrawer)} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:underline">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    從名單新增成員
                 </button>
               </div>
               
               {isAddingInDrawer && (
                 <div className="p-6 bg-slate-900 rounded-3xl space-y-4 animate-in slide-in-from-top-4">
                   <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">搜尋 profiles 員工名單</p>
                     <button onClick={() => setIsAddingInDrawer(false)} className="text-white/40 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                   </div>
                   <input type="text" placeholder="輸入姓名或信箱關鍵字..." value={drawerSearchSearch} onChange={e => setDrawerSearchSearch(e.target.value)} className="w-full px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-white font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                   <div className="max-h-48 overflow-y-auto space-y-2 scrollbar-hide">
                      {availableUsersForAdding.map(u => (
                        <button key={u.id} onClick={() => { handleUpdateReviewers([...currentReviewerIds, u.id]); setIsAddingInDrawer(false); }} className="w-full flex items-center gap-3 p-2 hover:bg-white/10 rounded-xl transition-colors text-left group">
                          <img src={u.avatar} className="w-8 h-8 rounded-lg" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{u.name}</p>
                            <p className="text-[9px] text-slate-400 truncate">{u.email}</p>
                          </div>
                          <svg className="w-4 h-4 text-indigo-400 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </button>
                      ))}
                      {availableUsersForAdding.length === 0 && <p className="text-[10px] text-slate-500 text-center py-4 italic">查無可加入的人員</p>}
                   </div>
                 </div>
               )}

               <div className="space-y-3">
                 {currentReviewerIds.map(rid => {
                   const u = users.find(user => user.id === rid || user.email === rid);
                   // 關鍵修正：檢查繳卷狀態時必須匹配特定的 nominationId
                   const isFinished = allFeedbacks.some(f => 
                     f.fromUserId === rid && 
                     f.nominationId === selectedNomination.id
                   );

                   return (
                     <div key={rid} className={`flex items-center justify-between p-4 border rounded-2xl transition-all ${isFinished ? 'bg-white border-emerald-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                         <img src={u?.avatar} className={`w-10 h-10 rounded-xl shadow-sm ${isFinished ? 'ring-2 ring-emerald-500' : ''}`} alt="" />
                         <div className="flex-1 min-w-0">
                           <p className="text-sm font-black text-slate-900 truncate">{u?.name || rid}</p>
                           <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${isFinished ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400 animate-pulse'}`}></span>
                              <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${isFinished ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {isFinished ? '已繳卷' : '待填寫中'}
                              </span>
                           </div>
                         </div>
                       </div>
                       <div className="flex items-center gap-2 shrink-0">
                         {!isFinished && (
                            <button 
                              onClick={() => {
                                const requester = users.find(u=>u.id===selectedNomination.requesterId)?.name || '同仁';
                                sendManualNotification('reviewer_task', u?.email || rid, requester, selectedNomination.title);
                              }}
                              className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-sm"
                              title="催促繳卷"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                            </button>
                         )}
                         <button 
                           disabled={isSyncing || isFinished} 
                           onClick={() => !isFinished && handleUpdateReviewers(currentReviewerIds.filter(id => id !== rid))} 
                           className={`p-2 transition-all ${isFinished ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 hover:text-rose-600'}`}
                           title={isFinished ? "已繳卷，不可移除" : "移除此受邀人"}
                         >
                           {isSyncing ? '...' : <svg className={`w-4 h-4 ${isFinished ? 'hidden' : 'block'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>}
                           {isFinished && <svg className="w-4 h-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                         </button>
                       </div>
                     </div>
                   );
                 })}
                 {currentReviewerIds.length === 0 && (
                   <div className="py-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300 shadow-sm"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">目前名單內無受邀人</p>
                   </div>
                 )}
               </div>
             </div>
          </div>
          <div className="p-8 border-t bg-slate-50 text-center"><button onClick={() => { setIsManageDrawerOpen(false); setIsAddingInDrawer(false); }} className="px-12 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200/50">儲存並完成</button></div>
        </div>
      </>
    );
  };

  const renderDeleteDrawer = () => {
    if (!isDeleteDrawerOpen || !nominationToDelete) return null;
    return (
      <>
        <div onClick={() => setIsDeleteDrawerOpen(false)} className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md animate-in fade-in" />
        <div className="fixed top-0 right-0 z-[121] h-full w-full max-w-lg bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col border-l border-rose-100">
          <div className="p-8 border-b border-rose-50 flex items-center justify-between bg-rose-50/30"><div><h2 className="text-2xl font-black text-rose-600">永久刪除邀請</h2></div><button onClick={() => setIsDeleteDrawerOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg></button></div>
          <div className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
             <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6">
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">評鑑標題</p><p className="font-bold text-slate-700 leading-tight">{nominationToDelete.title}</p></div>
             </div>
          </div>
          <div className="p-8 border-t bg-slate-50 flex gap-4"><button onClick={() => setIsDeleteDrawerOpen(false)} className="flex-1 py-4 bg-white text-slate-500 font-black rounded-2xl border border-slate-200">取消</button><button disabled={isDeletingProcess} onClick={executeDeleteNomination} className="flex-[1.5] py-4 bg-rose-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50">{isDeletingProcess ? '處理中...' : '確認永久刪除'}</button></div>
        </div>
      </>
    );
  };


  const renderSystemInfo = () => {
    // 簡單解析 VERSION.md 擷取最新版本號與項目
    let latestVersion = 'v1.0.0 (Stable)';
    let updateItems: string[] = [];
    
    try {
      const parts = versionData.split('## 4. 版本紀錄 (Milestones)');
      if (parts.length > 1) {
        const lines = parts[1].split('\n').filter(l => l.trim() !== '');
        // 找第一個版本記錄，通常起手式是 - **v1.0.0 (Stable)**: 或類似格式
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].startsWith('- **v')) {
            const vMatch = lines[i].match(/\*\*([^*]+)\*\*/);
            if (vMatch) latestVersion = vMatch[1];
            // 抓取這個版本下一層的 bullet points
            let j = i + 1;
            while (j < lines.length && (lines[j].startsWith('  -') || lines[j].trim() === '')) {
              if (lines[j].trim() !== '') {
                updateItems.push(lines[j].replace('  -', '').trim());
              }
              j++;
            }
            break; // 只抓最新的一個版本
          }
        }
      }
    } catch(e) {}
    
    if (updateItems.length === 0) {
      updateItems = ['實作基礎 CRUD 與狀態管理', '整合 Google 企業信箱登入 (SSO)', 'TDD 架構引入與安全性強化 (Auth Edge Cases)'];
    }

    return (
      <div className="max-w-6xl mx-auto animate-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="flex flex-col md:flex-row gap-8">
          
          {/* 左側：開發團隊資訊 (大約 35% 寬) */}
          <div className="w-full md:w-5/12 space-y-8">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">開發團隊</h3>
                  <p className="text-slate-500 text-[10px] font-bold mt-0.5">Foundational Engineering</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                 <div className="pb-4 border-b border-slate-50">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">開發者 / 負責人</p>
                   <p className="text-lg font-black text-slate-900">Abraham Chien</p>
                 </div>
                 <div className="pb-4 border-b border-slate-50">
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">所屬組織</p>
                   <p className="text-lg font-black text-slate-900">CHOCO Media Group</p>
                 </div>
                 <div>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">核心引擎</p>
                   <p className="text-lg font-black text-indigo-600">Antigravity</p>
                 </div>
              </div>
            </div>
          </div>

           {/* 右側：版本更新資訊 (大約 65% 寬) */}
          <div className="w-full md:w-7/12">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden h-full">
              <div className="p-6 border-b border-slate-100 bg-emerald-50 flex items-center gap-4">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
                </div>
                <div>
                  <h3 className="text-base font-black text-emerald-900 uppercase tracking-tight">版本更新資訊</h3>
                  <p className="text-emerald-600/70 text-[10px] font-bold mt-0.5">Release History & Change Logs</p>
                </div>
              </div>
              
              <div className="p-8">
                 <div className="flex items-start gap-5 relative">
                   <div className="absolute left-[19px] top-[30px] bottom-[-20px] w-0.5 bg-slate-100"></div>
                   <div className="shrink-0 w-10 h-10 bg-indigo-50 border-4 border-white rounded-full flex items-center justify-center z-10 shadow-sm mt-1">
                      <span className="w-3 h-3 rounded-full bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.5)]"></span>
                   </div>
                   <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex-1">
                      <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-4">
                        <div>
                          <h4 className="text-xl font-black text-slate-900 leading-none">{latestVersion}</h4>
                          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">目前穩定版本</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-[9px] font-black uppercase tracking-widest rounded-lg">最新發布</span>
                      </div>
                      <ul className="space-y-3">
                        {updateItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2"></span>
                            <span className="text-sm font-bold text-slate-700 leading-tight">{item}</span>
                          </li>
                        ))}
                      </ul>
                   </div>
                 </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  };

  const renderNotificationManagement = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            Slack 通知日誌
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">檢視與管理所有已觸發的系統通知紀錄</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleClearLogs} 
            className="px-6 py-3 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-xl font-black text-xs transition-all shadow-sm"
          >
            清空歷史紀錄
          </button>
          <button 
            onClick={handleSendBatchReminders} 
            disabled={isSendingBatch}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
          >
            {isSendingBatch ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : null}
            手動觸發全局批次催繳
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
        {notificationLogs.length === 0 ? (
          <div className="p-24 text-center">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">目前沒有任何通知紀錄</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest pl-8">發送時間</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">收件人</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">類型</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">狀態</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">訊息摘要</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right pr-8">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupedLogs.map((group) => {
                  const isExpanded = expandedLogGroups.has(group.id);
                  const latestLog = group.logs[0];
                  return (
                    <React.Fragment key={group.id}>
                      <tr 
                        onClick={() => toggleLogGroup(group.id)}
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-5 pl-8 border-l-4 border-transparent group-hover:border-indigo-500" colSpan={6}>
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <span className="text-slate-400 shrink-0">
                                <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                              </span>
                              <p className="text-sm font-black text-indigo-900 break-words">{group.title}</p>
                              <span className="shrink-0 text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded uppercase tracking-widest hidden sm:block ml-2">
                                共 {group.logs.length} 則通知
                              </span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0 pl-4">
                              <p className="text-xs text-slate-500 font-medium hidden lg:block">最新: {latestLog.messageText.substring(0, 50)}{latestLog.messageText.length > 50 ? '...' : ''}</p>
                              <p className="text-xs/none font-bold text-slate-400">{formatRelativeTime(group.latestTime)}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && group.logs.map((log) => (
                        <tr key={log.id} className="bg-slate-50/30 hover:bg-slate-50 transition-colors border-t border-dashed border-slate-100">
                          <td className="px-6 py-4 pl-14">
                             <p className="text-xs font-bold text-slate-500">{new Date(log.createdAt || '').toLocaleString()}</p>
                          </td>
                          <td className="px-6 py-4">
                             <p className="text-xs font-black text-slate-700 border border-slate-200 bg-white px-2 py-1 rounded-lg inline-block shadow-sm break-all">{log.recipientEmail}</p>
                          </td>
                          <td className="px-6 py-4">
                             <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded w-fit">{log.notificationType}</span>
                          </td>
                          <td className="px-6 py-4">
                             {log.status === 'sent' ? (
                               <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded w-fit uppercase tracking-widest">
                                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>成功
                               </span>
                             ) : (
                               <span className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded w-fit uppercase tracking-widest">
                                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>失敗
                               </span>
                             )}
                          </td>
                          <td className="px-6 py-4">
                             <div className="text-xs text-slate-600 font-medium break-words max-w-md">
                                {log.messageText}
                             </div>
                             {log.status === 'failed' && log.errorMessage && (
                               <p className="text-[9px] text-rose-500 font-bold mt-1 break-words max-w-md">錯誤: {log.errorMessage}</p>
                             )}
                          </td>
                          <td className="px-6 py-4 text-right pr-8">
                             <button onClick={() => resendLog(log)} className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-lg shadow-sm transition-all focus:ring-4 focus:ring-slate-100">
                               重發
                             </button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 relative">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl">
        <div><h1 className="text-3xl font-black text-white tracking-tight">系統控制中心</h1><p className="text-slate-400 font-bold mt-1 uppercase text-[10px] tracking-[0.2em]">Choco360 Control v2.10</p></div>
        <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md overflow-x-auto scrollbar-hide">
          {[ 
            { id: 'activity', label: '活動監控' }, 
            { id: 'users', label: '員工管理' }, 
            { id: 'forms', label: '問卷設計' }, 
            { id: 'notifications', label: '通知管理' }, 
            { id: 'system', label: '系統資訊' } 
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveSubTab(tab.id as any)} className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${activeSubTab === tab.id ? 'bg-white text-slate-900 shadow-xl' : 'text-white hover:bg-white/5'}`}>{tab.label}</button>
          ))}
        </div>
      </header>

      {activeSubTab === 'activity' && renderActivityMonitoring()}
      {activeSubTab === 'users' && renderUserManagement()}
      {activeSubTab === 'forms' && renderFormManagement()}
      {activeSubTab === 'notifications' && renderNotificationManagement()}
      {activeSubTab === 'system' && renderSystemInfo()}

      {renderUserEditor()}
      {renderFormEditor()}
      {renderManageDrawer()}
      {renderDeleteDrawer()}
    </div>
  );
};

export default AdminPanel;
