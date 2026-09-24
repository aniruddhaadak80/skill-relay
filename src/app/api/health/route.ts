import { NextResponse } from "next/server";
import { catalogSourceInfo } from "@/lib/catalog";
import { getStoreState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const store = await getStoreState();
    return NextResponse.json({ status: "ok", service: "skill-relay", persistence: store.mode, catalog: catalogSourceInfo(), timestamp: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ status: "degraded", service: "skill-relay", error: error instanceof Error ? error.message : "store unavailable", timestamp: new Date().toISOString() }, { status: 503 });
  }
}
