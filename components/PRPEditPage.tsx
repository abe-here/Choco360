import React, { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { StarterKit } from '@tiptap/starter-kit';
import { Underline } from '@tiptap/extension-underline';
import { PRPRecord, PRPItem } from '../types';
import { api } from '../services/api';

interface PRPEditPageProps {
  record: PRPRecord;
  onBack: () => void;
  onSaved: (updated: PRPRecord) => void;
}

// ── 工具函式：純文字 → HTML ────────────────────────────────────
function plainTextToHtml(text: string): string {
  if (!text) return '<p></p>';
  if (text.trim().startsWith('<')) return text;
  const lines = text.split('\n').filter(l => l.trim());
  const hasBullets = lines.some(l => /^[•\-]/.test(l.trim()));
  if (hasBullets) {
    return '<ul>' + lines.map(l => `<li>${l.trim().replace(/^[•\-]\s*/, '')}</li>`).join('') + '</ul>';
  }
  return lines.map(l => `<p>${l}</p>`).join('') || '<p></p>';
}

// ── TipTap Toolbar ────────────────────────────────────────────
function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;
  const btn = (active: boolean, onClick: () => void, label: React.ReactNode, title?: string) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
        active ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >{label}</button>
  );
  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-slate-100 bg-slate-50/80">
      {btn(editor.isActive('bold'),        () => editor.chain().focus().toggleBold().run(),        <b>B</b>, '粗體')}
      {btn(editor.isActive('italic'),      () => editor.chain().focus().toggleItalic().run(),      <i>I</i>, '斜體')}
      {btn(editor.isActive('underline'),   () => editor.chain().focus().toggleUnderline().run(),   <u>U</u>, '底線')}
      <div className="w-px bg-slate-200 mx-1 self-stretch" />
      {btn(editor.isActive('bulletList'),  () => editor.chain().focus().toggleBulletList().run(),  '• 列表', 'Bullet List')}
      {btn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), '1. 列表', 'Numbered List')}
      <div className="w-px bg-slate-200 mx-1 self-stretch" />
      {btn(false, () => editor.chain().focus().undo().run(), <span className="text-base">↩</span>, '復原')}
      {btn(false, () => editor.chain().focus().redo().run(), <span className="text-base">↪</span>, '重做')}
    </div>
  );
}

// ── Rich Text Editor ──────────────────────────────────────────
function RichEditor({ initialContent, onChange, minHeight = 'min-h-[100px]' }: {
  initialContent: string;
  onChange: (html: string) => void;
  minHeight?: string;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({}), Underline.configure({})],
    content: plainTextToHtml(initialContent),
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all bg-white">
      <Toolbar editor={editor} />
      <EditorContent
        editor={editor}
        className={`${minHeight} [&_.ProseMirror]:outline-none [&_.ProseMirror]:p-4
          [&_.ProseMirror_p]:my-1 [&_.ProseMirror_p]:text-slate-700 [&_.ProseMirror_p]:leading-relaxed
          [&_.ProseMirror_ul]:pl-5 [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:pl-5 [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_li]:my-0.5
          [&_.ProseMirror_li]:text-slate-700 [&_.ProseMirror_strong]:font-black
          [&_.ProseMirror]:text-sm`}
      />
    </div>
  );
}

// ── 唯讀欄位 ─────────────────────────────────────────────────
function ReadOnlyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div>{children}</div>
    </div>
  );
}

