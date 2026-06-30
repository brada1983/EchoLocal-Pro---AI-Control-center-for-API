import { NextRequest, NextResponse } from "next/server";
import * as ollama from "@server/ollama-proxy";
import hub from "@server/ws/hub-instance";
import { pullProgressMessage } from "@server/ws/protocol";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const model = body?.model;
  if (typeof model !== "string" || !model.trim()) {
    return NextResponse.json({ error: "Missing model name" }, { status: 400 });
  }

  if (process.env.MOCK_COLLECTORS === "1") {
    mockPullProgress(model);
    return NextResponse.json({ ok: true, mock: true });
  }

  // Fire-and-forget: progress streams over the `pull:<model>` WS channel,
  // this response just confirms the pull was kicked off.
  ollama
    .pull(model, (progress: Record<string, unknown>) => {
      hub.broadcast(`pull:${model}`, pullProgressMessage({ model, ...progress }));
    })
    .catch((err) => {
      hub.broadcast(`pull:${model}`, pullProgressMessage({ model, status: "error", error: err.message }));
    });

  return NextResponse.json({ ok: true });
}

function mockPullProgress(model: string) {
  const steps = [
    { status: "pulling manifest" },
    { status: "downloading", completed: 25, total: 100 },
    { status: "downloading", completed: 60, total: 100 },
    { status: "downloading", completed: 100, total: 100 },
    { status: "verifying digest" },
    { status: "success" },
  ];
  steps.forEach((step, i) => {
    setTimeout(() => {
      hub.broadcast(`pull:${model}`, pullProgressMessage({ model, ...step }));
    }, i * 700);
  });
}
