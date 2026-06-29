import { NextResponse } from "next/server";
import { getServiceStatus, getMockServiceStatus } from "@server/collectors/service-status";

export async function GET() {
  const mock = process.env.MOCK_COLLECTORS === "1";
  const status = mock ? getMockServiceStatus() : await getServiceStatus();
  return NextResponse.json(status);
}
