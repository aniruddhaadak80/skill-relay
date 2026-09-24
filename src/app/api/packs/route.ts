import { NextResponse } from "next/server";
import { listPacks, createPack } from "@/lib/store";
import { parsePackInput, readJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ items: await listPacks() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to list packs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = parsePackInput(readJson(await request.json()));
    return NextResponse.json({ item: await createPack(input) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create pack" }, { status: 400 });
  }
}
