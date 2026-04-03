
-- Nexus360 PostgreSQL Database Schema (v2.4 Professional)

-- [1] 清除舊結構
DROP TABLE IF EXISTS public.feedback_responses CASCADE;
DROP TABLE IF EXISTS public.feedbacks CASCADE;
DROP TABLE IF EXISTS public.nominations CASCADE;
DROP TABLE IF EXISTS public.questions CASCADE;
DROP TABLE IF EXISTS public.dimensions CASCADE;
DROP TABLE IF EXISTS public.questionnaires CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- [2] 員工資料
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    department TEXT,
    avatar TEXT,
    manager_email TEXT,
    is_system_admin BOOLEAN DEFAULT false,
    is_manager BOOLEAN DEFAULT false,
    motto TEXT,
    unlocked_superpowers JSONB DEFAULT '[]'::jsonb,
    active_superpower_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- [3] 問卷主表
CREATE TABLE public.questionnaires (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- [4] 維度表
CREATE TABLE public.dimensions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    purpose TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- [5] 題目表
CREATE TABLE public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dimension_id UUID REFERENCES public.dimensions(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    question_type TEXT DEFAULT 'rating',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- [6] 邀請表 (具備 AI 快取與進度追蹤)
CREATE TABLE public.nominations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reviewer_ids UUID[] NOT NULL,
    status TEXT DEFAULT 'Pending',
    manager_email TEXT NOT NULL,
    title TEXT,
    questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE SET NULL,
    due_date TIMESTAMPTZ,
    ai_analysis JSONB,
    analysis_feedback_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- [7] 回饋主表 (新增 nomination_id 關聯)
CREATE TABLE public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    questionnaire_id UUID REFERENCES public.questionnaires(id) ON DELETE SET NULL,
    nomination_id UUID REFERENCES public.nominations(id) ON DELETE CASCADE,
    stop_comments TEXT,
    start_comments TEXT,
    continue_comments TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- [8] 回饋細項
CREATE TABLE public.feedback_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    score INTEGER,
    answer_text TEXT,
    dimension_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- [9] 注入員工資料
INSERT INTO public.profiles (email, name, role, department, avatar, is_system_admin, is_manager, manager_email)
VALUES 
('aaron.chien@choco.media', 'Aaron Chien 簡嘉政', 'IT', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aaron', false, false, 'abraham.chien@choco.media'),
('abbey.chuang@choco.media', 'Abbey Chuang 莊于萱', 'QA', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abbey', false, false, 'abraham.chien@choco.media'),
('abraham.chien@choco.media', 'Abraham Chien 簡培漢', 'PM', 'Product', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abraham', true, true, 'abraham.chien@choco.media'),
('andy.chen@choco.media', 'Andy Chen 陳緯倫', 'Designer', 'Design', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andy', false, false, 'abraham.chien@choco.media'),
('angie.hsieh@choco.media', 'Angie Hsieh 謝綺芳', 'Designer', 'Design', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Angie', false, false, 'abraham.chien@choco.media'),
('annabelle.tai@choco.media', 'Annabelle Tai 戴筠諠', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annabelle', false, false, 'joel@choco.media'),
('carl.hung@choco.media', 'Carl Hung(A) 洪基峻', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carl', false, false, 'esu@choco.media'),
('charlie.huang@choco.media', 'Charlie Huang 黃政哲', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', false, true, 'abraham.chien@choco.media'),
('erica.ma@choco.media', 'Erica Ma 馬婕軒', 'QA', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Erica', false, false, 'abraham.chien@choco.media'),
('esu@choco.media', 'Esu Tsai(i) 蔡育修', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Esu', false, true, 'abraham.chien@choco.media'),
('jack.tseng@choco.media', 'Jack Tseng(A) 曾子豪', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', false, false, 'esu@choco.media'),
('jean.lin@choco.media', 'Jean Lin 林君如', 'PM', 'Product', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean', false, true, 'abraham.chien@choco.media'),
('joanne.kuo@choco.media', 'Joanne Kuo 郭姿瑩', 'CS', 'Customer Success', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joanne', false, true, 'abraham.chien@choco.media'),
('joe.tsai@choco.media', 'Joe Tsai 蔡卓瀚', 'DE/DA', 'Data', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joe', false, false, 'justin@choco.media'),
('joel@choco.media', 'Joel Zhong 鍾約珥', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joel', false, true, 'abraham.chien@choco.media'),
('justin@choco.media', 'Justin Chang 張正毅', 'DE/DA', 'Data', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Justin', false, true, 'abraham.chien@choco.media'),
('kimbely.liu@choco.media', 'Kimbely Liu(i) 劉金梅', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimbely', false, false, 'wei@choco.media'),
('laureen.chung@choco.media', 'Laureen Chung 鍾雨倫', 'DE/DA', 'Data', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laureen', false, false, 'justin@choco.media'),
('lilian.li@choco.media', 'Lilian Li 李亮萱', 'CS', 'Customer Success', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilian', false, false, 'joanne.kuo@choco.media'),
('mark.fang@choco.media', 'Mark Fang 方信登', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark', false, false, 'joel@choco.media'),
('max.wu@choco.media', 'Max Wu 吳冠廷', 'PM', 'Product', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max', false, true, 'abraham.chien@choco.media'),
('oakley.liu@choco.media', 'Oakley Liu 劉昆諺', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oakley', false, false, 'zen.chan@choco.media'),
('philip.lin@choco.media', 'Philip Lin 林俊頎', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Philip', false, false, 'joel@choco.media'),
('roger.huang@choco.media', 'Roger Huang(A) 黃睿哲', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roger', false, false, 'charlie.huang@choco.media'),
('sarah.chou@choco.media', 'Sarah Chou 周冠伶', 'Designer', 'Design', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', false, false, 'abraham.chien@choco.media'),
('sean.wang@choco.media', 'Sean Wang 王佑陞', 'DE/DA', 'Data', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sean', false, false, 'justin@choco.media'),
('shelly.zhu@choco.media', 'Shelly Zhu 朱怡璇', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shelly', false, false, 'zen.chan@choco.media'),
('singhua.cai@choco.media', 'SingHua Cai 蔡幸樺', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=SingHua', false, false, 'zen.chan@choco.media'),
('wei@choco.media', 'Wei Chang 張瑋康', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wei', false, true, 'abraham.chien@choco.media'),
('wen.peng@choco.media', 'Wen Peng 彭郁文', 'PM', 'Product', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wen', false, false, 'abraham.chien@choco.media'),
('wendy.hsiao@choco.media', 'Wendy Hsiao 蕭文婷', 'QA', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wendy', false, false, 'abraham.chien@choco.media'),
('yihsuan.kao@choco.media', 'Yihsuan Kao 高宜萱', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yihsuan', false, false, 'wei@choco.media'),
('yuchi.tan@choco.media', 'Yuchi Tan 譚宇淇', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yuchi', false, false, 'wei@choco.media'),
('yuchih.liu@choco.media', 'Yuchih Liu(A) 劉育志', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yuchih', false, false, 'charlie.huang@choco.media'),
('zen.chan@choco.media', 'Zen Chan 陳嘉豪', 'Developer', 'Engineering', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zen', false, true, 'abraham.chien@choco.media');

-- [10] 問卷範本
INSERT INTO public.questionnaires (id, title, description, active)
VALUES ('77777777-7777-7777-7777-777777777777', 'Choco360 - 卓越成長評鑑 (v2.0)', '包含量化評分與質性行為證據收集。', true);

WITH dim AS (
  INSERT INTO public.dimensions (questionnaire_id, name, purpose)
  VALUES ('77777777-7777-7777-7777-777777777777', 'Team Work 與協作', '評估心理安全感與跨團隊補位能力。')
  RETURNING id
)
INSERT INTO public.questions (dimension_id, text, question_type)
SELECT id, '[心理安全感] 他/她是否專注於解決問題而非指責個人？', 'rating' FROM dim
UNION ALL
SELECT id, '請舉例說明他/她在過去三個月內，如何協助團隊解決突發危機？', 'text' FROM dim;

-- [11] 通知紀錄 (Slack Notification Logs)
CREATE TABLE public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    message_text TEXT,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
