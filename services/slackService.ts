
import { api } from './api';

/**
 * Slack Notification Service
 * Handles sending DMs and channel messages via Slack Web API (Block Kit)
 */

const SLACK_BOT_TOKEN = import.meta.env.VITE_SLACK_BOT_TOKEN;
const DEV_MODE_RECIPIENT = 'abraham.chien@choco.media'; // 開發者保護模式：所有通知僅發送給此 Email
const APP_URL = import.meta.env.VITE_APP_URL || 'https://choco360-ai-powered-feedback-system-1018914242387.us-west1.run.app';

export const slackService = {
  /**
   * Internal helper to call Slack Web API
   */
  /**
   * Internal helper to call Slack Web API
   */
  async callSlackAPI(method: string, payload: any, options: { useGet?: boolean } = {}) {
    if (!SLACK_BOT_TOKEN || SLACK_BOT_TOKEN.includes('your-bot-token')) {
      console.warn(`Slack token not configured. Skipping ${method} with payload:`, payload);
      return null;
    }

    try {
      let url = `/api/slack/${method}`;
      let fetchOptions: RequestInit = {
        headers: {
          'Authorization': `Bearer ${SLACK_BOT_TOKEN}`,
        }
      };

      if (options.useGet) {
        const params = new URLSearchParams(payload);
        url += `?${params.toString()}`;
        fetchOptions.method = 'GET';
      } else {
        fetchOptions.method = 'POST';
        (fetchOptions.headers as any)['Content-Type'] = 'application/json; charset=utf-8';
        fetchOptions.body = JSON.stringify(payload);
      }

      const response = await fetch(url, fetchOptions);
      const data = await response.json();
      
      if (!data.ok) {
        console.error(`Slack API error (${method}):`, data.error);
        return null;
      }
      return data;
    } catch (error) {
      console.error(`Slack API Fetch error (${method}):`, error);
      return null;
    }
  },

  /**
   * Finds Slack User ID by Email
   */
  async getUserIdByEmail(email: string): Promise<string | null> {
    const data = await this.callSlackAPI('users.lookupByEmail', { email }, { useGet: true });
    return data?.user?.id || null;
  },

  /**
   * Sends a Direct Message (DM) to a user by their email
   */
  async sendDirectMessageByEmail(email: string, message: { text: string; blocks?: any[] }) {
    // 開發階段保護：若在 localhost，一律轉向發送給 DEV_MODE_RECIPIENT，避免打擾真實員工
    const isLocalhost = typeof window !== 'undefined' && 
                        window.location && 
                        window.location.hostname === 'localhost';
    
    const targetEmail = isLocalhost ? DEV_MODE_RECIPIENT : email;
    
    if (isLocalhost) {
      console.info(`[Slack Service] DEV MODE: Original recipient ${email} rerouted to ${targetEmail}`);
    }

    const slackUserId = await this.getUserIdByEmail(targetEmail);
    if (!slackUserId) {
      console.warn(`Could not find Slack user for email: ${targetEmail}`);
      return;
    }

    return this.callSlackAPI('chat.postMessage', {
      channel: slackUserId,
      text: message.text,
      blocks: message.blocks,
    });
  },

  /**
   * Templates for specific events
   */
  async notifyManagerOfNomination(managerEmail: string, requesterName: string, title: string) {
    const text = `🔔 新的提名申請：${requesterName} 提交了「${title}」評量邀請`;
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🔔 新的提名申請待核准",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${requesterName}* 提交了評量週期：*${title}*\n請撥冗前往系統核准提名名單。\n\n👉 *<${APP_URL}|前往核准>*`
        }
      }
    ];

    return this.sendDirectMessageByEmail(managerEmail, { text, blocks });
  },

  async notifyReviewerOfNewTask(reviewerEmail: string, requesterName: string, title: string) {
    const text = `📝 您有一個新的評量任務：為 ${requesterName} 填寫回饋`;
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📝 收到新的評量邀請",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${requesterName}* 邀請您在「*${title}*」週期中提供回饋。\n\n👉 *<${APP_URL}|開始填寫>*`
        }
      }
    ];

    return this.sendDirectMessageByEmail(reviewerEmail, { text, blocks });
  },

  async notifyUserOfNewFeedback(userEmail: string, title: string) {
    const text = `✨ 您的 360 評量報告已更新！`;
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "✨ 收到新的回饋通知",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `您在「*${title}*」週期中收到了一筆新的同事回饋。\n\n👉 *<${APP_URL}|查看報告>*`
        }
      }
    ];

    return this.sendDirectMessageByEmail(userEmail, { text, blocks });
  },

  /**
   * Periodic Reminder for pending tasks
   */
  async notifyReviewerOfPendingTasks(reviewerEmail: string, taskCount: number, tasks: { requesterName: string; title: string }[]) {
    const text = `⏰ 提醒：您還有 ${taskCount} 項待完成的評量任務`;
    
    // Build a summary list of tasks
    const taskSummary = tasks.map(t => `• 為 *${t.requesterName}* 填寫 (*${t.title}*)`).join('\n');

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "⏰ 待處理評量任務提醒",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `您目前有 *${taskCount}* 項評量尚未完成：\n${taskSummary}\n\n*截止日期將至，請撥冗協助填寫！*\n\n👉 *<${APP_URL}|前往 Dashboard>*`
        }
      }
    ];

    return this.sendDirectMessageByEmail(reviewerEmail, { text, blocks });
  }
};
