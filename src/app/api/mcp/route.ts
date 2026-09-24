import { NextResponse } from "next/server";
import { catalogSourceInfo, getCatalog, getSkillBySlug } from "@/lib/catalog";
import { buildCopyBundle } from "@/lib/skill-copy";
import { scoreSkill } from "@/lib/engine";
import { createPack, getStoreState, listPacks, updatePack, verifyAuditChain } from "@/lib/store";
import { parseHarnesses, parsePackInput, readJson } from "@/lib/validation";
import type { Harness } from "@/lib/types";

export const dynamic = "force-dynamic";

const tools = [
  { name: "search_skills", description: "Search the public skills.sh signal index and return normalized records.", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 96 } }, required: ["query"] } },
  { name: "resolve_skill", description: "Rank a public skill for a task and return explainable compatibility factors.", inputSchema: { type: "object", properties: { task: { type: "string" }, skillId: { type: "string" }, harnesses: { type: "array", items: { type: "string" } } }, required: ["task"] } },
  { name: "get_skill", description: "Return one exact public skill record plus the canonical human/agent copy bundle.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "get_skill_markdown", description: "Return the safe metadata-only SKILL.md relay manifest for one exact skill.", inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } },
  { name: "create_relay_pack", description: "Create a persisted cross-harness relay pack.", inputSchema: { type: "object", properties: { name: { type: "string" }, task: { type: "string" }, selectedSkillId: { type: "string" }, selectedSkillName: { type: "string" }, harnesses: { type: "array", items: { type: "string" } }, notes: { type: "string" } }, required: ["name", "task", "selectedSkillId", "selectedSkillName"] } },
  { name: "update_relay_pack", description: "Update an existing persisted relay pack and append an audit event.", inputSchema: { type: "object", properties: { id: { type: "string" }, name: { type: "string" }, task: { type: "string" }, status: { type: "string" }, notes: { type: "string" } }, required: ["id"] } },
  { name: "list_relay_packs", description: "List persisted relay packs.", inputSchema: { type: "object", properties: {} } },
  { name: "verify_audit_chain", description: "Replay the SHA-384 mutation seal chain.", inputSchema: { type: "object", properties: {} } },
  { name: "get_health", description: "Read service and persistence health.", inputSchema: { type: "object", properties: {} } },
];

function jsonRpc(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function toolResult(value: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }], structuredContent: value };
}

export async function POST(request: Request) {
  const body = readJson(await request.json());
  const id = body.id ?? null;
  const method = typeof body.method === "string" ? body.method : "";
  try {
    if (method === "initialize") {
      return NextResponse.json(jsonRpc(id, { protocolVersion: "2025-06-18", capabilities: { tools: { listChanged: false } }, serverInfo: { name: "skill-relay", version: "1.0.0" } }));
    }
    if (method === "tools/list") {
      return NextResponse.json(jsonRpc(id, { tools }));
    }
    if (method !== "tools/call") {
      return NextResponse.json(jsonRpcError(id, -32601, `Method not found: ${method}`));
    }
    const params = readJson(body.params);
    const name = typeof params.name === "string" ? params.name : "";
    const args = readJson(params.arguments);
    if (name === "search_skills") {
      const query = typeof args.query === "string" ? args.query : "";
      if (query.trim().length < 2) return NextResponse.json(jsonRpcError(id, -32602, "query must be at least two characters"));
      return NextResponse.json(jsonRpc(id, toolResult(await getCatalog({ query, limit: typeof args.limit === "number" ? args.limit : 20 }))));
    }
    if (name === "resolve_skill") {
      const task = typeof args.task === "string" ? args.task : "";
      if (!task.trim()) return NextResponse.json(jsonRpcError(id, -32602, "task is required"));
      const harnesses = parseHarnesses(args.harnesses) as Harness[];
      const catalog = await getCatalog({ query: typeof args.skillId === "string" ? args.skillId : task, limit: 8, harnesses });
      const skill = catalog.items[0];
      if (!skill) return NextResponse.json(jsonRpcError(id, -404, "No matching skill"));
      return NextResponse.json(jsonRpc(id, toolResult({ skill, ...scoreSkill(skill, task, harnesses.length ? harnesses : undefined) })));
    }
    if (name === "get_skill" || name === "get_skill_markdown") {
      const reference = typeof args.id === "string" ? args.id : "";
      if (!reference.trim()) return NextResponse.json(jsonRpcError(id, -32602, "id is required"));
      const skill = await getSkillBySlug(reference);
      if (!skill) return NextResponse.json(jsonRpcError(id, -404, "Skill not found"));
      const copy = buildCopyBundle(skill);
      return NextResponse.json(jsonRpc(id, toolResult(name === "get_skill_markdown" ? { id: skill.id, name: skill.name, markdown: copy.markdown, profileUrl: copy.profileUrl, sourceUrl: copy.sourceUrl, reviewRequired: true } : { skill, copy })));
    }
    if (name === "create_relay_pack") {
      const item = await createPack(parsePackInput(args));
      return NextResponse.json(jsonRpc(id, toolResult({ item })));
    }
    if (name === "update_relay_pack") {
      if (typeof args.id !== "string" || !args.id) return NextResponse.json(jsonRpcError(id, -32602, "id is required"));
      const item = await updatePack(args.id, parsePackInput(args, true));
      return NextResponse.json(jsonRpc(id, toolResult({ item })));
    }
    if (name === "list_relay_packs") {
      return NextResponse.json(jsonRpc(id, toolResult({ items: await listPacks() })));
    }
    if (name === "verify_audit_chain") {
      return NextResponse.json(jsonRpc(id, toolResult(await verifyAuditChain())));
    }
    if (name === "get_health") {
      return NextResponse.json(jsonRpc(id, toolResult({ status: "ok", store: await getStoreState(), catalog: catalogSourceInfo() })));
    }
    return NextResponse.json(jsonRpcError(id, -32601, `Tool not found: ${name}`));
  } catch (error) {
    return NextResponse.json(jsonRpcError(id, -32000, error instanceof Error ? error.message : "MCP request failed"));
  }
}
