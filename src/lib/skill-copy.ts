import type { SkillRecord } from "./types";

export type SkillCopyBundle = {
  markdown: string;
  json: string;
  agentPayload: string;
  sourceUrl: string;
  profileUrl: string;
  markdownUrl: string;
  jsonUrl: string;
  reviewRequired: true;
};

function defaultBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "https://skill-relay-tau.vercel.app";
}

function cleanBaseUrl(value: string): string {
  return value.replace(/\/$/, "");
}

function oneLine(value: string): string {
  return value.replace(/\r?\n/g, " ").trim();
}

export function buildCopyBundle(skill: SkillRecord, baseUrl = defaultBaseUrl()): SkillCopyBundle {
  const base = cleanBaseUrl(baseUrl);
  const reference = encodeURIComponent(skill.slug);
  const sourceUrl = skill.sourceUrl || skill.catalogUrl;
  const profileUrl = `${base}/skill/${reference}`;
  const markdownUrl = `${base}/api/skills/${reference}/markdown`;
  const jsonUrl = `${base}/api/skills/${reference}`;
  const canonical = {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    sourceUrl,
    catalogUrl: skill.catalogUrl,
    profileUrl,
    markdownUrl,
    jsonUrl,
    license: skill.license,
    lastmod: skill.lastmod,
    compatibility: skill.compatibility,
    reviewRequired: true as const,
  };
  const markdown = [
    "---",
    `name: ${oneLine(skill.name)}`,
    `description: ${oneLine(skill.description)}`,
    `source: ${sourceUrl || "unavailable"}`,
    `catalog: ${skill.catalogUrl || "unavailable"}`,
    `profile: ${profileUrl}`,
    `license: ${oneLine(skill.license || "Unknown")}`,
    "review_required: true",
    "---",
    "",
    `# ${skill.name}`,
    "",
    skill.description,
    "",
    "## Relay paths",
    ...skill.compatibility.map((entry) => `- **${entry.harness}** — \`${entry.installPath}\` — ${entry.command}`),
    "",
    `Source: ${sourceUrl || "unavailable"}`,
    `Catalog: ${skill.catalogUrl || "unavailable"}`,
    "",
    "> Metadata-only relay manifest. Review the upstream source before executing any bundled instructions or scripts.",
    "",
  ].join("\n");
  const json = JSON.stringify({ ...skill, canonical }, null, 2);
  const agentPayload = JSON.stringify({
    type: "agent-skill-relay",
    version: 1,
    id: skill.id,
    name: skill.name,
    description: skill.description,
    sourceUrl,
    catalogUrl: skill.catalogUrl,
    profileUrl,
    markdownUrl,
    jsonUrl,
    license: skill.license,
    compatibility: skill.compatibility,
    reviewRequired: true,
  }, null, 2);
  return { markdown, json, agentPayload, sourceUrl, profileUrl, markdownUrl, jsonUrl, reviewRequired: true };
}
