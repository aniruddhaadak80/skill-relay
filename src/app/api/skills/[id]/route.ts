import { NextResponse } from "next/server";
import { getSkillBySlug } from "@/lib/catalog";
import { buildCopyBundle } from "@/lib/skill-copy";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const item = await getSkillBySlug(id);
  return item ? NextResponse.json({ item, copy: buildCopyBundle(item) }) : NextResponse.json({ error: "Skill not found" }, { status: 404 });
}
