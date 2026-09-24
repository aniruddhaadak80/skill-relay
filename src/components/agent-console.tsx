"use client";

import { Check, Clipboard, Code2, Database, Play, Plus, Search, ShieldCheck, Sparkles, Terminal, Wrench } from "lucide-react";
import { useState } from "react";
import { HARNESSES } from "@/lib/types";

const toolDescriptions = [
  { name: "search_skills", icon: Search, copy: "Search public signals" },
  { name: "resolve_skill", icon: Sparkles, copy: "Explain a fit" },
  { name: "create_relay_pack", icon: Plus, copy: "Persist a pack" },
  { name: "verify_audit_chain", icon: ShieldCheck, copy: "Replay seals" },
];

export function AgentConsole() {
  const [output, setOutput] = useState("Initialize the relay to inspect its tool contract.");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState("agent workflow");

  async function call(method: string, params?: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }) });
      const data = await response.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      setOutput(JSON.stringify({ error: error instanceof Error ? error.message : "MCP request failed" }, null, 2));
    } finally {
      setBusy(false);
    }
  }

  async function copyOutput() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function createDemo() {
    const name = `Agent proof ${new Date().toISOString().slice(11, 19)}`;
    await call("tools/call", { name: "create_relay_pack", arguments: { name, task: "Route a repeatable agent workflow across every supported runtime", selectedSkillId: "vercel-labs/skills/find-skills", selectedSkillName: "find-skills", harnesses: HARNESSES, notes: "Created from the live MCP console." } });
  }

  return <div className="stack-page agent-page">
    <div className="page-intro-row"><div><span className="eyebrow">mcp / json-rpc 2.0</span><h1>Agent console</h1><p>Call the same catalog, engine, and persisted store that power the UI. Mutating tools are live, not decorative.</p></div><div className="console-status"><span className={busy ? "status-dot busy" : "status-dot"} />{busy ? "request in flight" : "endpoint ready"}</div></div>
    <div className="agent-grid"><div className="console-column"><div className="console-window paper-card"><div className="console-bar"><div><Terminal size={16} /><span>skill-relay / mcp</span></div><button type="button" className="icon-button" onClick={() => void copyOutput()} aria-label="Copy console output">{copied ? <Check size={15} /> : <Clipboard size={15} />}</button></div><pre>{output}</pre><div className="console-foot"><span>POST /api/mcp</span><span>no key required</span><span>same persistence</span></div></div><div className="console-actions paper-card"><label>Search query<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><button type="button" className="btn-primary" onClick={() => void call("tools/call", { name: "search_skills", arguments: { query, limit: 8 } })} disabled={busy}><Search size={16} /> Search catalog</button><button type="button" className="btn-secondary" onClick={() => void call("tools/call", { name: "resolve_skill", arguments: { task: query, harnesses: HARNESSES } })} disabled={busy}><Wrench size={16} /> Score fit</button><button type="button" className="btn-secondary" onClick={() => void createDemo()} disabled={busy}><Plus size={16} /> Create proof pack</button><button type="button" className="btn-secondary" onClick={() => void call("tools/call", { name: "verify_audit_chain", arguments: {} })} disabled={busy}><ShieldCheck size={16} /> Verify chain</button></div></div><aside className="tool-column"><div className="paper-card tool-card"><div className="section-heading"><div><span className="eyebrow">contract</span><h2>Available tools</h2></div><Code2 size={18} /></div><div className="tool-list">{toolDescriptions.map(({ name, icon: Icon, copy }) => <button type="button" className="tool-row" key={name} onClick={() => name === "search_skills" ? void call("tools/call", { name, arguments: { query, limit: 8 } }) : name === "resolve_skill" ? void call("tools/call", { name, arguments: { task: query, harnesses: HARNESSES } }) : name === "create_relay_pack" ? void createDemo() : void call("tools/call", { name, arguments: {} })}><span className="tool-icon"><Icon size={16} /></span><span><b>{name}</b><small>{copy}</small></span><Play size={14} /></button>)}</div><button type="button" className="text-button" onClick={() => void call("tools/list")}><Database size={14} /> Inspect tools/list JSON</button></div><div className="paper-card protocol-card"><span className="eyebrow">why it works</span><h3>One engine, four surfaces.</h3><p>Human UI, REST, OpenAPI, and MCP all call the same deterministic score and persistence boundary.</p><div className="protocol-line"><i /><i /><i /><i /></div></div></aside></div>
  </div>;
}
