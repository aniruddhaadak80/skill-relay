import { createHash } from "node:crypto";
import { HARNESSES, type Compatibility, type EngineResult, type Harness, type ScoreFactor, type SkillRecord } from "./types";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left.localeCompare(right));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

export function sha384(value: string): string {
  return createHash("sha384").update(value).digest("hex");
}

export function analysisSeal(payload: unknown): string {
  return sha384(`GENESIS${canonicalJson(payload)}`);
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.-]+/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function overlap(taskTokens: string[], skillText: string): number {
  if (!taskTokens.length) return 0;
  const text = skillText.toLowerCase();
  const hits = taskTokens.filter((token) => text.includes(token)).length;
  return clamp((hits / taskTokens.length) * 100, 0, 100);
}

function freshnessFactor(lastmod: string): ScoreFactor {
  const parsed = Date.parse(lastmod);
  if (Number.isNaN(parsed)) {
    return { label: "Freshness", value: 42, weight: 15, detail: "No trustworthy date in the source record." };
  }
  const ageDays = Math.max(0, Math.floor((Date.now() - parsed) / 86_400_000));
  const value = clamp(100 - ageDays / 2.4, 0, 100);
  return { label: "Freshness", value: Math.round(value), weight: 15, detail: `${ageDays} days since the source snapshot.` };
}

function sourceFactor(skill: SkillRecord): ScoreFactor {
  let value = 30;
  if (skill.sourceUrl.includes("github.com")) value += 25;
  if (skill.author) value += 15;
  if (skill.license && skill.license !== "Unknown") value += 15;
  if (skill.sourceKind === "sealed-fallback") value -= 10;
  return {
    label: "Provenance",
    value: clamp(value, 0, 100),
    weight: 15,
    detail: skill.sourceUrl ? "Source URL, author, and license are present." : "Source provenance is incomplete.",
  };
}

function installFactor(skill: SkillRecord): ScoreFactor {
  const value = clamp(Math.log10(Math.max(skill.installs, 1)) * 24, 0, 100);
  return {
    label: "Adoption signal",
    value: Math.round(value),
    weight: 15,
    detail: `${skill.installs.toLocaleString()} public installs reported by the source.`,
  };
}

function taskFactor(skill: SkillRecord, task: string): ScoreFactor {
  const taskTokens = tokenize(task);
  const value = overlap(taskTokens, `${skill.name} ${skill.description} ${skill.category} ${skill.subcategory} ${skill.tags.join(" ")}`);
  return {
    label: "Task alignment",
    value: Math.round(value),
    weight: 35,
    detail: value > 0 ? "Matched task language against the skill metadata." : "No direct task vocabulary matched; review the source before use.",
  };
}

function compatibilityFactor(compatibility: Compatibility[]): ScoreFactor {
  const average = compatibility.length ? compatibility.reduce((sum, item) => sum + item.score, 0) / compatibility.length : 0;
  return {
    label: "Harness fit",
    value: Math.round(average),
    weight: 20,
    detail: compatibility.length ? `${compatibility.length} target harnesses mapped to a concrete install path.` : "No target harness selected.",
  };
}

function riskFactor(skill: SkillRecord, task: string): ScoreFactor {
  const text = `${task} ${skill.description} ${skill.name}`.toLowerCase();
  const risky = ["credential", "secret", "shell", "sudo", "production", "payment", "delete", "credential"].filter((word) => text.includes(word)).length;
  const value = clamp(100 - risky * 16, 35, 100);
  return {
    label: "Review surface",
    value,
    weight: 10,
    detail: risky ? "The task touches a sensitive capability; inspect permissions before execution." : "No sensitive capability words detected in the metadata.",
  };
}

function installPath(harness: Harness, skill: SkillRecord): { format: string; installPath: string; command: string } {
  const slug = skill.slug.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "relay-skill";
  switch (harness) {
    case "Claude Code":
      return { format: "SKILL.md", installPath: `.claude/skills/${slug}/SKILL.md`, command: `npx skills add ${skill.sourceUrl.replace("https://github.com/", "")} --skill ${slug}` };
    case "Codex":
      return { format: "SKILL.md", installPath: `.agents/skills/${slug}/SKILL.md`, command: `npx skills add ${skill.sourceUrl.replace("https://github.com/", "")} --skill ${slug}` };
    case "OpenClaw":
      return { format: "SKILL.md", installPath: `skills/${slug}/SKILL.md`, command: `npx skills add ${skill.sourceUrl.replace("https://github.com/", "")} --skill ${slug}` };
    case "Hermes Agent":
      return { format: "SKILL.md", installPath: `~/.hermes/skills/${slug}/SKILL.md`, command: `npx skills add ${skill.sourceUrl.replace("https://github.com/", "")} --skill ${slug}` };
    case "OpenCode":
      return { format: "SKILL.md", installPath: `.agents/skills/${slug}/SKILL.md`, command: `npx skills add ${skill.sourceUrl.replace("https://github.com/", "")} --skill ${slug}` };
    case "Gemini CLI":
      return { format: "SKILL.md", installPath: `.gemini/skills/${slug}/SKILL.md`, command: `npx skills add ${skill.sourceUrl.replace("https://github.com/", "")} --skill ${slug}` };
    case "Cursor":
      return { format: "MDC rule", installPath: `.cursor/rules/${slug}.mdc`, command: `npx skills add ${skill.sourceUrl.replace("https://github.com/", "")} --skill ${slug}` };
  }
}

export function compatibilityForSkill(skill: SkillRecord, selectedHarnesses: Harness[] = [...HARNESSES]): Compatibility[] {
  const text = `${skill.name} ${skill.description} ${skill.category} ${skill.tags.join(" ")}`.toLowerCase();
  const sourceBonus = skill.sourceUrl ? 5 : 0;
  const fallbackPenalty = skill.sourceKind === "sealed-fallback" ? 4 : 0;
  return selectedHarnesses.map((harness) => {
    const path = installPath(harness, skill);
    const keywordBonus = /mcp|api|cli|code|react|next|security|test|database/.test(text) ? 4 : 0;
    const score = clamp(78 + sourceBonus + keywordBonus - fallbackPenalty - (skill.license === "Unknown" ? 8 : 0));
    return {
      harness,
      score,
      format: path.format,
      installPath: path.installPath,
      command: path.command,
      reason: `${path.format} is the native relay format for ${harness}; the source stays linked for review.`,
    };
  });
}

export function scoreSkill(skill: SkillRecord, task: string, selectedHarnesses: Harness[] = [...HARNESSES]): EngineResult {
  const compatibility = compatibilityForSkill(skill, selectedHarnesses);
  const factors = [
    taskFactor(skill, task),
    freshnessFactor(skill.lastmod),
    sourceFactor(skill),
    installFactor(skill),
    compatibilityFactor(compatibility),
    riskFactor(skill, task),
  ];
  const weighted = factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0);
  const score = clamp(Math.round(weighted / 100));
  const recommendation = score >= 82 ? "strong-fit" : score >= 68 ? "good-fit" : "review-first";
  const payload = { task, skillId: skill.id, score, factors, compatibility };
  return { score, recommendation, factors, compatibility, seal: analysisSeal(payload), sealScope: "analysis-only" };
}

export function rankSkills(skills: SkillRecord[], task: string, harnesses: Harness[] = [...HARNESSES]): Array<{ skill: SkillRecord; result: EngineResult }> {
  return skills
    .map((skill) => ({ skill, result: scoreSkill(skill, task, harnesses) }))
    .sort((left, right) => right.result.score - left.result.score);
}
