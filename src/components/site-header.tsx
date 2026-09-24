"use client";

import { ArrowUpRight, Menu, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/explore", label: "Explore" },
  { href: "/packs", label: "Relay packs" },
  { href: "/agent", label: "Agent console" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <div className="shell header-inner">
      <Link href="/" className="brand" aria-label="Skill Relay home" onClick={() => setOpen(false)}>
        <span className="brand-mark">SR</span>
        <span><strong>Skill Relay</strong><small>cross-harness index</small></span>
      </Link>
      <nav className="desktop-nav" aria-label="Primary navigation">
        {links.map((link) => <Link key={link.href} href={link.href} className={pathname.startsWith(link.href) ? "nav-link active" : "nav-link"}>{link.label}</Link>)}
      </nav>
      <div className="header-actions">
        <span className="live-chip"><i /> public signals</span>
        <Link href="/agent" className="header-cta">Open console <ArrowUpRight size={15} /></Link>
        <button className="menu-button" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </div>
    {open ? <div className="mobile-nav shell">
      {links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight size={15} /></Link>)}
      <Link href="/" onClick={() => setOpen(false)}><Sparkles size={15} />Home</Link>
    </div> : null}
  </header>;
}
