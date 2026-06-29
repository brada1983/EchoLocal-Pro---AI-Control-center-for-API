import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { getUser } from "@db/queries/users";
import { verifyPassword } from "@rootlib/auth/password";
import { createSessionToken, buildSessionCookie } from "@rootlib/auth/session";
import { checkRateLimit } from "@rootlib/auth/rate-limit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many attempts, try again later" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const username = body?.username;
  const password = body?.password;
  if (typeof username !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  const db = await getDb();
  const user = getUser(db);
  if (!user) {
    return NextResponse.json({ error: "No admin user configured" }, { status: 500 });
  }

  const valid = user.username === username && (await verifyPassword(password, user.password_hash));
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createSessionToken(user.username);
  const res = NextResponse.json({ ok: true, username: user.username });
  res.headers.set("Set-Cookie", buildSessionCookie(token, { secure: req.nextUrl.protocol === "https:" }));
  return res;
}
