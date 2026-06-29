import { NextRequest, NextResponse } from "next/server";
import { buildLogoutCookie } from "@rootlib/auth/session";

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", buildLogoutCookie({ secure: req.nextUrl.protocol === "https:" }));
  return res;
}
