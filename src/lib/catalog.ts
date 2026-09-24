import { CATALOG_SOURCE, CATALOG_SOURCE_URL, CATALOG_TOTAL, FALLBACK_SKILLS, SKILLS_SH_SOURCE_URL, cloneFallbackSkills } from "./fallback";
import { compatibilityForSkill } from "./engine";
import { HARNESSES, type CatalogResponse, type Harness, type SkillRecord, type SourceKind } from "./types";

type SkillsShResponse = {
  skills?: Array<{
    id?: string;
    source?: string;
    skillId?: string;
    name?: string;
    installs?: number;
  }>;
};

type HuggingFaceResponse = {
  num_rows_total?: number;
  rows?: Array<{ row?: Record<string, unknown> }>;
};

type CacheEntry<T> = { expires: number; value: T };
const catalogCache = new Map<string, CacheEntry<CatalogResponse>>();
const recentSkillCache = new Map<string, CacheEntry<SkillRecord>>();
const skillCache = new Map<string, CacheEntry<SkillRecord | null>>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function tags(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 8) : [];
}

function slugFromId(id: string): string {
  const tail = id.split("/").pop() || id;
  return tail.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "skill";
}

function normalizeSkillSh(item: NonNullable<SkillsShResponse["skills"]>[number]): SkillRecord {
  const id = text(item.id, text(item.source, "unknown/source") + "/" + text(item.skillId, "unknown-skill"));
  const source = text(item.source, "unknown/source");
  const name = text(item.name, slugFromId(id));
  const slug = slugFromId(text(item.skillId, name));
  const installs = typeof item.installs === "number" ? item.installs : 0;
  const repository = source.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
  const githubUrl = source.includes("github.com/") || /^[^/]+\/[^/]+$/.test(repository) ? `https://github.com/${repository}` : "";
  const owner = repository.split("/")[0] || source;
  return {
    id,
    slug,
    name,
    description: `${name} is a public agent skill indexed by skills.sh.`,
    category: "agent workflows",
    subcategory: "cross-harness",
    tags: ["agent", "mcp", "public-skill"],
    author: owner,
    authorUrl: githubUrl ? `https://github.com/${owner}` : "",
    sourceUrl: githubUrl,
    catalogUrl: `https://skills.sh/${id}`,
    license: "See source",
    lastmod: new Date().toISOString().slice(0, 10),
    installs,
    sourceKind: "skills.sh",
    live: true,
    compatibility: [],
  };
}

function normalizeHuggingFace(row: Record<string, unknown>): SkillRecord {
  const slug = text(row.slug, text(row.name, "skill"));
  const sourceUrl = text(row.source_url);
  const id = sourceUrl || text(row.catalog_url, `claudskills/${slug}`);
  return {
    id,
    slug,
    name: text(row.name, slug),
    description: text(row.description, "A public agent skill record from the ClaudSkills mirror."),
    category: text(row.category, "general"),
    subcategory: text(row.subcategory, "agent workflows"),
    tags: tags(row.tags),
    author: text(row.author, "community"),
    authorUrl: text(row.author_url),
    sourceUrl,
    catalogUrl: text(row.catalog_url, `${CATALOG_SOURCE_URL}/skills/${slug}`),
    license: text(row.license, "Unknown"),
    lastmod: text(row.lastmod, new Date().toISOString().slice(0, 10)),
    installs: 0,
    sourceKind: "claudskills",
    live: true,
    compatibility: [],
  };
}

function withCompatibility(skill: SkillRecord, harnesses: Harness[]): SkillRecord {
  return { ...skill, compatibility: compatibilityForSkill(skill, harnesses) };
}

