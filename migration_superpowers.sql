-- ==============================================
-- 🚀 Choco360: Superpower Update Migration
-- 請將此段 SQL 複製並貼上至您的 Supabase SQL Editor 中執行。
-- ==============================================

-- 1. 新增格言 (motto) 欄位
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS motto TEXT;

-- 2. 新增已解鎖超能力 (unlocked_superpowers) 欄位，使用 JSONB 並預設為空陣列
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS unlocked_superpowers JSONB DEFAULT '[]'::jsonb;

-- 3. 新增當前裝備的超能力 (active_superpower_id) 欄位
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS active_superpower_id TEXT;

-- 4. 若需要給現有同仁一些預設資料，可選用以下 SQL
/*
UPDATE public.profiles
SET motto = '保持熱情，持續成長。'
WHERE motto IS NULL;
*/
