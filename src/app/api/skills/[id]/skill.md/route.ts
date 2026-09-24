import { getSkillBySlug } from "@/lib/catalog";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const { id } = await context.params;
  const skill = await getSkillBySlug(id);
  if (!skill) return new Response("Skill not found", { status: 404 });
  const content = `---\nname: ${skill.name}\ndescription: ${skill.description}\nsource: ${skill.sourceUrl || skill.catalogUrl}\nlicense: ${skill.license}\n---\n\n# ${skill.name}\n\n${skill.description}\n\nSource: ${skill.sourceUrl || skill.catalogUrl}\nCatalog: ${skill.catalogUrl}\n\nThis relay preview is metadata-only. Review the upstream source before executing any bundled instructions or scripts.\n`;
  return new Response(content, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=900" } });
}
