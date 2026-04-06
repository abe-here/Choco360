import React, { useState, useEffect, useMemo } from 'react';
import { User, PRPRecord } from '../types';
import { api } from '../services/api';
import PRPImportModal from './PRPImportModal';
import PRPEditPage from './PRPEditPage';

interface PRPAdminManagerProps {
  users: User[];
}

const PRPAdminManager: React.FC<PRPAdminManagerProps> = ({ users }) => {
  const [records, setRecords] = useState<PRPRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('All');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<PRPRecord | null>(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllPRPRecords();
      setRecords(data);
    } catch (err) {
      console.error('Failed to fetch PRP records', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`確定要刪除 ${name} 的這筆績效紀錄嗎？此操作不可復原。`)) return;
    setIsDeleting(id);
    try {
      await api.deletePRPRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('刪除失敗');
    } finally {
      setIsDeleting(null);
    }
  };

  const periods = useMemo(() => {
    const p = new Set<string>();
    records.forEach(r => p.add(r.period));
    return ['All', ...Array.from(p)].sort().reverse();
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedPeriod === 'All') return records;
    return records.filter(r => r.period === selectedPeriod);
  }, [records, selectedPeriod]);

  // 進入編輯模式：替換整個元件為 PRPEditPage
  if (editingRecord) {
    return (
      <PRPEditPage
        record={editingRecord}
        users={users}
        isAdminMode={true}
        onBack={() => setEditingRecord(null)}
        onSaved={(updated) => {
          setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
          setEditingRecord(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <div className="w-2 h-6 bg-indigo-600 rounded-full"></div>
            PRP 績效管理後台
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            管理全公司績效紀錄匯入與維護
          </p>
        </div>
        <button 
          onClick={() => setIsImportModalOpen(true)}
          className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
          </svg>
          匯入新績效檔案
        </button>
      </div>

      <div className="px-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {periods.map(p => (
          <button
            key={p}
            onClick={() => setSelectedPeriod(p)}
            className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              selectedPeriod === p 
                ? 'bg-slate-900 text-white' 
                : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
            }`}
          >
            {p === 'All' ? '全部時段' : p}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">載入紀錄中...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-32 text-center text-slate-300">
            <p className="font-bold italic">目前尚無 PRP 紀錄，請點擊上方按鈕開始匯入。</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">員工</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">考核時段</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">職稱 / 部門</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">最終等第</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((r) => {
                const user = users.find(u => u.id === r.userId);
                return (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <img src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${r.userId}`} className="w-10 h-10 rounded-xl bg-slate-100" alt="" />
                        <div>
                          <p className="font-black text-slate-900">{user?.name || '未知員工'}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{r.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{r.period}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-bold text-slate-700">{r.jobTitle}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase">{r.department}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className="text-xl font-black text-indigo-600">{r.finalRating}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingRecord(r)}
                        className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shadow-sm"
                        title="編輯此筆紀錄"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(r.id, user?.name || '此紀錄')}
                        disabled={isDeleting === r.id}
                        className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shadow-sm"
                        title="刪除此筆紀錄"
                      >
                        {isDeleting === r.id ? (
                          <div className="w-5 h-5 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1h-4a1 1 0 00-1-1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {isImportModalOpen && (
        <PRPImportModal 
          users={users} // 這裡會傳入 users 讓 Modal 支援人員選擇
          isAdminMode={true}
          onClose={() => setIsImportModalOpen(false)}
          onSuccess={() => {
            fetchRecords();
            setIsImportModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PRPAdminManager;
