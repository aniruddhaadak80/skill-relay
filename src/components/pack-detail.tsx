"use client";

import { ArrowLeft, Check, Clipboard, Download, ExternalLink, FileJson, Loader2, Pencil, Save, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { Compatibility, EngineResult, PackStatus, RelayPack, SkillRecord } from "@/lib/types";
import { HARNESSES } from "@/lib/types";
import { copyText, SkillCopyRail } from "./copy-button";
import { LoadingState } from "./source-badge";

function pathFor(harness: string, slug: string): string {
  if (harness === "Cursor") return `.cursor/rules/${slug}.mdc`;
  if (harness === "OpenClaw") return `skills/${slug}/SKILL.md`;
  if (harness === "Hermes Agent") return `~/.hermes/skills/${slug}/SKILL.md`;
  if (harness === "Gemini CLI") return `.gemini/skills/${slug}/SKILL.md`;
  return `.agents/skills/${slug}/SKILL.md`;
}

function fallbackSourceSkill(pack: RelayPack, compatibility: Compatibility[]): SkillRecord {
  const slug = pack.selectedSkillName.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "relay-skill";
  return { id: pack.selectedSkillId, slug, name: pack.selectedSkillName, description: pack.task, category: "relay", subcategory: "agent workflows", tags: ["relay", "selected-skill"], author: "workspace", authorUrl: "", sourceUrl: "", catalogUrl: "", license: "See source", lastmod: new Date().toISOString().slice(0, 10), installs: 0, sourceKind: "sealed-fallback", live: false, compatibility };
}

export function PackDetail({ id }: { id: string }) {
  const router = useRouter();
  const [pack, setPack] = useState<RelayPack | null>(null);
  const [engine, setEngine] = useState<EngineResult | null>(null);
  const [sourceSkill, setSourceSkill] = useState<SkillRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const [form, setForm] = useState({ name: "", task: "", status: "draft" as PackStatus, notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/packs/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load pack");
      const item = data.item as RelayPack;
      setPack(item);
      setForm({ name: item.name, task: item.task, status: item.status, notes: item.notes });
      const scoreResponse = await fetch("/api/engine", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ task: item.task, skillId: item.selectedSkillId, harnesses: item.harnesses }) });
      const scoreData = scoreResponse.ok ? await scoreResponse.json() as EngineResult : null;
      setEngine(scoreData);
      const sourceResponse = await fetch(`/api/skills/${encodeURIComponent(item.selectedSkillName)}`, { cache: "no-store" });
      if (sourceResponse.ok) {
        const sourceData = await sourceResponse.json();
        setSourceSkill(sourceData.item);
      } else {
        setSourceSkill(fallbackSourceSkill(item, scoreData?.compatibility || []));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load pack");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  async function save() {
    if (!pack) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/packs/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save pack");
      setPack(data.item);
      setError("Saved. A new audit event was sealed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save pack");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!pack || !window.confirm(`Delete “${pack.name}”? The audit event will remain.`)) return;
    const response = await fetch(`/api/packs/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (response.ok) router.push("/packs");
  }

  async function copy(value: string, key: string) {
    try {
      await copyText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setError("Copy failed. Check browser clipboard permissions.");
    }
  }

  function exportPack() {
    if (!pack) return;
    const blob = new Blob([JSON.stringify({ ...pack, analysis: engine }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${pack.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingState label="Opening relay record" />;
  if (!pack) return <div className="empty-state paper-card"><FileJson size={24} /><strong>Pack not found.</strong><span>{error || "This relay may have been deleted."}</span><Link href="/packs" className="btn-secondary">Back to packs</Link></div>;

  const slug = pack.selectedSkillName.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "relay-skill";
  const compatibility: Compatibility[] = engine?.compatibility || pack.harnesses.map((harness) => ({ harness, score: pack.score, format: harness === "Cursor" ? "MDC rule" : "SKILL.md", installPath: pathFor(harness, slug), command: `npx skills add ${pack.selectedSkillId}`, reason: "Selected target" }));
  return <div className="stack-page detail-page">
    <div className="detail-back"><Link href="/packs"><ArrowLeft size={16} /> All relay packs</Link><span className={`status-pill status-${pack.status}`}>{pack.status.replace("-", " ")}</span></div>
    <div className="detail-hero"><div><span className="eyebrow">relay record / {pack.id.slice(-8)}</span><h1>{pack.name}</h1><p>{pack.task}</p></div><div className="detail-actions"><button type="button" className="btn-secondary" onClick={exportPack}><Download size={16} /> Export JSON</button><button type="button" className="btn-danger" onClick={() => void remove()}><Trash2 size={16} /> Delete</button></div></div>
    {error ? <div className="notice-strip"><Pencil size={15} />{error}</div> : null}
    <div className="detail-grid">
      <div className="detail-main">
        <section className="paper-card detail-section"><div className="section-heading"><div><span className="eyebrow">edit surface</span><h2>Pack controls</h2></div><ShieldCheck size={18} /></div><div className="form-grid"><label>Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as PackStatus })}><option value="draft">Draft</option><option value="ready">Ready</option><option value="needs-review">Needs review</option></select></label><label className="wide">Task<textarea value={form.task} onChange={(event) => setForm({ ...form, task: event.target.value })} rows={4} /></label><label className="wide">Notes<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} /></label></div><button type="button" className="btn-primary" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Save and seal mutation</button></section>
        <section className="paper-card detail-section"><div className="section-heading"><div><span className="eyebrow">native paths</span><h2>Install matrix</h2></div><span className="score-chip">{pack.score} fit</span></div><div className="install-matrix">{compatibility.map((entry) => <div className="install-row" key={entry.harness}><div className="install-name"><span className="harness-dot" /><b>{entry.harness}</b><small>{entry.format}</small></div><code>{entry.installPath}</code><button type="button" className="icon-button" onClick={() => void copy(entry.command, entry.harness)} aria-label={`Copy ${entry.harness} command`}>{copied === entry.harness ? <Check size={15} /> : <Clipboard size={15} />}</button></div>)}</div></section>
        <section className="paper-card detail-section"><div className="section-heading"><div><span className="eyebrow">explainable engine</span><h2>Why this fit?</h2></div><Link href="/agent" className="text-link">Run in agent console <ExternalLink size={14} /></Link></div>{engine ? <div className="factor-list">{engine.factors.map((factor) => <div className="factor-row" key={factor.label}><div><b>{factor.label}</b><span>{factor.detail}</span></div><div className="factor-bar"><i style={{ width: `${factor.value}%` }} /></div><strong>{factor.value}</strong></div>)}</div> : <div className="empty-inline">Score details will appear after the live source responds.</div>}</section>
      </div>
      <aside className="detail-aside"><div className="paper-card seal-card"><span className="eyebrow">analysis seal</span><div className="seal-mark"><ShieldCheck size={25} /></div><code>{engine?.seal || pack.seal}</code><p>Analysis-only SHA-384. Mutation history is replayed separately in the audit chain.</p><Link href="/api/audit" className="text-link">Open audit API <ExternalLink size={14} /></Link></div><div className="paper-card source-card"><span className="eyebrow">source signal</span><h3>{pack.selectedSkillName}</h3><code>{pack.selectedSkillId}</code><p>Source links stay attached to the public record. Review upstream instructions before executing them.</p>{sourceSkill ? <SkillCopyRail skill={sourceSkill} compact /> : null}<a href={`/skill/${slug}`} className="btn-secondary full-width">Open source profile <ExternalLink size={15} /></a></div><div className="paper-card target-card"><span className="eyebrow">targets</span><div>{HARNESSES.map((harness) => <span key={harness} className={pack.harnesses.includes(harness) ? "target-pill active" : "target-pill"}>{harness}</span>)}</div></div></aside>
    </div>
  </div>;
}
