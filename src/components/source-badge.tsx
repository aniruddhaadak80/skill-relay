"use client";

import { AlertTriangle, Check, Loader2, RotateCw } from "lucide-react";

export function SourceBadge({ live, label }: { live: boolean; label: string }) {
  return <span className={live ? "source-badge live" : "source-badge fallback"}>{live ? <Check size={12} /> : <AlertTriangle size={12} />}{label}</span>;
}

export function LoadingState({ label = "Loading relay data" }: { label?: string }) {
  return <div className="loading-state"><Loader2 size={18} className="spin" /><span>{label}</span><RotateCw size={14} className="muted" /></div>;
}
