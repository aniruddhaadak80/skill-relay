import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || undefined;
  const result = await getCatalog({ query, limit: Number(url.searchParams.get("limit") || 48), offset: Number(url.searchParams.get("offset") || 0) });
  return NextResponse.json(result);
}
