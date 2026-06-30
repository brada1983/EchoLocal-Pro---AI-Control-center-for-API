function createConversation(db, model, title) {
  const now = Math.floor(Date.now() / 1000);
  const result = db
    .prepare(
      "INSERT INTO chat_conversations (title, model, created_at, updated_at) VALUES (?, ?, ?, ?)"
    )
    .run(title ?? null, model, now, now);
  return getConversation(db, Number(result.lastInsertRowid));
}

function listConversations(db, limit = 50) {
  return db
    .prepare("SELECT * FROM chat_conversations ORDER BY updated_at DESC LIMIT ?")
    .all(limit);
}

function getConversation(db, id) {
  return db.prepare("SELECT * FROM chat_conversations WHERE id = ?").get(id);
}

function renameConversation(db, id, title) {
  db.prepare("UPDATE chat_conversations SET title = ? WHERE id = ?").run(title, id);
}

function touchConversation(db, id) {
  db.prepare("UPDATE chat_conversations SET updated_at = ? WHERE id = ?").run(
    Math.floor(Date.now() / 1000),
    id
  );
}

function deleteConversation(db, id) {
  db.prepare("DELETE FROM chat_messages WHERE conversation_id = ?").run(id);
  db.prepare("DELETE FROM chat_conversations WHERE id = ?").run(id);
}

function insertMessage(db, conversationId, role, content, attachments) {
  const result = db
    .prepare(
      "INSERT INTO chat_messages (conversation_id, role, content, attachments, created_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(
      conversationId,
      role,
      content,
      attachments ? JSON.stringify(attachments) : null,
      Math.floor(Date.now() / 1000)
    );
  return Number(result.lastInsertRowid);
}

function getMessages(db, conversationId) {
  const rows = db
    .prepare("SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC")
    .all(conversationId);
  return rows.map((row) => ({
    ...row,
    attachments: row.attachments ? JSON.parse(row.attachments) : [],
  }));
}

module.exports = {
  createConversation,
  listConversations,
  getConversation,
  renameConversation,
  touchConversation,
  deleteConversation,
  insertMessage,
  getMessages,
};
