"use client";

import { ArrowLeft, ExternalLink, FileDown, Loader2, Plus, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HARNESSES, type EngineResult, type SkillRecord } from "@/lib/types";
import { SkillCopyRail } from "./copy-button";
import { LoadingState, SourceBadge } from "./source-badge";

export function SkillDetail({ slug, initialSkill }: { slug: string; initialSkill?: SkillRecord | null }) {
  const router = useRouter();
  const [skill, setSkill] = useState<SkillRecord | null>(initialSkill || null);
  const [engine, setEngine] = useState<EngineResult | null>(null);
  const [loading, setLoading] = useState(!initialSkill);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSkill) return;
    let active = true;
    void fetch(`/api/skills/${encodeURIComponent(slug)}`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Skill not found");
      if (active) setSkill(data.item);
    }).catch((loadError) => { if (active) setError(loadError instanceof Error ? loadError.message : "Skill not found"); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [initialSkill, slug]);

  useEffect(() => {
    if (!skill) return;
    void fetch("/api/engine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: `Evaluate ${skill.name} for a production agent workflow`, skillId: skill.id, harnesses: HARNESSES }) }).then(async (response) => { if (response.ok) setEngine(await response.json() as EngineResult); });
  }, [skill]);

  async function createPack() {
    if (!skill) return;
    setCreating(true);
    try {
      const response = await fetch("/api/packs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: `${skill.name} relay`, task: `Route ${skill.name} into a production agent workflow`, selectedSkillId: skill.id, selectedSkillName: skill.name, harnesses: HARNESSES, notes: "Created from the public skill profile." }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create pack");
      router.push(`/packs/${data.item.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create pack");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <LoadingState label="Resolving public packet" />;
  if (!skill) return <div className="empty-state paper-card"><Sparkles size={24} /><strong>Packet unavailable.</strong><span>{error || "This skill could not be resolved."}</span><Link href="/explore" className="btn-secondary">Back to explorer</Link></div>;
  return <div className="stack-page skill-page">
    <div className="detail-back"><Link href="/explore"><ArrowLeft size={16} /> Back to explorer</Link><SourceBadge live={skill.live} label={skill.sourceKind === "sealed-fallback" ? "sealed fallback" : "public source"} /></div>
    <div className="skill-profile-hero"><div><span className="eyebrow">public skill profile / {skill.category}</span><h1>{skill.name}</h1><p>{skill.description}</p><div className="profile-links"><a href={skill.sourceUrl || skill.catalogUrl} target="_blank" rel="noreferrer" className="btn-secondary">Open upstream <ExternalLink size={15} /></a><a href={`/api/skills/${encodeURIComponent(skill.slug)}/markdown`} className="btn-secondary" download><FileDown size={15} /> Download preview</a><button type="button" className="btn-primary" onClick={() => void createPack()} disabled={creating}>{creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Create relay pack</button></div></div><div className="profile-score"><span>fit signal</span><strong>{engine?.score ?? "—"}</strong><small>{engine?.recommendation || "scoring…"}</small></div></div>
    {error ? <div className="notice-strip"><ShieldCheck size={15} />{error}</div> : null}
    <div className="profile-grid"><div className="profile-main"><section className="paper-card detail-section"><div className="section-heading"><div><span className="eyebrow">metadata</span><h2>Source record</h2></div><span className="score-chip">copy-first</span></div><div className="profile-metadata"><div><span>id</span><code>{skill.id}</code></div><div><span>author</span><b>{skill.author || "community"}</b></div><div><span>license</span><b>{skill.license || "unknown"}</b></div><div><span>last modified</span><b>{skill.lastmod || "recent"}</b></div><div><span>install signal</span><b>{skill.installs.toLocaleString()}</b></div><div><span>tags</span><b>{skill.tags.join(" · ") || "uncategorized"}</b></div></div></section><section className="paper-card detail-section"><div className="section-heading"><div><span className="eyebrow">relay preview</span><h2>What agents receive</h2></div><span className="score-chip">{engine?.score ?? "—"} fit</span></div><SkillCopyRail skill={skill} />{engine ? <div className="factor-list">{engine.factors.map((factor) => <div className="factor-row" key={factor.label}><div><b>{factor.label}</b><span>{factor.detail}</span></div><div className="factor-bar"><i style={{ width: `${factor.value}%` }} /></div><strong>{factor.value}</strong></div>)}</div> : <LoadingState label="Scoring compatibility" />}</section></div><aside className="profile-aside"><div className="paper-card install-card"><span className="eyebrow">native packet paths</span>{HARNESSES.map((harness) => { const entry = engine?.compatibility.find((item) => item.harness === harness); return <div className="profile-target" key={harness}><div><span className="harness-dot" /><b>{harness}</b></div><code>{entry?.installPath || "resolving…"}</code><strong>{entry?.score ?? "—"}</strong></div>; })}</div><div className="paper-card caution-card"><ShieldCheck size={20} /><h3>Review before execute.</h3><p>Skill Relay resolves metadata and install paths. It does not certify third-party instructions or bundled scripts.</p><a href="https://agentskills.io" target="_blank" rel="noreferrer" className="text-link">Read the open format <ExternalLink size={14} /></a></div></aside></div>
  </div>;
}
