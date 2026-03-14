
import { createClient } from '@supabase/supabase-js';

// 使用系統中現有的 Supabase 設定
const supabaseUrl = 'https://bsbvycdbnccrpciywqlx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJzYnZ5Y2RibmNjcnBjaXl3cWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTg4NDYsImV4cCI6MjA4NDc3NDg0Nn0.tW2xu-8HtO_Lemf353n0-db1TubkEV-uiTxCjJfOKOM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * 清理指定 Email 員工的所有評鑑與反饋資料
 */
export async function cleanTestData(emails: string[]) {
  console.log('--- 正在清理測試數據 ---');
  
  // 1. 獲取用戶 UUID
  const { data: users } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', emails);

  if (!users || users.length === 0) return;
  const userIds = users.map(u => u.id);

  // 2. 依照外鍵順序刪除
  // A. 刪除反饋細項
  const { data: fbs } = await supabase.from('feedbacks').select('id').in('to_user_id', userIds);
  if (fbs && fbs.length > 0) {
    await supabase.from('feedback_responses').delete().in('feedback_id', fbs.map(f => f.id));
  }
  
  // B. 刪除反饋主表
  await supabase.from('feedbacks').delete().in('to_user_id', userIds);
  await supabase.from('feedbacks').delete().in('from_user_id', userIds);
  
  // C. 刪除提名邀請
  await supabase.from('nominations').delete().in('requester_id', userIds);
  
  console.log(`已清理 ${emails.join(', ')} 的相關歷史數據`);
}

/**
 * 獲取最後一筆提名狀態
 */
export async function getNominationStatus(email: string) {
  const { data } = await supabase
    .from('nominations')
    .select('*, profiles!inner(email)')
    .eq('profiles.email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}
