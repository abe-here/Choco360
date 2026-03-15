
import { slackService } from './slackService';

/**
 * 測試腳本：執行此腳本來測試 Slack 通知是否能正確送達到 abraham.chien@choco.media
 */
async function testSlackConnection() {
  console.log('--- Slack 連線測試開始 ---');
  
  const testMessage = {
    text: '🚀 Choco360 Slack 通知開發測試',
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "🚀 Choco360 系統連線測試",
          emoji: true
        }
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "如果您看到這則訊息，代表 **Bot Token** 設定正確，且 **Developer Bypass** 已生效。\n目前所有系統通知都會轉向發送至此帳號。"
        }
      }
    ]
  };

  try {
    const result = await slackService.sendDirectMessageByEmail('test@example.com', testMessage);
    if (result) {
      console.log('✅ 測試訊息已送出，請檢查您的 Slack 私訊！');
    } else {
      console.error('❌ 測試失敗，請檢查 .env.local 中的 VITE_SLACK_BOT_TOKEN 是否正確。');
    }
  } catch (error) {
    console.error('💥 發生非預期錯誤:', error);
  }
}

// 供開發人員手動呼叫
(window as any).testSlack = testSlackConnection;
console.log('💡 已載入測試工具。請在瀏覽器 Console 輸入 `testSlack()` 來執行測試。');
