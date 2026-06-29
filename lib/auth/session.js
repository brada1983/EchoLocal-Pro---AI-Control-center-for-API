// Stateless session cookie: a JWT (HS256) signed with SESSION_SECRET, carried
// in an httpOnly/Secure/SameSite=Lax cookie. No session table — verifying the
// signature is enough, so this works identically from server.js (the raw WS
// upgrade handler) and from Next API routes without sharing in-memory state.
const { SignJWT, jwtVerify } = require("jose");

const COOKIE_NAME = "echolocal_ai_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getSecretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET env var must be set to a random string of at least 16 characters"
    );
  }
  return new TextEncoder().encode(secret);
}

async function createSessionToken(username) {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS)
    .sign(getSecretKey());
}

/** @returns {Promise<{username: string} | null>} */
async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.username !== "string") return null;
    return { username: payload.username };
  } catch {
    return null;
  }
}

/** Parses a raw `Cookie` header value and returns this app's session token, if present. */
function extractSessionCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [key, ...rest] = part.trim().split("=");
    if (key === COOKIE_NAME) return rest.join("=");
  }
  return null;
}

function buildSessionCookie(token, { secure = true } = {}) {
  const attrs = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

function buildLogoutCookie({ secure = true } = {}) {
  const attrs = [`${COOKIE_NAME}=`, "HttpOnly", "Path=/", "SameSite=Lax", "Max-Age=0"];
  if (secure) attrs.push("Secure");
  return attrs.join("; ");
}

module.exports = {
  COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  extractSessionCookie,
  buildSessionCookie,
  buildLogoutCookie,
};
