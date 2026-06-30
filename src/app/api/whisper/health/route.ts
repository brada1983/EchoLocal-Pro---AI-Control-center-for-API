import { NextResponse } from "next/server";
import * as whisper from "@server/whisper-proxy";

export async function GET() {
  if (process.env.MOCK_COLLECTORS === "1") {
    return NextResponse.json({ status: "ok", device: "cpu", compute_type: "int8", model: "large-v3-turbo" });
  }
  try {
    const data = await whisper.health();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
