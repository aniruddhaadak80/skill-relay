"use client";

import { AlertTriangle, Check, Code2, Copy, FileDown, FileJson, Link2, Sparkles, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { buildCopyBundle, type SkillCopyBundle } from "@/lib/skill-copy";
import type { SkillRecord } from "@/lib/types";

export async function copyText(value: string): Promise<void> {
  if (!value) throw new Error("Nothing to copy");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard access was denied");
}

type CopyState = "idle" | "copied" | "error";

export function CopyButton({ value, label, icon: Icon = Copy, compact = false, className = "", disabled = false }: { value: string; label: string; icon?: LucideIcon; compact?: boolean; className?: string; disabled?: boolean }) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await copyText(value);
      setState("copied");
    } catch {
      setState("error");
    }
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1500);
  }

  const text = state === "copied" ? "Copied" : state === "error" ? "Copy failed" : label;
  return <button type="button" className={`copy-action ${compact ? "copy-action-compact" : ""} copy-${state} ${className}`} onClick={(event) => void handleCopy(event)} disabled={disabled} aria-label={text}>
    {state === "copied" ? <Check size={compact ? 13 : 15} /> : state === "error" ? <AlertTriangle size={compact ? 13 : 15} /> : <Icon size={compact ? 13 : 15} />}
    <span>{text}</span>
    <span className="sr-only" aria-live="polite">{text}</span>
  </button>;
}

function bundleForClient(skill: SkillRecord): SkillCopyBundle {
  return buildCopyBundle(skill, typeof window !== "undefined" ? window.location.origin : "https://skill-relay-tau.vercel.app");
}

export function SkillCopyRail({ skill, compact = false }: { skill: SkillRecord; compact?: boolean }) {
  const [mode, setMode] = useState<"human" | "agent">("human");
  const bundle = useMemo(() => bundleForClient(skill), [skill]);
  return <div className={compact ? "copy-rail copy-rail-compact" : "copy-rail"}>
    {!compact ? <div className="copy-rail-head"><div><span className="eyebrow">copy rail</span><strong>Take this skill with you</strong></div><div className="copy-mode" role="group" aria-label="Copy format"><button type="button" className={mode === "human" ? "active" : ""} onClick={() => setMode("human")}>Human</button><button type="button" className={mode === "agent" ? "active" : ""} onClick={() => setMode("agent")}>Agent</button></div></div> : null}
    <div className="copy-actions">
      <CopyButton value={bundle.markdown} label="Copy SKILL.md" icon={FileDown} compact={compact} />
      <CopyButton value={bundle.json} label="Copy JSON" icon={FileJson} compact={compact} />
      <CopyButton value={bundle.sourceUrl} label="Copy source URL" icon={Link2} compact={compact} disabled={!bundle.sourceUrl} />
      {!compact ? <CopyButton value={bundle.agentPayload} label="Copy agent payload" icon={Sparkles} /> : null}
    </div>
    {!compact ? <div className="copy-rail-foot"><span><Code2 size={13} /> {mode === "agent" ? "Agent payload includes every target harness." : "Metadata-only manifest · review upstream before use."}</span><a href={bundle.profileUrl} target="_blank" rel="noreferrer">Open profile <Link2 size={13} /></a></div> : null}
  </div>;
}
