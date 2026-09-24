"use client";

import { Code2, Database, Play, Plus, Search, ShieldCheck, Sparkles, Terminal, Wrench } from "lucide-react";
import { useRef, useState } from "react";
import { HARNESSES } from "@/lib/types";
import { CopyButton } from "./copy-button";

const toolDescriptions = [
  { name: "search_skills", icon: Search, copy: "Search public signals" },
  { name: "resolve_skill", icon: Sparkles, copy: "Explain a fit" },
  { name: "get_skill", icon: Code2, copy: "Copy exact skill bundle" },
  { name: "get_skill_markdown", icon: Terminal, copy: "Copy SKILL.md manifest" },
  { name: "create_relay_pack", icon: Plus, copy: "Persist a pack" },
  { name: "verify_audit_chain", icon: ShieldCheck, copy: "Replay seals" },
];

export function AgentConsole() {
  const [output, setOutput] = useState("Initialize the relay to inspect its tool contract.");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("agent workflow");
  const [skillId, setSkillId] = useState("frontend-design");
  const requestId = useRef(0);

  async function call(method: string, params?: Record<string, unknown>) {
    setBusy(true);
    try {
      const response = await fetch("/api/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++requestId.current, method, params }) });
      const data = await response.json();
      setOutput(JSON.stringify(data, null, 2));
    } catch (error) {
      setOutput(JSON.stringify({ error: error instanceof Error ? error.message : "MCP request failed" }, null, 2));
    } finally {
      setBusy(false);
    }
  }

  async function createDemo() {
    const name = `Agent proof ${new Date().toISOString().slice(11, 19)}`;
    await call("tools/call", { name: "create_relay_pack", arguments: { name, task: "Route a repeatable agent workflow across every supported runtime", selectedSkillId: "vercel-labs/skills/find-skills", selectedSkillName: "find-skills", harnesses: HARNESSES, notes: "Created from the live MCP console." } });
  }

  async function runTool(name: string) {
    if (name === "search_skills") return void call("tools/call", { name, arguments: { query, limit: 8 } });
    if (name === "resolve_skill") return void call("tools/call", { name, arguments: { task: query, harnesses: HARNESSES } });
    if (name === "get_skill") return void call("tools/call", { name, arguments: { id: skillId } });
    if (name === "get_skill_markdown") return void call("tools/call", { name, arguments: { id: skillId } });
    if (name === "create_relay_pack") return void createDemo();
    return void call("tools/call", { name, arguments: {} });
  }

  return <div className="stack-page agent-page">
    <div className="page-intro-row"><div><span className="eyebrow">mcp / json-rpc 2.0</span><h1>Agent console</h1><p>Call the same catalog, engine, and persisted store that power the UI. Copy exact skill bundles or mutate the workspace through the same audited boundary.</p></div><div className="console-status"><span className={busy ? "status-dot busy" : "status-dot"} />{busy ? "request in flight" : "endpoint ready"}</div></div>
    <div className="agent-grid"><div className="console-column"><div className="console-window paper-card"><div className="console-bar"><div><Terminal size={16} /><span>skill-relay / mcp</span></div><CopyButton value={output} label="Copy output" compact /></div><pre>{output}</pre><div className="console-foot"><span>POST /api/mcp</span><span>no key required</span><span>same persistence</span></div></div><div className="console-actions paper-card"><label>Search query<input value={query} onChange={(event) => setQuery(event.target.value)} /></label><label>Exact skill ID / slug<input value={skillId} onChange={(event) => setSkillId(event.target.value)} /></label><button type="button" className="btn-primary" onClick={() => void call("tools/call", { name: "search_skills", arguments: { query, limit: 8 } })} disabled={busy}><Search size={16} /> Search catalog</button><button type="button" className="btn-secondary" onClick={() => void call("tools/call", { name: "resolve_skill", arguments: { task: query, harnesses: HARNESSES } })} disabled={busy}><Wrench size={16} /> Score fit</button><button type="button" className="btn-secondary" onClick={() => void call("tools/call", { name: "get_skill", arguments: { id: skillId } })} disabled={busy}><Code2 size={16} /> Get skill bundle</button><button type="button" className="btn-secondary" onClick={() => void call("tools/call", { name: "get_skill_markdown", arguments: { id: skillId } })} disabled={busy}><Terminal size={16} /> Get SKILL.md</button><button type="button" className="btn-secondary" onClick={() => void createDemo()} disabled={busy}><Plus size={16} /> Create proof pack</button><button type="button" className="btn-secondary" onClick={() => void call("tools/call", { name: "verify_audit_chain", arguments: {} })} disabled={busy}><ShieldCheck size={16} /> Verify chain</button></div></div><aside className="tool-column"><div className="paper-card tool-card"><div className="section-heading"><div><span className="eyebrow">contract</span><h2>Available tools</h2></div><Code2 size={18} /></div><div className="tool-list">{toolDescriptions.map(({ name, icon: Icon, copy }) => <button type="button" className="tool-row" key={name} onClick={() => void runTool(name)}><span className="tool-icon"><Icon size={16} /></span><span><b>{name}</b><small>{copy}</small></span><Play size={14} /></button>)}</div><button type="button" className="text-button" onClick={() => void call("tools/list")}><Database size={14} /> Inspect tools/list JSON</button></div><div className="paper-card protocol-card"><span className="eyebrow">why it works</span><h3>One bundle. Every runtime.</h3><p>Human copy, REST, and MCP all resolve the exact skill ID and return the same reviewable metadata, Markdown, JSON, and agent payload.</p><div className="protocol-line"><i /><i /><i /><i /></div></div></aside></div>
  </div>;
}