async function fetchJson<T>(url: string, revalidate: number): Promise<T> {
  const response = await fetch(url, { next: { revalidate }, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Upstream responded with ${response.status}`);
  return (await response.json()) as T;
}

function cacheCatalog(key: string, value: CatalogResponse): CatalogResponse {
  catalogCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
  for (const skill of value.items) {
    const expiry = Date.now() + CACHE_TTL_MS;
    recentSkillCache.set(skill.id.toLowerCase(), { expires: expiry, value: skill });
    recentSkillCache.set(skill.slug.toLowerCase(), { expires: expiry, value: skill });
  }
  return value;
}

function recentSkill(reference: string): SkillRecord | null {
  const entry = recentSkillCache.get(reference.toLowerCase());
  if (!entry || entry.expires < Date.now()) {
    if (entry) recentSkillCache.delete(reference.toLowerCase());
    return null;
  }
  return entry.value;
}

export async function getCatalog(options: { query?: string; limit?: number; offset?: number; harnesses?: Harness[] } = {}): Promise<CatalogResponse> {
  const query = options.query?.trim() || "";
  const limit = Math.min(Math.max(options.limit || 48, 1), 96);
  const offset = Math.max(options.offset || 0, 0);
  const harnesses = options.harnesses || ["Claude Code", "Codex", "OpenClaw", "Hermes Agent", "OpenCode", "Gemini CLI", "Cursor"];
  const cacheKey = `${query}|${limit}|${offset}|${harnesses.join(",")}`;
  const cached = catalogCache.get(cacheKey);
  if (cached && cached.expires >= Date.now()) return cached.value;
  const liveItems: SkillRecord[] = [];
  let total = CATALOG_TOTAL;
  let sourceKind: SourceKind = query ? "skills.sh" : "claudskills";
  let sourceLabel = query ? "skills.sh live search" : `${CATALOG_SOURCE} live rows`;
  let live = false;
  let fallbackReason: string | undefined;

  const results = await Promise.allSettled([
    query.length >= 2
      ? fetchJson<SkillsShResponse>(`https://skills.sh/api/search?q=${encodeURIComponent(query)}&limit=${limit}`, 900)
      : Promise.resolve({ skills: [] }),
    fetchJson<HuggingFaceResponse>(`https://datasets-server.huggingface.co/rows?dataset=claudskills%2Fskills&config=default&split=train&offset=${offset}&length=${Math.min(limit, 100)}`, 1800),
  ]);

  if (query.length >= 2 && results[0].status === "fulfilled") {
    const rows = results[0].value.skills || [];
    liveItems.push(...rows.map(normalizeSkillSh));
    live = liveItems.length > 0;
  }

  if (results[1].status === "fulfilled") {
    total = results[1].value.num_rows_total || CATALOG_TOTAL;
    const rows = results[1].value.rows || [];
    liveItems.push(...rows.map((item) => normalizeHuggingFace(item.row || {})));
    live = live || liveItems.length > 0;
  } else if (query.length >= 2 && results[0].status === "rejected") {
    fallbackReason = "Live search was unavailable; showing sealed offline records.";
  } else if (results[1].status === "rejected" && results[0].status !== "fulfilled") {
    fallbackReason = "Live catalog was unavailable; showing sealed offline records.";
  }

  if (!query && results[0].status === "fulfilled") {
    const popular = results[0].value.skills || [];
    if (popular.length) {
      liveItems.push(...popular.map(normalizeSkillSh));
      live = true;
      sourceKind = "skills.sh";
      sourceLabel = "skills.sh popularity + ClaudSkills mirror";
    }
  }

  if (!liveItems.length) {
    const fallback = cloneFallbackSkills();
    sourceKind = "sealed-fallback";
    sourceLabel = "sealed offline fallback";
    live = false;
    fallbackReason = fallbackReason || "Live sources were unavailable; showing sealed offline records.";
    return cacheCatalog(cacheKey, { items: fallback.slice(0, limit).map((skill) => withCompatibility(skill, harnesses)), total: CATALOG_TOTAL, source: sourceKind, sourceLabel, live, fetchedAt: new Date().toISOString(), fallbackReason });
  }

  const unique = new Map<string, SkillRecord>();
  for (const skill of liveItems) unique.set(skill.id, skill);
  const items = Array.from(unique.values()).slice(0, limit).map((skill) => withCompatibility(skill, harnesses));
  return cacheCatalog(cacheKey, { items, total, source: sourceKind, sourceLabel, live, fetchedAt: new Date().toISOString(), fallbackReason });
}

export async function getSkillBySlug(slug: string, harnesses?: Harness[]): Promise<SkillRecord | null> {
  let normalized: string;
  try {
    normalized = decodeURIComponent(slug).trim().toLowerCase();
  } catch {
    return null;
  }
  if (!normalized) return null;
  const targets = harnesses || [...HARNESSES];
  const cacheKey = `${normalized}|${targets.join(",")}`;
  const cached = skillCache.get(cacheKey);
  if (cached && cached.expires >= Date.now()) return cached.value ? withCompatibility(cached.value, targets) : null;
  const recent = recentSkill(normalized) || recentSkill(normalized.split("/").pop() || normalized);
  if (recent) {
    const resolved = withCompatibility(recent, targets);
    skillCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: resolved });
    return resolved;
  }
  const lookup = normalized.includes("/") ? normalized.split("/").pop() || normalized : normalized;
  const result = await getCatalog({ query: lookup, limit: 96, harnesses: targets });
  const exact = result.items.find((item) => item.id.toLowerCase() === normalized || item.slug.toLowerCase() === lookup || item.id.toLowerCase().endsWith(`/${lookup}`));
  if (exact) {
    skillCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: exact });
    return exact;
  }
  const fallback = cloneFallbackSkills().find((item) => item.id.toLowerCase() === normalized || item.slug.toLowerCase() === lookup || item.id.toLowerCase().endsWith(`/${lookup}`));
  const resolved = fallback ? withCompatibility(fallback, targets) : null;
  skillCache.set(cacheKey, { expires: Date.now() + CACHE_TTL_MS, value: resolved });
  return resolved;
}

export function catalogSourceInfo() {
  return { total: CATALOG_TOTAL, dataset: CATALOG_SOURCE, datasetUrl: CATALOG_SOURCE_URL, searchUrl: SKILLS_SH_SOURCE_URL, fallbackCount: FALLBACK_SKILLS.length };
}
