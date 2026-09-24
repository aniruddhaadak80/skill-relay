import { NextResponse } from "next/server";
import { listAudit, verifyAuditChain } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [events, chain] = await Promise.all([listAudit(), verifyAuditChain()]);
    return NextResponse.json({ events, chain });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to read audit" }, { status: 500 });
  }
}
