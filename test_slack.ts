import { slackService } from './services/slackService';
// Mock fetch to capture payload
global.fetch = async (url, options) => {
  console.log("PAYLOAD:", options.body);
  return { json: async () => ({ ok: true }) };
};

console.log("TESTING NOTIFICATION");
slackService.notifyManagerOfNomination("test@example.com", "Abe", "2026 Q1").catch(console.error);
