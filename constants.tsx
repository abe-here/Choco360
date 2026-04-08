import { User, Questionnaire } from './types';

// Centralized Gemini model config — update here to change models across the entire app.
export const GEMINI_MODELS = {
  /** 360-degree feedback analysis — Reports tab "生成 AI 洞察" */
  feedbackAnalysis: 'gemini-2.5-flash',
  /** PRP Markdown document parsing — Admin PRP import */
  prpParsing: 'gemini-2.5-flash',
} as const;

export const ADMIN_USER_EMAIL = 'abraham.chien@choco.media';

export const TEAM_MEMBERS: User[] = [
  { id: '1', email: 'aaron.chien@choco.media', name: 'Aaron Chien 簡嘉政', role: 'IT', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aaron', managerEmail: 'abraham.chien@choco.media' },
  { id: '2', email: 'abbey.chuang@choco.media', name: 'Abbey Chuang 莊于萱', role: 'QA', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abbey', managerEmail: 'abraham.chien@choco.media' },
  { id: '3', email: 'abraham.chien@choco.media', name: 'Abraham Chien 簡培漢', role: 'PM', department: 'Product', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Abraham', isSystemAdmin: true, isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '4', email: 'andy.chen@choco.media', name: 'Andy Chen 陳緯倫', role: 'Designer', department: 'Design', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Andy', managerEmail: 'abraham.chien@choco.media' },
  { id: '5', email: 'angie.hsieh@choco.media', name: 'Angie Hsieh 謝綺芳', role: 'Designer', department: 'Design', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Angie', managerEmail: 'abraham.chien@choco.media' },
  { id: '6', email: 'annabelle.tai@choco.media', name: 'Annabelle Tai 戴筠諠', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annabelle', managerEmail: 'joel@choco.media' },
  { id: '7', email: 'carl.hung@choco.media', name: 'Carl Hung(A) 洪基峻', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carl', managerEmail: 'esu@choco.media' },
  { id: '8', email: 'charlie.huang@choco.media', name: 'Charlie Huang 黃政哲', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '9', email: 'erica.ma@choco.media', name: 'Erica Ma 馬婕軒', role: 'QA', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Erica', managerEmail: 'abraham.chien@choco.media' },
  { id: '10', email: 'esu@choco.media', name: 'Esu Tsai(i) 蔡育修', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Esu', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '11', email: 'jack.tseng@choco.media', name: 'Jack Tseng(A) 曾子豪', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack', managerEmail: 'esu@choco.media' },
  { id: '12', email: 'jean.lin@choco.media', name: 'Jean Lin 林君如', role: 'PM', department: 'Product', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jean', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '13', email: 'joanne.kuo@choco.media', name: 'Joanne Kuo 郭姿瑩', role: 'CS', department: 'Customer Success', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joanne', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '14', email: 'joe.tsai@choco.media', name: 'Joe Tsai 蔡卓瀚', role: 'DE/DA', department: 'Data', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joe', managerEmail: 'justin@choco.media' },
  { id: '15', email: 'joel@choco.media', name: 'Joel Zhong 鍾約珥', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Joel', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '16', email: 'justin@choco.media', name: 'Justin Chang 張正毅', role: 'DE/DA', department: 'Data', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Justin', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '17', email: 'kimbely.liu@choco.media', name: 'Kimbely Liu(i) 劉金梅', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kimbely', managerEmail: 'wei@choco.media' },
  { id: '18', email: 'laureen.chung@choco.media', name: 'Laureen Chung 鍾雨倫', role: 'DE/DA', department: 'Data', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Laureen', managerEmail: 'justin@choco.media' },
  { id: '19', email: 'lilian.li@choco.media', name: 'Lilian Li 李亮萱', role: 'CS', department: 'Customer Success', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lilian', managerEmail: 'joanne.kuo@choco.media' },
  { id: '20', email: 'mark.fang@choco.media', name: 'Mark Fang 方信登', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark', managerEmail: 'joel@choco.media' },
  { id: '21', email: 'max.wu@choco.media', name: 'Max Wu 吳冠廷', role: 'PM', department: 'Product', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '22', email: 'oakley.liu@choco.media', name: 'Oakley Liu 劉昆諺', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Oakley', managerEmail: 'zen.chan@choco.media' },
  { id: '23', email: 'philip.lin@choco.media', name: 'Philip Lin 林俊頎', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Philip', managerEmail: 'joel@choco.media' },
  { id: '24', email: 'roger.huang@choco.media', name: 'Roger Huang(A) 黃睿哲', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roger', managerEmail: 'charlie.huang@choco.media' },
  { id: '25', email: 'sarah.chou@choco.media', name: 'Sarah Chou 周冠伶', role: 'Designer', department: 'Design', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', managerEmail: 'abraham.chien@choco.media' },
  { id: '26', email: 'sean.wang@choco.media', name: 'Sean Wang 王佑陞', role: 'DE/DA', department: 'Data', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sean', managerEmail: 'justin@choco.media' },
  { id: '27', email: 'shelly.zhu@choco.media', name: 'Shelly Zhu 朱怡璇', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Shelly', managerEmail: 'zen.chan@choco.media' },
  { id: '28', email: 'singhua.cai@choco.media', name: 'SingHua Cai 蔡幸樺', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SingHua', managerEmail: 'zen.chan@choco.media' },
  { id: '29', email: 'wei@choco.media', name: 'Wei Chang 張瑋康', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wei', isManager: true, managerEmail: 'abraham.chien@choco.media' },
  { id: '30', email: 'wen.peng@choco.media', name: 'Wen Peng 彭郁文', role: 'PM', department: 'Product', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wen', managerEmail: 'abraham.chien@choco.media' },
  { id: '31', email: 'wendy.hsiao@choco.media', name: 'Wendy Hsiao 蕭文婷', role: 'QA', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wendy', managerEmail: 'abraham.chien@choco.media' },
  { id: '32', email: 'yihsuan.kao@choco.media', name: 'Yihsuan Kao 高宜萱', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yihsuan', managerEmail: 'wei@choco.media' },
  { id: '33', email: 'yuchi.tan@choco.media', name: 'Yuchi Tan 譚宇淇', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yuchi', managerEmail: 'wei@choco.media' },
  { id: '34', email: 'yuchih.liu@choco.media', name: 'Yuchih Liu(A) 劉育志', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Yuchih', managerEmail: 'charlie.huang@choco.media' },
  { id: '35', email: 'zen.chan@choco.media', name: 'Zen Chan 陳嘉豪', role: 'Developer', department: 'Engineering', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zen', isManager: true, managerEmail: 'abraham.chien@choco.media' },
];

export const INITIAL_QUESTIONNAIRES: Questionnaire[] = [
  {
    id: '77777777-7777-7777-7777-777777777777',
    title: 'Choco360 - 卓越成長評鑑 (v2.0)',
    description: '專注於團隊協作、心理安全感與跨團隊補位能力。',
    active: true,
    createdAt: new Date().toISOString(),
    dimensions: [
      {
        id: 'd1',
        name: 'Team Work 與協作',
        purpose: '評估心理安全感與跨團隊補位能力。',
        questions: [
          { id: 'q1', text: '[心理安全感] 他/她是否專注於解決問題而非指責個人？', type: 'rating' },
          { id: 'q2', text: '請舉例說明他/她在過去三個月內，如何協助團隊解決突發危機？', type: 'text' }
        ]
      }
    ]
  },
  {
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: 'Nexus 360 - 卓越成長評鑑架構 (v2.0)',
    description: '整合量化指標與質性洞察，專為追求極致成長的團隊設計。',
    active: true,
    createdAt: new Date().toISOString(),
    dimensions: [
      {
        id: 'dim_tw',
        name: 'Team Work 與協作',
        purpose: '評估心理安全感與跨團隊補位能力。',
        questions: [
          { id: 'q_tw_1', text: '[心理安全感] 他/她是否專注於解決問題而非指責個人？', type: 'rating' },
          { id: 'q_tw_2', text: '請舉例說明他/她在過去三個月內，如何協助團隊解決突發危機？', type: 'text' }
        ]
      },
      {
        id: 'dim_pd',
        name: '產品思維與價值',
        purpose: '評估解決商業問題而非單純接單的能力。',
        questions: [
          { id: 'q_pd_1', text: '[知其所以然] 是否會主動詢問任務背後的價值？', type: 'rating' },
          { id: 'q_pd_2', text: '對於產品目前的方向，他/她是否提出過具建設性的質疑或優化建議？請簡述。', type: 'text' }
        ]
      }
    ]
  }
];

export const MOCK_FEEDBACK = [];
export const MOCK_NOMINATIONS = [];
