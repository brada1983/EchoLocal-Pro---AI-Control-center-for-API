import { NextResponse } from "next/server";
import * as ollama from "@server/ollama-proxy";

const MOCK_PS = {
  models: [
    {
      name: "llama3.2:latest",
      size_vram: 2019393189,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
  ],
};

export async function GET() {
  if (process.env.MOCK_COLLECTORS === "1") return NextResponse.json(MOCK_PS);
  try {
    const data = await ollama.ps();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
