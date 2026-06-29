// Validates the session cookie during the HTTP `upgrade` event, before the
// `ws` server accepts the connection. An invalid/missing session gets a 401
// and the raw socket is destroyed — we never accept-then-disconnect, which
// would leak that the endpoint exists to unauthenticated probes.
const { extractSessionCookie, verifySessionToken } = require("../../lib/auth/session");

/** @returns {Promise<{username: string} | null>} */
async function authenticateUpgradeRequest(req) {
  const cookieHeader = req.headers["cookie"];
  const token = extractSessionCookie(cookieHeader);
  return verifySessionToken(token);
}

function rejectUpgrade(socket, status = 401, message = "Unauthorized") {
  socket.write(`HTTP/1.1 ${status} ${message}\r\n\r\n`);
  socket.destroy();
}

module.exports = { authenticateUpgradeRequest, rejectUpgrade };
