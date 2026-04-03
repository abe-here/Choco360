import React, { useState } from 'react';
import changelogData from '../changelog.json';

interface VersionEntry {
  version: string;
  date: string;
  summary: string;
  changes: string[];
}

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({ isOpen, onClose }) => {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(changelogData[0]?.version || null);
  const [displayCount, setDisplayCount] = useState(5);

  if (!isOpen) return null;

  const visibleVersions = changelogData.slice(0, displayCount);
  const hasMore = changelogData.length > displayCount;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">版本歷程</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Changelog & Updates</p>
          </div>
          <button 
            onClick={onClose}
            className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
          <div className="space-y-8 relative">
            {/* Timeline Line */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100" />

            {visibleVersions.map((entry: VersionEntry, index) => {
              const isExpanded = expandedVersion === entry.version;
              return (
                <div key={entry.version} className="relative pl-10">
                  {/* Timeline Dot */}
                  <div className={`absolute left-2.5 top-2 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 ring-white z-10 ${
                    index === 0 ? 'bg-indigo-600' : 'bg-slate-300'
                  }`} />

                  <div 
                    className={`group p-6 rounded-[2rem] transition-all cursor-pointer border ${
                      isExpanded 
                        ? 'bg-indigo-50/50 border-indigo-100 ring-1 ring-indigo-50' 
                        : 'bg-white border-transparent hover:bg-slate-50'
                    }`}
                    onClick={() => setExpandedVersion(isExpanded ? null : entry.version)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tight ${
                          index === 0 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-500'
                        }`}>
                          v{entry.version}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{entry.date}</span>
                      </div>
                      <svg 
                        className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-indigo-400' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>

                    <h3 className={`text-sm font-black transition-colors ${isExpanded ? 'text-indigo-900' : 'text-slate-700'}`}>
                      {entry.summary}
                    </h3>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-indigo-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <ul className="space-y-3">
                          {entry.changes.map((change, i) => (
                            <li key={i} className="flex gap-3 text-xs text-slate-600 leading-relaxed">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-300 flex-shrink-0" />
                              {change}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="pl-10 pb-8">
                <button 
                  onClick={() => setDisplayCount(prev => prev + 5)}
                  className="w-full py-4 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-[0.2em] border-2 border-dashed border-slate-100 hover:border-indigo-100 rounded-3xl transition-all"
                >
                  載入更多歷史紀錄...
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 bg-slate-50/50 border-t border-slate-100">
           <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                System Build Status
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Stable v{changelogData[0]?.version}</span>
              </span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default VersionHistory;
