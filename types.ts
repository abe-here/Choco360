
export interface Dimension {
  id: string;
  name: string;
  purpose: string;
  questions: Question[];
}

export type QuestionType = 'rating' | 'text';

export interface Question {
  id: string;
  dimensionId?: string;
  text: string;
  type: QuestionType;
}

export type SuperpowerCategory = 'strategic' | 'support' | 'leadership';

export interface Superpower {
  id: string; // generate a pseudo ID later
  title: string; // e.g. "THE SYNERGY ARCHITECT"
  category: SuperpowerCategory;
  description: string; // Why they got this
}

export type NominationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Nomination {
  id: string;
  requesterId: string;
  reviewerIds: string[];
  status: NominationStatus;
  managerId: string;
  title: string;
  questionnaireId: string;
  dueDate?: string;
  aiAnalysis?: AIAnalysis;
  analysisFeedbackCount?: number;
  createdAt: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  dimensions: Dimension[];
  active: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar: string;
  managerId?: string;
  managerEmail?: string;
  isSystemAdmin?: boolean;
  isManager?: boolean;
  motto?: string;
  unlockedSuperpowers?: Superpower[];
  activeSuperpowerId?: string;
  status?: 'active' | 'resigned';
}

export interface FeedbackResponse {
  questionId: string;
  score?: number;
  answerText?: string;
  dimensionName: string;
}

export interface FeedbackEntry {
  id: string;
  fromUserId: string;
  toUserId: string;
  questionnaireId: string;
  nominationId?: string; // 關聯到特定的評鑑邀請
  responses: FeedbackResponse[];
  stopComments: string;
  startComments: string;
  continueComments: string;
  timestamp: string;
}

export interface AIAnalysis {
  summary: string;
  strengths: string[];
  growthAreas: string[];
  actionPlan: string[];
  superpowers?: Superpower[];
}

export interface SystemMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export type NotificationStatus = 'sent' | 'failed';

export interface NotificationLog {
  id?: string;
  recipientEmail: string;
  notificationType: string;
  messageText: string;
  status: NotificationStatus;
  errorMessage?: string;
  createdAt?: string;
}

// === PRP 績效考核相關類型 ===

export interface PRPEvaluation {
  label: string; // 例如 "原主管", "新主管"
  comment: string;
  score?: number;
}

export interface PRPItem {
  id?: string;
  prpRecordId?: string;
  itemType: 'kpi' | 'core_competency';
  itemLabel: string;
  importance?: number;
  selfDescription: string;
  evaluations: PRPEvaluation[];
  itemRating?: string;
  sortOrder: number;
}

export interface PRPRecord {
  id: string;
  userId: string;
  period: string;
  department: string;
  jobTitle: string;
  employeeCode: string;
  overallSelfSummary: string;
  overallManagerComments: PRPEvaluation[];
  finalRating: string;
  interviewNotes?: string;
  source: 'import' | 'manual';
  items?: PRPItem[];
  createdAt: string;
}

// === 年度成長報告 (Year in Review) 相關類型 ===

export interface DivergenceAlert {
  topic: string;
  prpPerspective: string;
  peerPerspective: string;
  interpretation: string;
}

export interface RecommendedQuest {
  title: string;
  description: string;
  linkedOpportunity: string;
}

export interface YearInReview extends AIAnalysis {
  selfPeerGapInsight: string;
  divergenceAlerts: DivergenceAlert[];
  recommendedQuests: RecommendedQuest[];
}
