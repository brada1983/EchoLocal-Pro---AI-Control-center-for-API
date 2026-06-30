import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@db/client";
import { getSince } from "@db/queries/stats";
import { getHourlyRollup } from "@db/queries/requests";

const RANGE_SECONDS: Record<string, number> = {
  "1h": 3600,
  "24h": 86400,
  "7d": 7 * 86400,
};

function mockSystemSamples(range: string) {
  const now = Math.floor(Date.now() / 1000);
  const span = RANGE_SECONDS[range] ?? 3600;
  const points = 60;
  const step = span / points;
  return Array.from({ length: points }, (_, i) => {
    const ts = now - span + i * step;
    return {
      ts,
      cpu_pct: 30 + 20 * Math.sin(i / 5),
      ram_used_mb: 6200 + 400 * Math.sin(i / 7),
      gpu_util_pct: 40 + 30 * Math.abs(Math.sin(i / 4)),
      gpu_temp_c: 55 + 8 * Math.sin(i / 10),
    };
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ range: string }> }) {
  const { range } = await params;
  if (!RANGE_SECONDS[range]) {
    return NextResponse.json({ error: "Invalid range, use 1h|24h|7d" }, { status: 400 });
  }

  if (process.env.MOCK_COLLECTORS === "1") {
    return NextResponse.json({ system: mockSystemSamples(range), requests: { whisper: [], ollama: [] } });
  }

  const db = await getDb();
  const sinceTs = Math.floor(Date.now() / 1000) - RANGE_SECONDS[range];
  const system = getSince(db, sinceTs);
  const requests = {
    whisper: getHourlyRollup(db, "whisper", sinceTs),
    ollama: getHourlyRollup(db, "ollama", sinceTs),
  };
  return NextResponse.json({ system, requests });
}
