import { ArrowDownRight, ArrowUpRight, Boxes, CircleCheck, Code2, Database, GitBranch, Network, ShieldCheck, Sparkles, Terminal, Workflow } from "lucide-react";

export function SectionLabel({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "orange" | "lime" | "ink" }) {
  return <div className={`section-label label-${tone}`}><span />{children}</div>;
}

export function FeatureTile({ icon: Icon, title, body, tone = "blue" }: { icon: typeof Boxes; title: string; body: string; tone?: string }) {
  return <article className={`feature-tile tile-${tone}`}><div className="feature-icon"><Icon size={19} /></div><h3>{title}</h3><p>{body}</p><ArrowUpRight size={16} className="tile-arrow" /></article>;
}

export function Metric({ value, label, detail, tone = "blue" }: { value: string; label: string; detail: string; tone?: string }) {
  return <div className={`metric metric-${tone}`}><strong>{value}</strong><span>{label}</span><small>{detail}</small></div>;
}

export function MiniFlow() {
  return <div className="mini-flow" aria-label="Skill relay flow">
    <div><Network size={17} /><b>signal</b><small>find</small></div><ArrowDownRight size={16} /><div><Code2 size={17} /><b>packet</b><small>shape</small></div><ArrowDownRight size={16} /><div><Terminal size={17} /><b>runtime</b><small>relay</small></div>
  </div>;
}

export const trustIcons = { CircleCheck, Database, GitBranch, ShieldCheck, Sparkles, Workflow };
