-- ==============================================
-- 🚀 Choco360: PRP (Performance Review Process) Schema Migration
-- 請將此段 SQL 複製並貼上至您的 Supabase SQL Editor 中執行。
-- ==============================================

-- 1. PRP 主表 (存進度與基本資訊)
CREATE TABLE IF NOT EXISTS public.prp_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    period TEXT NOT NULL,                    -- 例如 "2025" 或 "2024 年度"
    department TEXT,                         -- 匯入時紀錄當時部門
    job_title TEXT,                          -- 匯入時紀錄當時職稱
    employee_code TEXT,                      -- 員編
    
    -- 綜合考核
    overall_self_summary TEXT,               -- 自評總結
    overall_manager_comments JSONB DEFAULT '[]'::jsonb, -- 支援多位主管評語 [{ label: "原主管", comment: "..." }, { label: "新主管", comment: "..." }]
    final_rating TEXT,                       -- S/A/B/C/D
    
    -- 面談紀錄
    interview_notes TEXT,
    
    -- 系統欄位
    source TEXT DEFAULT 'import',            -- 'import' 或 'manual'
    raw_document TEXT,                       -- 備份原始 Markdown 
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PRP 明細表 (KPI 與 核心職能)
CREATE TABLE IF NOT EXISTS public.prp_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prp_record_id UUID REFERENCES public.prp_records(id) ON DELETE CASCADE,
    
    item_type TEXT NOT NULL,                 -- 'kpi' 或 'core_competency'
    item_label TEXT NOT NULL,                -- 例如 "KPI 1" 或 "團隊合作"
    importance INTEGER,                      -- 重要度 1-3
    
    self_description TEXT,                   -- 員工自述內容
    
    -- 彈性評分者 (支援 1~N 位主管)
    evaluations JSONB DEFAULT '[]'::jsonb,   -- [{ label: "原主管", comment: "...", score: 84 }, ...]
    
    item_rating TEXT,                        -- S/A/B/C/D (個別項目的評等，可為空)
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 索引優化 (加速讀取與關聯)
CREATE INDEX IF NOT EXISTS idx_prp_records_user_id ON public.prp_records(user_id);
CREATE INDEX IF NOT EXISTS idx_prp_items_record_id ON public.prp_items(prp_record_id);

-- 4. 啟用 RLS
ALTER TABLE public.prp_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prp_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS 存取政策
-- 員工僅能查看自己的 PRP
CREATE POLICY "Users can view own prp_records" ON public.prp_records
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own prp_items" ON public.prp_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.prp_records 
            WHERE id = prp_items.prp_record_id 
            AND user_id = auth.uid()
        )
    );

-- 使用 security definer 函式避免 RLS 遞迴查詢導致 timeout
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

-- 管理員 (Admin) 擁有一切權限 (CRUD)
CREATE POLICY "Admins can maintain all prp_records" ON public.prp_records
    TO authenticated
    USING (public.is_system_admin())
    WITH CHECK (public.is_system_admin());

CREATE POLICY "Admins can maintain all prp_items" ON public.prp_items
    TO authenticated
    USING (public.is_system_admin())
    WITH CHECK (public.is_system_admin());
