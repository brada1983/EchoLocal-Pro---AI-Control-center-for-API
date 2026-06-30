import { NextResponse } from "next/server";
import * as whisper from "@server/whisper-proxy";

export async function GET() {
  if (process.env.MOCK_COLLECTORS === "1") {
    return NextResponse.json({ inflight: Math.random() < 0.3 ? 1 : 0, recent: [] });
  }
  const data = await whisper.metrics();
  if (!data) {
    return NextResponse.json({ error: "metrics endpoint unavailable (patch not applied yet?)" }, { status: 502 });
  }
  return NextResponse.json(data);
}
