// Naive in-memory rate limit for the login route — fine for a single-admin,
// single-process app; resets on restart, which is an acceptable trade-off
// given there's no lockout mechanism otherwise.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map(); // ip -> {count, windowStart}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_ATTEMPTS) return false;
  entry.count += 1;
  return true;
}

module.exports = { checkRateLimit };
