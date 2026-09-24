"use client";

import { ArrowUpRight, CheckCircle2, ClipboardCheck, Loader2, Plus, RefreshCw, Search, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HARNESSES, type Harness, type RelayPack } from "@/lib/types";
import { LoadingState } from "./source-badge";

export function PackBoard() {
  const router = useRouter();
  const [packs, setPacks] = useState<RelayPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "New relay pack", task: "Describe a repeatable agent workflow", selectedSkillId: "anthropics/skills/skill-creator", selectedSkillName: "skill-creator", notes: "" });
  const [harnesses, setHarnesses] = useState<Harness[]>([...HARNESSES]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/packs", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load packs");
      setPacks(data.items || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load packs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { void load(); });
  }, [load]);

  const filtered = useMemo(() => packs.filter((pack) => (status === "all" || pack.status === status) && `${pack.name} ${pack.task} ${pack.selectedSkillName}`.toLowerCase().includes(query.toLowerCase())), [packs, query, status]);

  async function createPack() {
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/packs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, harnesses }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create pack");
      setShowForm(false);
      router.push(`/packs/${data.item.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create pack");
    } finally {
      setCreating(false);
    }
  }

  async function verify() {
    try {
      const response = await fetch("/api/audit", { cache: "no-store" });
      const data = await response.json();
      setError(data.chain?.valid ? `Audit chain verified across ${data.chain.checked} events.` : "Audit chain needs review.");
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Audit verification failed");
    }
  }

  function toggleHarness(value: Harness) {
    setHarnesses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  return <div className="stack-page">
    <div className="page-intro-row"><div><span className="eyebrow">workspace / persistent</span><h1>Relay packs</h1><p>Keep the task, the chosen skill, and every target runtime in one editable, sealed record.</p></div><div className="intro-actions"><button type="button" className="btn-secondary" onClick={() => void verify()}><ShieldCheck size={16} /> Verify chain</button><button type="button" className="btn-primary" onClick={() => setShowForm((value) => !value)}><Plus size={17} /> New pack</button></div></div>
    <div className="pack-toolbar paper-card"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter packs by name, task, or skill" aria-label="Filter relay packs" /></div><div className="segmented">{["all", "draft", "ready", "needs-review"].map((value) => <button type="button" key={value} className={status === value ? "active" : ""} onClick={() => setStatus(value)}>{value === "all" ? "All" : value.replace("-", " ")}</button>)}</div><button type="button" className="icon-button" onClick={() => void load()} aria-label="Refresh packs"><RefreshCw size={17} /></button></div>
    {error ? <div className="notice-strip"><ClipboardCheck size={16} />{error}</div> : null}
    {showForm ? <div className="pack-create paper-card"><div className="form-heading"><div><span className="eyebrow">mutation / create</span><h2>Start a new relay</h2></div><button type="button" className="icon-button" onClick={() => setShowForm(false)} aria-label="Close form">×</button></div><div className="form-grid"><label>Pack name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Source skill ID<input value={form.selectedSkillId} onChange={(event) => setForm({ ...form, selectedSkillId: event.target.value })} /></label><label>Source skill name<input value={form.selectedSkillName} onChange={(event) => setForm({ ...form, selectedSkillName: event.target.value })} /></label><label>Task<textarea value={form.task} onChange={(event) => setForm({ ...form, task: event.target.value })} rows={3} /></label></div><div className="harness-picker"><span>target harnesses</span><div>{HARNESSES.map((item) => <button type="button" key={item} className={harnesses.includes(item) ? "harness-toggle active" : "harness-toggle"} onClick={() => toggleHarness(item)}>{harnesses.includes(item) ? <CheckCircle2 size={12} /> : null}{item}</button>)}</div></div><button type="button" className="btn-primary" disabled={creating || !harnesses.length} onClick={() => void createPack()}>{creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Persist relay pack</button></div> : null}
    {loading ? <LoadingState label="Reading the persisted relay shelf" /> : <div className="pack-grid">{filtered.map((pack) => <Link href={`/packs/${pack.id}`} className="pack-card paper-card" key={pack.id}><div className="pack-card-top"><span className={`status-pill status-${pack.status}`}>{pack.status.replace("-", " ")}</span><ArrowUpRight size={16} /></div><h2>{pack.name}</h2><p>{pack.task}</p><div className="pack-skill"><span>selected signal</span><b>{pack.selectedSkillName}</b></div><div className="pack-card-foot"><span>{pack.harnesses.length} harnesses</span><span className="score-chip">{pack.score} fit</span><span>{new Date(pack.updatedAt).toLocaleDateString()}</span></div></Link>)}{!filtered.length ? <div className="empty-state paper-card"><Trash2 size={22} /><strong>No relay packs here yet.</strong><span>Create one from the explorer or the agent console.</span></div> : null}</div>}
  </div>;
}
