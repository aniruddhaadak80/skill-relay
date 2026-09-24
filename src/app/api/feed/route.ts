import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";

export const revalidate = 900;

export async function GET() {
  const result = await getCatalog({ limit: 48 });
  return NextResponse.json(result);
}
