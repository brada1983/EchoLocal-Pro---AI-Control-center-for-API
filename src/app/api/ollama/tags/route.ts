import { NextResponse } from "next/server";
import * as ollama from "@server/ollama-proxy";

const MOCK_TAGS = {
  models: [
    { name: "llama3.2:latest", size: 2019393189, modified_at: new Date().toISOString() },
    { name: "aya-expanse:8b", size: 5400000000, modified_at: new Date().toISOString() },
  ],
};

export async function GET() {
  if (process.env.MOCK_COLLECTORS === "1") return NextResponse.json(MOCK_TAGS);
  try {
    const data = await ollama.tags();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
