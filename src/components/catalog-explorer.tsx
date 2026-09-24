"use client";

import { ArrowRight, Check, ChevronRight, ExternalLink, Filter, Loader2, Search, Send, SlidersHorizontal, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HARNESSES, type CatalogResponse, type Harness, type SkillRecord } from "@/lib/types";
import { SkillCopyRail } from "./copy-button";
import { SourceBadge } from "./source-badge";

function averageFit(skill: SkillRecord): number {
  return skill.compatibility.length ? Math.round(skill.compatibility.reduce((sum, item) => sum + item.score, 0) / skill.compatibility.length) : 0;
}

function formatInstalls(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  return value.toLocaleString();
}

export function CatalogExplorer({ initial }: { initial: CatalogResponse }) {
  const router = useRouter();
  const [items, setItems] = useState(initial.items);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [harness, setHarness] = useState("all");
  const [minimumFit, setMinimumFit] = useState(0);
  const [sort, setSort] = useState("fit");
  const [selected, setSelected] = useState<SkillRecord | null>(initial.items[0] || null);
  const [selectedHarnesses, setSelectedHarnesses] = useState<Harness[]>([...HARNESSES]);
  const [packName, setPackName] = useState("Cross-harness starter pack");
  const [packTask, setPackTask] = useState("Route this capability into a repeatable agent workflow");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [catalogInfo, setCatalogInfo] = useState({ live: initial.live, sourceLabel: initial.sourceLabel });
  const displayItems = query.trim().length < 2 ? initial.items : items;

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length < 2) setSelected(initial.items[0] || null);
  }

  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/catalog?q=${encodeURIComponent(query.trim())}&limit=64`, { signal: controller.signal });
        if (!response.ok) throw new Error("Catalog search failed");
        const data = await response.json() as CatalogResponse;
        setItems(data.items);
        setCatalogInfo({ live: data.live, sourceLabel: data.sourceLabel });
        setSelected(data.items[0] || null);
      } catch (searchError) {
        if ((searchError as Error).name !== "AbortError") setError(searchError instanceof Error ? searchError.message : "Search failed");
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [initial.items, query]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        document.getElementById("catalog-search")?.focus();
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const categories = useMemo(() => [...new Set(displayItems.map((item) => item.category).filter(Boolean))].sort(), [displayItems]);
  const filtered = useMemo(() => {
    const next = displayItems.filter((item) => {
      const fit = averageFit(item);
      return (category === "all" || item.category === category) && (source === "all" || item.sourceKind === source) && (harness === "all" || item.compatibility.some((entry) => entry.harness === harness)) && fit >= minimumFit;
    });
    return next.sort((left, right) => sort === "installs" ? right.installs - left.installs : sort === "fresh" ? right.lastmod.localeCompare(left.lastmod) : averageFit(right) - averageFit(left));
  }, [category, displayItems, harness, minimumFit, sort, source]);

  function toggleHarness(value: Harness) {
    setSelectedHarnesses((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/catalog${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}&limit=64`);
      const data = await response.json() as CatalogResponse;
      setItems(data.items);
      setSelected(data.items[0] || null);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  async function createRelay() {
    if (!selected) return;
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/packs", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: packName, task: packTask, selectedSkillId: selected.id, selectedSkillName: selected.name, harnesses: selectedHarnesses, notes: "Created from the Skill Relay explorer." }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create pack");
      router.push(`/packs/${data.item.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create pack");
    } finally {
      setCreating(false);
    }
  }

  return <div className="explorer-shell">
    <div className="explorer-toolbar paper-card">
      <div className="search-field"><Search size={18} /><input id="catalog-search" value={query} onChange={(event) => handleQueryChange(event.target.value)} placeholder="Search by task, tool, or agent (try ‘debugging’ or ‘browser’)" aria-label="Search public skills by task, tool, or agent" /><kbd>⌘ K</kbd>{loading ? <Loader2 size={16} className="spin" /> : null}</div>
      <button type="button" className="btn-secondary filter-toggle" aria-expanded={filtersOpen} aria-controls="power-filters" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={16} /> {filtersOpen ? "Hide power filters" : "Power filters"}</button>
      <button type="button" className="btn-primary" onClick={() => void refresh()}><Sparkles size={16} /> Refresh signals</button>
    </div>
    <div id="power-filters" className={filtersOpen ? "filter-drawer paper-card" : "filter-drawer paper-card filter-drawer-collapsed"} aria-hidden={!filtersOpen}>
      <div className="filter-title"><Filter size={16} /><span>Power filters</span><small>{filtered.length} visible / {items.length} loaded</small></div>
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)} disabled={!filtersOpen}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Source<select value={source} onChange={(event) => setSource(event.target.value)} disabled={!filtersOpen}><option value="all">All sources</option><option value="claudskills">ClaudSkills mirror</option><option value="skills.sh">skills.sh</option><option value="sealed-fallback">Sealed fallback</option></select></label>
      <label>Harness<select value={harness} onChange={(event) => setHarness(event.target.value)} disabled={!filtersOpen}><option value="all">Any harness</option>{HARNESSES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label>Minimum fit <strong>{minimumFit || "any"}</strong><input type="range" min="0" max="95" step="5" value={minimumFit} disabled={!filtersOpen} onChange={(event) => setMinimumFit(Number(event.target.value))} /></label>
      <label>Sort<select value={sort} onChange={(event) => setSort(event.target.value)} disabled={!filtersOpen}><option value="fit">Highest fit</option><option value="installs">Most installs</option><option value="fresh">Freshest source</option></select></label>
    </div>
    {error ? <div className="error-strip"><X size={15} />{error}</div> : null}
    <div className="explorer-grid">
      <div className="catalog-column">
        <div className="results-head"><div><span className="eyebrow">public index</span><h2>{query ? `Results for “${query}”` : "Fresh signal packets"}</h2></div><SourceBadge live={catalogInfo.live} label={catalogInfo.sourceLabel} /></div>
        <div className="catalog-list">
          {filtered.map((skill, index) => <article role="button" tabIndex={0} aria-label={`Inspect ${skill.name}`} className={selected?.id === skill.id ? "skill-card selected" : "skill-card"} key={skill.id} onClick={() => setSelected(skill)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelected(skill); } }} style={{ "--card-index": index } as React.CSSProperties}>
            <div className="skill-card-top"><span className="skill-index">{String(index + 1).padStart(2, "0")}</span><span className={skill.live ? "live-dot" : "fallback-dot"} /> <span className="skill-source">{skill.sourceKind === "claudskills" ? "ClaudSkills" : skill.sourceKind === "skills.sh" ? "skills.sh" : "sealed fallback"}</span><span className="skill-fit">{averageFit(skill)}% fit</span></div>
            <h3>{skill.name}</h3><p>{skill.description}</p>
            <div className="skill-card-foot"><span>{skill.category}</span><span>{formatInstalls(skill.installs)} installs</span><ChevronRight size={15} /></div>
            <SkillCopyRail skill={skill} compact />
          </article>)}
          {!filtered.length ? <div className="empty-state"><Search size={24} /><strong>No packets match that filter.</strong><span>Clear a filter or search a broader capability.</span></div> : null}
        </div>
      </div>
      <aside className="detail-column">
        {selected ? <div className="selected-panel paper-card">
          <div className="selected-head"><div><span className="eyebrow">selected packet</span><h2>{selected.name}</h2></div><Link href={`/skill/${selected.slug}`} className="icon-button" aria-label="Open skill detail"><ExternalLink size={17} /></Link></div>
          <p className="selected-description">{selected.description}</p>
          <SkillCopyRail skill={selected} />
          <div className="metadata-grid"><div><span>author</span><b>{selected.author || "community"}</b></div><div><span>license</span><b>{selected.license || "unknown"}</b></div><div><span>last seen</span><b>{selected.lastmod || "recent"}</b></div><div><span>records</span><b>{formatInstalls(selected.installs)}</b></div></div>
          <div className="compatibility-heading"><span>native relay paths</span><small>{selectedHarnesses.length} targets</small></div>
          <div className="compatibility-list">{selected.compatibility.map((entry) => <div className="compat-row" key={entry.harness}><div className="compat-name"><span className={`harness-dot harness-${entry.harness.toLowerCase().replaceAll(" ", "-")}`} /><b>{entry.harness}</b></div><div className="compat-bar"><i style={{ width: `${entry.score}%` }} /></div><strong>{entry.score}</strong><code>{entry.installPath}</code></div>)}</div>
          <div className="relay-builder"><div className="builder-title"><Send size={16} /><span>Build a persisted relay pack</span></div><label>Pack name<input value={packName} onChange={(event) => setPackName(event.target.value)} /></label><label>Task to route<textarea value={packTask} onChange={(event) => setPackTask(event.target.value)} rows={3} /></label><div className="harness-picker"><span>target harnesses</span><div>{HARNESSES.map((item) => <button type="button" key={item} className={selectedHarnesses.includes(item) ? "harness-toggle active" : "harness-toggle"} onClick={() => toggleHarness(item)}>{selectedHarnesses.includes(item) ? <Check size={12} /> : null}{item}</button>)}</div></div><button type="button" className="btn-primary full-width" disabled={creating || !selectedHarnesses.length} onClick={() => void createRelay()}>{creating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />} Create relay pack <ArrowRight size={16} /></button></div>
        </div> : <div className="empty-state paper-card"><Sparkles size={24} /><strong>Select a packet to inspect it.</strong><span>Every result has a source, score factors, and a native install path.</span></div>}
      </aside>
    </div>
  </div>;
}
