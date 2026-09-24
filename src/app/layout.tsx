import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Skill Relay — route one skill to every agent", template: "%s · Skill Relay" },
  description: "A live cross-harness relay lab for discovering, scoring, and packaging public agent skills for Codex, Claude Code, OpenClaw, Hermes Agent, OpenCode, and more.",
  keywords: ["agent skills", "Claude Code", "Codex", "OpenClaw", "Hermes Agent", "OpenCode", "MCP", "AI tools", "developer tools"],
  authors: [{ name: "Aniruddha Adak" }],
  creator: "Aniruddha Adak",
  openGraph: { title: "Skill Relay", description: "Route one public skill to every agent runtime.", type: "website", siteName: "Skill Relay" },
  twitter: { card: "summary_large_image", title: "Skill Relay", description: "A cross-harness compatibility lab for public agent skills." },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <html lang="en"><body><SiteHeader /><main>{children}</main><footer className="site-footer"><div className="shell footer-inner"><div><strong>Skill Relay</strong><span>Open signals. Better packets. Fewer blind installs.</span></div><div className="footer-links"><a href="https://agentskills.io" target="_blank" rel="noreferrer">Agent Skills format</a><a href="https://skills.sh" target="_blank" rel="noreferrer">skills.sh</a><a href="/api/openapi.json">OpenAPI</a></div><small>MIT licensed · source signals remain with their authors.</small></div></footer></body></html>;
}
