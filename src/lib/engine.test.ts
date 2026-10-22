import { describe, expect, it } from "vitest";
import { scoreSkill } from "./engine";
import type { SkillRecord } from "./types";

const skill: SkillRecord = {
  id: "probe",
  slug: "probe-skill",
  name: "Probe skill",
  description: "A neutral skill description for probing.",
  category: "devops",
  subcategory: "ci",
  tags: ["pipeline"],
  author: "Author",
  license: "MIT",
  sourceUrl: "https://github.com/example/repo",
  sourceKind: "github",
  installs: 1000,
  lastmod: new Date().toISOString(),
  compatibility: [],
} as unknown as SkillRecord;

describe("scoring engine", () => {
  it("reports a score that is the weighted average of the factors it publishes", () => {
    const result = scoreSkill(skill, "pipeline");
    const weighted = result.factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0);
    const weightTotal = result.factors.reduce((sum, factor) => sum + factor.weight, 0);
    expect(weightTotal).toBe(110);
    expect(result.score).toBe(Math.round(weighted / weightTotal));
  });

  it("does not double count a repeated sensitive keyword", () => {
    const withCredential = scoreSkill(skill, "rotate a credential for the pipeline");
    const withSecret = scoreSkill(skill, "rotate a secret for the pipeline");
    const risk = (result: typeof withCredential) =>
      result.factors.find((factor) => factor.label === "Review surface")?.value;
    // "credential" must be penalised exactly like every other sensitive word.
    expect(risk(withCredential)).toBe(risk(withSecret));
  });

  it("treats every sensitive keyword the same way", () => {
    const values = ["credential", "secret", "shell", "sudo", "production", "payment", "delete"].map(
      (word) =>
        scoreSkill(skill, `handle a ${word} in the pipeline`).factors.find(
          (factor) => factor.label === "Review surface"
        )?.value
    );
    expect(new Set(values).size).toBe(1);
  });
});
