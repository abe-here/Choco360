import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../api';
import { supabase } from '../supabase';
import { slackService } from '../slackService';

// 更強大的 Supabase Mock 產生器
const createMockSupabaseChain = () => {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    // 雖然 Supabase 是 thenable，但在測試中通常直接 mock 底層終端節點（如 single, select）的回傳值即可
    // 如果直接 await select()，Vitest 會調用 then
    then: vi.fn((resolve) => resolve({ data: [], error: null })),
  };
  return chain;
};

const mockChain = createMockSupabaseChain();

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithOAuth: vi.fn(),
      getSession: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(() => mockChain),
  },
}));

vi.mock('../slackService', () => ({
  slackService: {
    notifyManagerOfNomination: vi.fn().mockResolvedValue(true),
    notifyReviewerOfNewTask: vi.fn().mockResolvedValue(true),
    notifyUserOfNewFeedback: vi.fn().mockResolvedValue(true),
    notifyReviewerOfPendingTasks: vi.fn().mockResolvedValue(true),
  },
}));

describe('api service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重設 mockChain 的所有方法
    Object.values(mockChain).forEach((m: any) => {
      if (m._isMockFunction) m.mockClear();
    });
    // 預設行為
    mockChain.then.mockImplementation((resolve) => resolve({ data: [], error: null }));
    mockChain.single.mockResolvedValue({ data: null, error: null });
    mockChain.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  describe('Auth', () => {
    it('getCurrentUser: 當 Session 存在且網域正確時應回傳 profile', async () => {
      const mockSession = { user: { email: 'test@choco.media' } };
      const mockProfile = { id: 'u1', name: 'Test User', email: 'test@choco.media', role: 'Dev', department: 'Eng', is_system_admin: false, is_manager: false };
      
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: mockSession }, error: null });
      mockChain.maybeSingle.mockResolvedValue({ data: mockProfile, error: null });

      const user = await api.getCurrentUser();

      expect(user).not.toBeNull();
      expect(user?.email).toBe('test@choco.media');
    });

    it('getCurrentUser: 當網域不正確時應自動登出並拋錯', async () => {
      (supabase.auth.getSession as any).mockResolvedValue({ data: { session: { user: { email: 'hacker@gmail.com' } } }, error: null });
      await expect(api.getCurrentUser()).rejects.toThrow('受信任的企業帳號');
    });
  });

  describe('User Management', () => {
    it('getUsers: 應回傳所有使用者列表', async () => {
      mockChain.then.mockImplementation((resolve) => resolve({ data: [{ id: 'u1', name: 'A' }], error: null }));
      const result = await api.getUsers();
      expect(result[0].name).toBe('A');
    });

    it('updateUser: 現有使用者應呼叫 update', async () => {
      const existingUser = { id: '12345678-1234-1234-1234-123456789012', name: 'Oldie' };
      mockChain.single.mockResolvedValue({ data: { ...existingUser }, error: null });
      await api.updateUser(existingUser);
      expect(mockChain.update).toHaveBeenCalled();
    });
  });

  describe('Questionnaires', () => {
    it('getQuestionnaires: 應正確對接聯表查詢並格式化回傳', async () => {
      const mockData = [
        { id: 'q1', title: 'T1', dimensions: [{ id: 'd1', name: 'N1', questions: [{ id: 'qu1', text: 'Q1' }] }] }
      ];
      mockChain.then.mockImplementation((resolve) => resolve({ data: mockData, error: null }));

      const result = await api.getQuestionnaires();
      expect(result[0].title).toBe('T1');
    });

    it('upsertQuestionnaire: 應能處理新增問卷與維度更新', async () => {
      const q = { title: 'New', dimensions: [{ id: 'd-new', name: 'D1', purpose: 'P1', questions: [] }] };
      mockChain.single.mockResolvedValue({ data: { id: 'q-new' }, error: null });
      mockChain.then.mockImplementation((resolve) => resolve({ data: [], error: null })); // old dimensions
      
      await api.upsertQuestionnaire(q);
      
      expect(mockChain.upsert).toHaveBeenCalled();
      expect(mockChain.insert).toHaveBeenCalled(); // for dimensions
    });

    it('getAllNominations: 應回傳提名列表', async () => {
      mockChain.then.mockImplementation((resolve) => resolve({ data: [{ id: 'n1', title: 'T1' }], error: null }));
      const result = await api.getAllNominations();
      expect(result[0].title).toBe('T1');
    });

    it('updateNomination: Approved 狀態應觸發 Slack 通知評審員', async () => {
      // updateNomination 流程：
      // 1. update(...) -> then
      // 2. select(...).single() -> single
      // 3. select(...).in(...) -> then
      // 4. select(...).single() -> single
      
      mockChain.then
        .mockImplementationOnce((resolve) => resolve({ error: null })) // update call
        .mockImplementationOnce((resolve) => resolve({ data: [{ email: 'rv@test.com' }], error: null })); // reviewers select
        
      mockChain.single
        .mockResolvedValueOnce({ data: { reviewer_ids: ['u2'], title: 'T1', requester_id: 'u1' }, error: null }) // nomination info
        .mockResolvedValueOnce({ data: { name: 'Req' }, error: null }); // requester info

      await api.updateNomination('n1', { status: 'Approved' });
      
      expect(slackService.notifyReviewerOfNewTask).toHaveBeenCalledWith('rv@test.com', 'Req', 'T1');
    });

    it('getNominationTasks: 應過濾已填寫過的回饋並回傳任務', async () => {
      mockChain.then
        .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'n1', status: 'Approved' }], error: null })) // approved noms
        .mockImplementationOnce((resolve) => resolve({ data: [], error: null })); // finished feedbacks

      const tasks = await api.getNominationTasks('u1');
      expect(tasks.length).toBe(1);
    });
  });

  describe('Feedbacks & Reminders', () => {
    it('logNotification: 應儲存通知日誌', async () => {
      const log = { recipientEmail: 'm@t.com', notificationType: 'T1', messageText: 'M1', status: 'sent' as const };
      await api.logNotification(log);
      expect(mockChain.insert).toHaveBeenCalledWith(expect.objectContaining({ recipient_email: 'm@t.com' }));
    });

    it('submitFeedback: 應儲存回饋並觸發 Slack 通知受評者', async () => {
      const entry = { fromUserId: 'u1', toUserId: 'u2', questionnaireId: 'q1', responses: [] };
      mockChain.single.mockResolvedValue({ data: { id: 'fb1' }, error: null });
      
      // 注意：api.ts 中連續呼叫了三次 supabase.from
      // 1. insert feedback
      // 2. select receiver profile
      // 3. select questionnaire title
      mockChain.single
        .mockResolvedValueOnce({ data: { id: 'fb1' }, error: null }) // submitFeedback insert
        .mockResolvedValueOnce({ data: { email: 'rcv@test.com' }, error: null }) // receiver email
        .mockResolvedValueOnce({ data: { title: 'Q1 Title' }, error: null }); // questionnaire title

      await api.submitFeedback(entry as any);
      expect(slackService.notifyUserOfNewFeedback).toHaveBeenCalledWith('rcv@test.com', 'Q1 Title');
    });

    it('sendBatchReminders: 應正確識別 Pending 狀態並通知 Manager', async () => {
      const mockNominations = [{ id: 'n1', status: 'Pending', manager_email: 'mgr@test.com', requester_id: 'r1', title: 'T1' }];
      
      // sendBatchReminders 流程中有多個 await call
      mockChain.then
        .mockImplementationOnce((resolve) => resolve({ data: mockNominations, error: null })) // nominations
        .mockImplementationOnce((resolve) => resolve({ data: [], error: null })) // feedback
        .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'r1', name: 'Requester A' }], error: null })); // profiles

      const result = await api.sendBatchReminders();
      expect(result.sent).toBe(1);
    });

    it('sendReminderForNomination: 應針對未填寫者發送催繳通知', async () => {
      mockChain.single.mockResolvedValueOnce({ data: { id: 'n1', status: 'Approved', reviewer_ids: ['u2'], requester_id: 'r1', title: 'T1' }, error: null });
      mockChain.then
        .mockImplementationOnce((resolve) => resolve({ data: [], error: null })) // feedbacks
        .mockImplementationOnce((resolve) => resolve({ data: [{ id: 'u2', email: 'u2@t.com' }, { id: 'r1', name: 'Req' }], error: null })); // profiles

      const result = await api.sendReminderForNomination('n1');
      expect(result.sent).toBe(1);
      expect(slackService.notifyReviewerOfPendingTasks).toHaveBeenCalledWith('u2@t.com', 1, expect.anything());
    });

    it('getNotificationLogs: 應回傳日誌列表', async () => {
      mockChain.then.mockImplementationOnce((resolve) => resolve({ data: [{ id: 'l1' }], error: null }));
      const logs = await api.getNotificationLogs();
      expect(logs.length).toBe(1);
    });

    it('updateAvatar & deleteUser & deleteNomination: 應正確呼叫對應 API', async () => {
      await api.updateAvatar('u1', 'url');
      expect(mockChain.update).toHaveBeenCalled();
      
      await api.deleteUser('u1');
      expect(mockChain.delete).toHaveBeenCalled();
      
      await api.deleteNomination('n1');
      expect(mockChain.delete).toHaveBeenCalled();
    });

    it('getFeedbacksByNominationIds: 應過濾並回傳對應的回饋', async () => {
      mockChain.then.mockImplementationOnce((resolve) => resolve({ data: [{ nomination_id: 'n1' }], error: null }));
      const result = await api.getFeedbacksByNominationIds(['n1']);
      expect(result.length).toBe(1);
    });

    it('clearNotificationLogs: 應刪除所有日誌', async () => {
      await api.clearNotificationLogs();
      expect(mockChain.delete).toHaveBeenCalled();
    });
  });

  describe('Complex Feedback logic', () => {
    it('submitFeedback: 應包含維度評分資料', async () => {
      const entry = { 
        fromUserId: 'u1', toUserId: 'u2', questionnaireId: 'q1', 
        responses: [{ questionId: 'qu1', score: 5, answerText: 'A1', dimensionName: 'D1' }] 
      };
      // 1. insert feedback, 2. select receiver, 3. select questionnaire, 4. insert responses
      mockChain.single.mockResolvedValue({ data: { id: 'fb1' }, error: null });
      mockChain.then.mockImplementation((resolve) => resolve({ data: [], error: null }));
      
      await api.submitFeedback(entry as any);
      expect(mockChain.insert).toHaveBeenCalledTimes(2); // 1 for feedback, 1 for responses
    });
  });
});
