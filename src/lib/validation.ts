import { HARNESSES, type Harness, type PackStatus, type RelayPackInput } from "./types";

export function parseHarnesses(value: unknown): Harness[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is Harness => typeof item === "string" && HARNESSES.includes(item as Harness)))];
}

export function parsePackInput(value: unknown, partial = false): RelayPackInput {
  if (!value || typeof value !== "object") throw new Error("Request body must be an object.");
  const body = value as Record<string, unknown>;
  const input: RelayPackInput = {
    name: typeof body.name === "string" ? body.name : partial ? "" : "Untitled relay",
    task: typeof body.task === "string" ? body.task : partial ? "" : "Describe a task for an agent",
    selectedSkillId: typeof body.selectedSkillId === "string" ? body.selectedSkillId : partial ? "" : "unknown/skill",
    selectedSkillName: typeof body.selectedSkillName === "string" ? body.selectedSkillName : partial ? "" : "unknown-skill",
    harnesses: parseHarnesses(body.harnesses),
    status: ["draft", "ready", "needs-review"].includes(String(body.status)) ? String(body.status) as PackStatus : partial ? undefined : "draft",
    notes: typeof body.notes === "string" ? body.notes : "",
  };
  if (!partial && (!input.name.trim() || !input.task.trim() || !input.selectedSkillId.trim())) throw new Error("name, task, and selectedSkillId are required.");
  return input;
}

export function readJson(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}
