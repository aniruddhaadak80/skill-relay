import { NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { scoreSkill } from "@/lib/engine";
import { parseHarnesses, readJson } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = readJson(await request.json());
    const task = typeof body.task === "string" ? body.task.trim() : "";
    if (!task) return NextResponse.json({ error: "task is required" }, { status: 400 });
    const harnesses = parseHarnesses(body.harnesses);
    const query = typeof body.skillId === "string" ? body.skillId : task;
    const catalog = await getCatalog({ query, limit: 8, harnesses });
    const skill = catalog.items[0];
    if (!skill) return NextResponse.json({ error: "No matching public skill was found." }, { status: 404 });
    const result = scoreSkill(skill, task, harnesses.length ? harnesses : undefined);
    return NextResponse.json({ skill, ...result, catalog: { total: catalog.total, source: catalog.source, sourceLabel: catalog.sourceLabel, live: catalog.live } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to score skill" }, { status: 400 });
  }
}
