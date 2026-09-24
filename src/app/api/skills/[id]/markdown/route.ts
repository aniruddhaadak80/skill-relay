import { getSkillBySlug } from "@/lib/catalog";
import { buildCopyBundle } from "@/lib/skill-copy";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const skill = await getSkillBySlug(id);
  if (!skill) return new Response("Skill not found", { status: 404 });
  const bundle = buildCopyBundle(skill);
  return new Response(bundle.markdown, { headers: { "content-type": "text/markdown; charset=utf-8", "content-disposition": `inline; filename="${skill.slug}.md"`, "cache-control": "public, max-age=900", "x-review-required": "true" } });
}
