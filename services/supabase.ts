import { createClient } from '@supabase/supabase-js';

/**
 * 重要提示：
 * 如果瀏覽器出現「找不到伺服器 IP」錯誤：
 * 1. 請確認 Supabase 專案是否處於 Active 狀態 (未被暫停)
 * 2. 請從 Supabase Dashboard (Settings -> API) 複製正確的 "Project URL"
 * 
 * 安全提醒：
 * 若在 Supabase Dashboard 啟用 RLS (Row Level Security)，
 * 請務必為每個 Table 增加 "Enable access for anon" 的 Policy，
 * 否則前端將無法讀取任何資料。
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const checkSupabaseConnection = async (): Promise<{ connected: boolean; error: string | null }> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey) {
      return { connected: false, error: `Missing env vars. URL=${supabaseUrl ? 'SET' : 'EMPTY'}, KEY=${supabaseAnonKey ? 'SET' : 'EMPTY'}` };
    }
    // Direct fetch to bypass Supabase client and get raw error
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=count&limit=0`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    if (res.ok || res.status === 200 || res.status === 406) {
      return { connected: true, error: null };
    }
    const body = await res.text();
    return { connected: false, error: `HTTP ${res.status}: ${body} (URL: ${supabaseUrl.substring(0, 30)}...)` };
  } catch (err: any) {
    console.error("Supabase Connection Check Failed.", err);
    const msg = err?.message || JSON.stringify(err) || 'Unknown error';
    return { connected: false, error: `Fetch failed: ${msg} (URL: ${supabaseUrl.substring(0, 30)}...)` };
  }
};