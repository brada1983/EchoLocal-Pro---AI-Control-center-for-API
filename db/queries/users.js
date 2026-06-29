function getUser(db) {
  return db.prepare("SELECT * FROM users WHERE id = 1").get();
}

function updatePassword(db, passwordHash) {
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = 1").run(
    passwordHash,
    Math.floor(Date.now() / 1000)
  );
}

module.exports = { getUser, updatePassword };
