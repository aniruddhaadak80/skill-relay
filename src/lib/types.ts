export const HARNESSES = [
  "Claude Code",
  "Codex",
  "OpenClaw",
  "Hermes Agent",
  "OpenCode",
  "Gemini CLI",
  "Cursor",
] as const;

export type Harness = (typeof HARNESSES)[number];
export type SourceKind = "claudskills" | "skills.sh" | "sealed-fallback";
export type PackStatus = "draft" | "ready" | "needs-review";

export type Compatibility = {
  harness: Harness;
  score: number;
  format: string;
  installPath: string;
  command: string;
  reason: string;
};

export type SkillRecord = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  tags: string[];
  author: string;
  authorUrl: string;
  sourceUrl: string;
  catalogUrl: string;
  license: string;
  lastmod: string;
  installs: number;
  sourceKind: SourceKind;
  live: boolean;
  compatibility: Compatibility[];
};

export type ScoreFactor = {
  label: string;
  value: number;
  weight: number;
  detail: string;
};

export type EngineResult = {
  score: number;
  recommendation: "strong-fit" | "good-fit" | "review-first";
  factors: ScoreFactor[];
  compatibility: Compatibility[];
  seal: string;
  sealScope: "analysis-only";
};

export type RelayPack = {
  id: string;
  name: string;
  task: string;
  selectedSkillId: string;
  selectedSkillName: string;
  harnesses: Harness[];
  status: PackStatus;
  notes: string;
  score: number;
  seal: string;
  createdAt: string;
  updatedAt: string;
};

export type RelayPackInput = {
  name: string;
  task: string;
  selectedSkillId: string;
  selectedSkillName: string;
  harnesses: Harness[];
  status?: PackStatus;
  notes?: string;
};

export type AuditEvent = {
  id: string;
  action: "create" | "update" | "delete";
  entityId: string;
  actor: string;
  prevSeal: string;
  seal: string;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type CatalogResponse = {
  items: SkillRecord[];
  total: number;
  source: SourceKind;
  sourceLabel: string;
  live: boolean;
  fetchedAt: string;
  fallbackReason?: string;
};

export type StoreState = {
  mode: "neon" | "memory";
};
