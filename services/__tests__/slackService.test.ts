import { describe, it, expect, vi, beforeEach } from 'vitest';
import { slackService } from '../slackService';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('slackService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default success response for fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, user: { id: 'U123' } }),
    });
  });

  describe('callSlackAPI', () => {
    it('應能正確發送 POST 請求', async () => {
      const payload = { channel: 'C1', text: 'hi' };
      await slackService.callSlackAPI('chat.postMessage', payload);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/slack/chat.postMessage',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(payload),
          headers: expect.objectContaining({
            'Content-Type': 'application/json; charset=utf-8',
          }),
        })
      );
    });

    it('應能正確發送 GET 請求 (使用 URLSearchParams)', async () => {
      const payload = { email: 'test@example.com' };
      await slackService.callSlackAPI('users.lookupByEmail', payload, { useGet: true });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/slack/users.lookupByEmail?email=test%40example.com'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('當 Slack 回傳 ok: false 時應返回 null 並記錄錯誤', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: false, error: 'invalid_auth' }),
      });

      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await slackService.callSlackAPI('any', {});
      
      expect(result).toBeNull();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Slack API error'), 'invalid_auth');
      spy.mockRestore();
    });

    it('當 fetch 拋出異常時應返回 null 並記錄錯誤', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = await slackService.callSlackAPI('any', {});
      expect(result).toBeNull();
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('Slack API Fetch error'), expect.anything());
      spy.mockRestore();
    });
  });

  describe('getUserIdByEmail', () => {
    it('應回傳用戶 ID', async () => {
      const id = await slackService.getUserIdByEmail('test@choco.media');
      expect(id).toBe('U123');
    });

    it('找不到用戶時應回傳 null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, user: null }),
      });
      const id = await slackService.getUserIdByEmail('none@test.com');
      expect(id).toBeNull();
    });
  });

  describe('sendDirectMessageByEmail', () => {
    it('在非 localhost 環境下應發送給原始收件人', async () => {
      // 模擬非 localhost
      vi.stubGlobal('location', { hostname: 'choco360.com' });
      
      await slackService.sendDirectMessageByEmail('user@example.com', { text: 'hello' });
      
      // 第 1 次 fetch 是 lookupByEmail
      expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('email=user%40example.com'), any());
    });

    it('在 localhost 環境下應轉寄給開發者信箱', async () => {
      // 模擬 localhost
      vi.stubGlobal('location', { hostname: 'localhost' });
      
      await slackService.sendDirectMessageByEmail('user@example.com', { text: 'hello' });
      
      // 應改為查詢 abraham.chien@choco.media (DEV_MODE_RECIPIENT)
      expect(mockFetch).toHaveBeenNthCalledWith(1, expect.stringContaining('email=abraham.chien%40choco.media'), any());
    });
  });

  describe('Notification Templates', () => {
    it('notifyManagerOfNomination 應包含正確的申請人名稱與標題', async () => {
      await slackService.notifyManagerOfNomination('mgr@test.com', '王小明', '2024 Q1');
      const body = getLatestSlackBody();
      expect(body.blocks[1].text.text).toContain('王小明');
      expect(body.blocks[1].text.text).toContain('2024 Q1');
    });

    it('notifyReviewerOfNewTask 應包含正確的邀請人名稱', async () => {
      await slackService.notifyReviewerOfNewTask('rv@test.com', '李四', '績效評估');
      const body = getLatestSlackBody();
      expect(body.blocks[1].text.text).toContain('李四');
      expect(body.blocks[1].text.text).toContain('績效評估');
    });

    it('notifyUserOfNewFeedback 應包含正確的週期標題', async () => {
      await slackService.notifyUserOfNewFeedback('me@test.com', '年度大會');
      const body = getLatestSlackBody();
      expect(body.blocks[1].text.text).toContain('年度大會');
    });

    it('notifyReviewerOfPendingTasks 應列出所有待辦任務', async () => {
      const tasks = [
        { requesterName: 'A', title: 'T1' },
        { requesterName: 'B', title: 'T2' }
      ];
      await slackService.notifyReviewerOfPendingTasks('rv@test.com', 2, tasks);
      const body = getLatestSlackBody();
      expect(body.blocks[1].text.text).toContain('A');
      expect(body.blocks[1].text.text).toContain('B');
      expect(body.blocks[1].text.text).toContain('2');
    });
  });
});

function getLatestSlackBody() {
  const mockFetch = vi.mocked(fetch);
  const lastCall = mockFetch.mock.calls.find(call => call[0] === '/api/slack/chat.postMessage');
  return JSON.parse(lastCall![1]!.body as any);
}

function any() {
  return expect.anything();
}
