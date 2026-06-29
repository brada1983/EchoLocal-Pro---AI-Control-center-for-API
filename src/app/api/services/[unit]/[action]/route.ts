import { NextRequest, NextResponse } from "next/server";
import { runSystemctl } from "@server/systemctl/control";
import { isAllowed } from "@server/systemctl/allowlist";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ unit: string; action: string }> }
) {
  const { unit, action } = await params;

  if (!isAllowed(unit, action)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 400 });
  }
  if (process.env.MOCK_COLLECTORS === "1") {
    return NextResponse.json({ ok: true, mock: true });
  }

  try {
    await runSystemctl(action, unit);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
