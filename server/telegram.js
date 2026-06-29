// Sends alert notifications via the Telegram Bot API. Token/chat id come
// from alert_config (set via the Alerts settings page) with env vars as a
// fallback for first-boot/testing before the UI has been used.
async function sendMessage(db, text) {
  const { getConfig } = require("../db/queries/alerts");
  const config = getConfig(db);
  const token = config.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = config.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("[telegram] no bot token/chat id configured, skipping alert:", text);
    return;
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) {
    console.error("[telegram] sendMessage failed:", res.status, await res.text());
  }
}

module.exports = { sendMessage };
