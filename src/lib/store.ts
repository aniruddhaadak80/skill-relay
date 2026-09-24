import { createHash, randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { scoreSkill } from "./engine";
import type { AuditEvent, Harness, RelayPack, RelayPackInput, StoreState } from "./types";

const memoryPacks: RelayPack[] = [];
const memoryAudit: AuditEvent[] = [];
let memorySeeded = false;
let databaseReady = false;
let state: StoreState = { mode: "memory" };

const defaultHarnesses: Harness[] = ["Claude Code", "Codex", "OpenClaw", "Hermes Agent", "OpenCode", "Gemini CLI", "Cursor"];

function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL;
  return value && value.startsWith("postgres") ? value : null;
}

function sqlClient() {
  const url = databaseUrl();
  return url ? neon(url) : null;
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}`;
}

function digest(value: string): string {
  return createHash("sha384").update(value).digest("hex");
}

function now(): string {
  return new Date().toISOString();
}

function seedMemory(): void {
  if (memorySeeded) return;
  memorySeeded = true;
  const createdAt = now();
  const skill = { id: "anthropics/skills/skill-creator", name: "skill-creator", description: "Author a portable SKILL.md with strong trigger language and useful resources.", lastmod: createdAt.slice(0, 10), sourceUrl: "https://github.com/anthropics/skills", license: "Source available", installs: 389500, sourceKind: "sealed-fallback" as const, category: "agents", subcategory: "authoring", tags: ["agents", "authoring"], author: "anthropics", authorUrl: "", catalogUrl: "https://skills.sh/anthropics/skills/skill-creator", slug: "skill-creator", live: false, compatibility: [] };
  const result = scoreSkill(skill, "Create a portable review workflow for our coding agents", defaultHarnesses);
  memoryPacks.push({ id: "relay_demo", name: "Portable review lane", task: "Create a portable review workflow for our coding agents", selectedSkillId: skill.id, selectedSkillName: skill.name, harnesses: defaultHarnesses, status: "ready", notes: "Starter pack for the live MCP proof.", score: result.score, seal: result.seal, createdAt, updatedAt: createdAt });
}

async function ensureDatabase(): Promise<ReturnType<typeof sqlClient>> {
  const sql = sqlClient();
  if (!sql) return null;
  if (!databaseReady) {
    await sql`CREATE TABLE IF NOT EXISTS relay_packs (id TEXT PRIMARY KEY, name TEXT NOT NULL, task TEXT NOT NULL, selected_skill_id TEXT NOT NULL, selected_skill_name TEXT NOT NULL, harnesses JSONB NOT NULL, status TEXT NOT NULL, notes TEXT NOT NULL, score INTEGER NOT NULL, seal TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, updated_at TIMESTAMPTZ NOT NULL)`;
    await sql`CREATE TABLE IF NOT EXISTS audit_events (id TEXT PRIMARY KEY, action TEXT NOT NULL, entity_id TEXT NOT NULL, actor TEXT NOT NULL, prev_seal TEXT NOT NULL, seal TEXT NOT NULL, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL)`;
    await sql`CREATE INDEX IF NOT EXISTS relay_packs_updated_at_idx ON relay_packs (updated_at DESC)`;
    databaseReady = true;
    state = { mode: "neon" };
  }
  return sql;
}

function normalizeInput(input: RelayPackInput, previous?: RelayPack): Required<RelayPackInput> {
  const harnesses = [...new Set((input.harnesses?.length ? input.harnesses : previous?.harnesses || defaultHarnesses).filter((item): item is Harness => defaultHarnesses.includes(item)))];
  return {
    name: String(input.name || previous?.name || "Untitled relay").trim().slice(0, 120),
    task: String(input.task || previous?.task || "Describe a task for an agent").trim().slice(0, 600),
    selectedSkillId: String(input.selectedSkillId || previous?.selectedSkillId || "unknown/skill").trim().slice(0, 240),
    selectedSkillName: String(input.selectedSkillName || previous?.selectedSkillName || "unknown-skill").trim().slice(0, 160),
    harnesses,
    status: input.status || previous?.status || "draft",
    notes: String(input.notes || previous?.notes || "").trim().slice(0, 1000),
  };
}

function memoryLatestSeal(): string {
  return memoryAudit.at(-1)?.seal || "GENESIS";
}

function appendMemoryAudit(action: AuditEvent["action"], entityId: string, payload: Record<string, unknown>): AuditEvent {
  const prevSeal = memoryLatestSeal();
  const event: AuditEvent = { id: `audit_${randomUUID()}`, action, entityId, actor: "workspace", prevSeal, seal: digest(`${prevSeal}${canonical(payload)}`), payload, createdAt: now() };
  memoryAudit.push(event);
  return event;
}

async function appendDatabaseAudit(sql: NonNullable<ReturnType<typeof sqlClient>>, action: AuditEvent["action"], entityId: string, payload: Record<string, unknown>): Promise<AuditEvent> {
  const previous = await sql`SELECT seal FROM audit_events ORDER BY created_at DESC, id DESC LIMIT 1`;
  const prevSeal = previous[0]?.seal || "GENESIS";
  const event: AuditEvent = { id: `audit_${randomUUID()}`, action, entityId, actor: "workspace", prevSeal, seal: digest(`${prevSeal}${canonical(payload)}`), payload, createdAt: now() };
  await sql`INSERT INTO audit_events (id, action, entity_id, actor, prev_seal, seal, payload, created_at) VALUES (${event.id}, ${event.action}, ${event.entityId}, ${event.actor}, ${event.prevSeal}, ${event.seal}, ${JSON.stringify(event.payload)}::jsonb, ${event.createdAt}::timestamptz)`;
  return event;
}

function toPack(row: Record<string, unknown>): RelayPack {
  return { id: String(row.id), name: String(row.name), task: String(row.task), selectedSkillId: String(row.selected_skill_id), selectedSkillName: String(row.selected_skill_name), harnesses: Array.isArray(row.harnesses) ? row.harnesses as Harness[] : JSON.parse(String(row.harnesses || "[]")), status: String(row.status) as RelayPack["status"], notes: String(row.notes || ""), score: Number(row.score || 0), seal: String(row.seal || ""), createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString() };
}

function toAudit(row: Record<string, unknown>): AuditEvent {
  return { id: String(row.id), action: String(row.action) as AuditEvent["action"], entityId: String(row.entity_id), actor: String(row.actor), prevSeal: String(row.prev_seal), seal: String(row.seal), payload: typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload as Record<string, unknown>, createdAt: new Date(String(row.created_at)).toISOString() };
}

export async function getStoreState(): Promise<StoreState> {
  seedMemory();
  const sql = await ensureDatabase();
  if (sql) {
    const count = await sql`SELECT COUNT(*)::int AS count FROM relay_packs`;
    if (!Number(count[0]?.count)) {
      const input = normalizeInput({ name: "Portable review lane", task: "Create a portable review workflow for our coding agents", selectedSkillId: "anthropics/skills/skill-creator", selectedSkillName: "skill-creator", harnesses: defaultHarnesses, status: "ready", notes: "Seeded starter pack for the live agent proof." });
      await createPack(input);
    }
  }
  return state;
}

export async function listPacks(): Promise<RelayPack[]> {
  seedMemory();
  const sql = await ensureDatabase();
  if (!sql) return [...memoryPacks].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const rows = await sql`SELECT * FROM relay_packs ORDER BY updated_at DESC, id DESC`;
  return rows.map((row) => toPack(row as Record<string, unknown>));
}

export async function getPack(id: string): Promise<RelayPack | null> {
  seedMemory();
  const sql = await ensureDatabase();
  if (!sql) return memoryPacks.find((pack) => pack.id === id) || null;
  const rows = await sql`SELECT * FROM relay_packs WHERE id = ${id} LIMIT 1`;
  return rows[0] ? toPack(rows[0] as Record<string, unknown>) : null;
}

export async function createPack(input: RelayPackInput): Promise<RelayPack> {
  seedMemory();
  const normalized = normalizeInput(input);
  const timestamp = now();
  const skill = { id: normalized.selectedSkillId, name: normalized.selectedSkillName, description: normalized.task, lastmod: timestamp.slice(0, 10), sourceUrl: "", license: "Unknown", installs: 0, sourceKind: "sealed-fallback" as const, category: "agent workflows", subcategory: "relay", tags: [], author: "workspace", authorUrl: "", catalogUrl: "", slug: normalized.selectedSkillName, live: false, compatibility: [] };
  const result = scoreSkill(skill, normalized.task, normalized.harnesses);
  const pack: RelayPack = { id: `relay_${randomUUID()}`, ...normalized, score: result.score, seal: result.seal, createdAt: timestamp, updatedAt: timestamp };
  const payload = { pack, analysisSeal: result.seal, factors: result.factors };
  const sql = await ensureDatabase();
  if (!sql) {
    memoryPacks.push(pack);
    appendMemoryAudit("create", pack.id, payload);
    return pack;
  }
  const event = await appendDatabaseAudit(sql, "create", pack.id, payload);
  await sql`INSERT INTO relay_packs (id, name, task, selected_skill_id, selected_skill_name, harnesses, status, notes, score, seal, created_at, updated_at) VALUES (${pack.id}, ${pack.name}, ${pack.task}, ${pack.selectedSkillId}, ${pack.selectedSkillName}, ${JSON.stringify(pack.harnesses)}::jsonb, ${pack.status}, ${pack.notes}, ${pack.score}, ${pack.seal}, ${pack.createdAt}::timestamptz, ${pack.updatedAt}::timestamptz)`;
  return { ...pack, seal: event.seal };
}

export async function updatePack(id: string, input: Partial<RelayPackInput>): Promise<RelayPack | null> {
  const previous = await getPack(id);
  if (!previous) return null;
  const normalized = normalizeInput({ ...previous, ...input }, previous);
  const timestamp = now();
  const skill = { id: normalized.selectedSkillId, name: normalized.selectedSkillName, description: normalized.task, lastmod: timestamp.slice(0, 10), sourceUrl: "", license: "Unknown", installs: 0, sourceKind: "sealed-fallback" as const, category: "agent workflows", subcategory: "relay", tags: [], author: "workspace", authorUrl: "", catalogUrl: "", slug: normalized.selectedSkillName, live: false, compatibility: [] };
  const result = scoreSkill(skill, normalized.task, normalized.harnesses);
  const pack: RelayPack = { ...previous, ...normalized, score: result.score, seal: result.seal, updatedAt: timestamp };
  const payload = { before: previous, after: pack, analysisSeal: result.seal };
  const sql = await ensureDatabase();
  if (!sql) {
    const index = memoryPacks.findIndex((item) => item.id === id);
    if (index >= 0) memoryPacks[index] = pack;
    appendMemoryAudit("update", id, payload);
    return pack;
  }
  const event = await appendDatabaseAudit(sql, "update", id, payload);
  await sql`UPDATE relay_packs SET name = ${pack.name}, task = ${pack.task}, selected_skill_id = ${pack.selectedSkillId}, selected_skill_name = ${pack.selectedSkillName}, harnesses = ${JSON.stringify(pack.harnesses)}::jsonb, status = ${pack.status}, notes = ${pack.notes}, score = ${pack.score}, seal = ${event.seal}, updated_at = ${pack.updatedAt}::timestamptz WHERE id = ${id}`;
  return { ...pack, seal: event.seal };
}

export async function deletePack(id: string): Promise<boolean> {
  const previous = await getPack(id);
  if (!previous) return false;
  const sql = await ensureDatabase();
  if (!sql) {
    const index = memoryPacks.findIndex((item) => item.id === id);
    if (index < 0) return false;
    memoryPacks.splice(index, 1);
    appendMemoryAudit("delete", id, { before: previous });
    return true;
  }
  await appendDatabaseAudit(sql, "delete", id, { before: previous });
  await sql`DELETE FROM relay_packs WHERE id = ${id}`;
  return true;
}

export async function listAudit(): Promise<AuditEvent[]> {
  seedMemory();
  const sql = await ensureDatabase();
  if (!sql) return [...memoryAudit];
  const rows = await sql`SELECT * FROM audit_events ORDER BY created_at ASC, id ASC`;
  return rows.map((row) => toAudit(row as Record<string, unknown>));
}

export async function verifyAuditChain(): Promise<{ valid: boolean; checked: number; brokenAt: string | null; head: string }> {
  const events = await listAudit();
  let previous = "GENESIS";
  for (const event of events) {
    const expected = digest(`${previous}${canonical(event.payload)}`);
    if (event.prevSeal !== previous || event.seal !== expected) return { valid: false, checked: events.length, brokenAt: event.id, head: previous };
    previous = event.seal;
  }
  return { valid: true, checked: events.length, brokenAt: null, head: previous };
}