// ── Rating Badge ──────────────────────────────────────────────
function RatingBadge({ rating, size = 'md' }: { rating?: string | null; size?: 'sm' | 'md' | 'lg' }) {
  if (!rating) return null;
  const isTop = ['S', 'A'].includes(rating);
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-1.5 text-base', lg: 'px-5 py-2 text-2xl' };
  return (
    <span className={`font-black rounded-xl ${sizes[size]} ${isTop ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
      {rating}
    </span>
  );
}

// ── KPI / 核心職能 Item 卡片 ──────────────────────────────────
function ItemCard({ item, onChange }: {
  item: PRPItem;
  onChange: (updated: Partial<PRPItem>) => void;
}) {
  const isKpi = item.itemType === 'kpi';
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/60 flex items-center gap-3">
        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${
          isKpi ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {isKpi ? 'KPI' : '核心職能'}
        </span>
        <input
          type="text"
          value={item.itemLabel}
          onChange={e => onChange({ itemLabel: e.target.value })}
          className="flex-1 font-black text-slate-900 bg-transparent border-b-2 border-transparent
            hover:border-slate-200 focus:border-indigo-400 focus:outline-none px-1 py-0.5 transition-colors text-base"
          placeholder="項目標題"
        />
        {item.importance && (
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            重要度 {item.importance}
          </span>
        )}
        {item.itemRating && <RatingBadge rating={item.itemRating} size="sm" />}
      </div>

      <div className="p-8 space-y-6">
        {/* Self Description Editor */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">自述說明</p>
          <RichEditor
            initialContent={item.selfDescription}
            onChange={html => onChange({ selfDescription: html })}
          />
        </div>

        {/* Evaluations（唯讀）*/}
        {item.evaluations && item.evaluations.length > 0 && (
          <div className="space-y-3">
            {/* Header row: label + average score chip */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">主管評語</p>
                <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-widest">唯讀</span>
              </div>
              {item.averageScore != null && (
                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-2">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">平均分</span>
                  <span className="text-2xl font-black text-indigo-600 leading-none">{item.averageScore}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {item.evaluations.map((ev, i) => (
                <div key={i} className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                    <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-lg whitespace-nowrap shadow-sm text-center w-full">
                      {ev.label}
                    </span>
                    {ev.score != null && (
                      <span className="text-sm font-black text-indigo-600 whitespace-nowrap">{ev.score} 分</span>
                    )}
                  </div>
                  <p className="flex-1 text-sm text-slate-600 leading-relaxed">{ev.comment || '—'}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 主元件 ───────────────────────────────────────────────────
const PRPEditPage: React.FC<PRPEditPageProps> = ({ record, onBack, onSaved }) => {
  const [overallSelfSummary, setOverallSelfSummary] = useState(record.overallSelfSummary || '');
  const [items, setItems] = useState<PRPItem[]>(
    (record.items || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleItemChange = useCallback((idx: number, updates: Partial<PRPItem>) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('SAVE_TIMEOUT')), 15_000)
    );
    try {
      await Promise.race([
        api.updatePRPRecord(
          record.id,
          { overallSelfSummary },
          items.filter(i => i.id).map(i => ({ id: i.id!, selfDescription: i.selfDescription, itemLabel: i.itemLabel }))
        ),
        timeout,
      ]);
      setSaveSuccess(true);
      setTimeout(() => onSaved({ ...record, overallSelfSummary, items }), 800);
    } catch (err: any) {
      setError(
        err.message === 'SAVE_TIMEOUT'
          ? '⏱ 儲存逾時，連線可能不穩。資料未遺失，請再試一次。'
          : err.message?.includes('JWT') || err.status === 401
            ? '🔐 登入階段已過期，請重新整理頁面後再試。'
            : `儲存失敗：${err.message || '未知錯誤'}，請再試一次。`
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">

      {/* ── Page Header ── */}
      <header className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-black text-sm uppercase tracking-widest group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          返回
        </button>
        <h1 className="font-black text-slate-900 text-2xl italic tracking-tight">
          {record.period} 年度績效考核
        </h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`px-7 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 ${
            saveSuccess
              ? 'bg-emerald-500 text-white shadow-emerald-100'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-100 disabled:opacity-50'
          }`}
        >
          {isSaving
            ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />儲存中...</span>
            : saveSuccess ? '✓ 已儲存' : '儲存變更'}
        </button>
      </header>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-3xl flex gap-3 items-start">
          <span className="text-xl mt-0.5">⚠️</span>
          <p className="flex-1 text-sm text-rose-600 leading-relaxed">{error}</p>
          <button onClick={() => setError(null)} className="text-rose-300 hover:text-rose-500 font-black text-lg leading-none">×</button>
        </div>
      )}

      {/* ── Info Bar（唯讀）── */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">考核基本資訊</h2>
        </div>
        <div className="px-10 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          <ReadOnlyField label="年度">
            <p className="font-black text-slate-900 text-xl">{record.period}</p>
          </ReadOnlyField>
          <ReadOnlyField label="部門">
            <p className="font-bold text-slate-700">{record.department}</p>
          </ReadOnlyField>
          <ReadOnlyField label="職稱">
            <p className="font-bold text-slate-700">{record.jobTitle}</p>
          </ReadOnlyField>
          <ReadOnlyField label="最終等第">
            <p className={`font-black text-xl ${
              ['S','A'].includes(record.finalRating || '') ? 'text-indigo-600' : 'text-slate-700'
            }`}>
              {record.finalRating || '—'}
            </p>
          </ReadOnlyField>
        </div>
      </section>

      {/* ── KPI Items ── */}
      {items.some(i => i.itemType === 'kpi') && (
        <section className="space-y-4">
          <div className="px-1 flex items-center gap-3">
            <div className="h-5 w-1.5 bg-indigo-600 rounded-full" />
            <h2 className="font-black text-slate-900 text-lg tracking-tight">KPI 工作目標</h2>
          </div>
          {items.filter(i => i.itemType === 'kpi').map((item: PRPItem) => {
            const idx = items.indexOf(item);
            return (
              <ItemCard
                key={item.id ?? idx}
                item={item}
                onChange={(updates: Partial<PRPItem>) => handleItemChange(idx, updates)}
              />
            );
          })}
        </section>
      )}

      {/* ── 核心職能 Items ── */}
      {items.some(i => i.itemType === 'core_competency') && (
        <section className="space-y-4">
          <div className="px-1 flex items-center gap-3">
            <div className="h-5 w-1.5 bg-amber-500 rounded-full" />
            <h2 className="font-black text-slate-900 text-lg tracking-tight">核心職能</h2>
          </div>
          {items.filter(i => i.itemType === 'core_competency').map((item: PRPItem) => {
            const idx = items.indexOf(item);
            return (
              <ItemCard
                key={item.id ?? idx}
                item={item}
                onChange={(updates: Partial<PRPItem>) => handleItemChange(idx, updates)}
              />
            );
          })}
        </section>
      )}

      {/* ── 綜合考核（自評 + 主管總評）── */}
      <section className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="h-5 w-1.5 bg-amber-500 rounded-full" />
          <div>
            <h2 className="font-black text-slate-900 text-lg tracking-tight">綜合考核</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Overall Assessment</p>
          </div>
        </div>

        <div className="p-10 space-y-8">
          {/* 自評（可編輯）*/}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">自評內容</span>
              <span className="text-[9px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-lg uppercase tracking-widest">可編輯</span>
            </div>
            <RichEditor
              initialContent={overallSelfSummary}
              onChange={setOverallSelfSummary}
              minHeight="min-h-[120px]"
            />
          </div>

          {/* 主管總評（唯讀）*/}
          {record.overallManagerComments && record.overallManagerComments.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">主管評語</span>
                <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg uppercase tracking-widest">唯讀</span>
              </div>
              <div className="space-y-3">
                {record.overallManagerComments.map((c, i) => (
                  <div key={i} className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-xl whitespace-nowrap shadow-sm">
                      {c.label}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{c.comment || '—'}</p>
                    </div>
                    {(c as any).score != null && (
                      <span className="text-sm font-black text-indigo-600 whitespace-nowrap">{(c as any).score} 分</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
};

export default PRPEditPage;
