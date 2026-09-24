import Link from "next/link";

export default function NotFound() {
  return <div className="route-error"><span className="eyebrow">404 / no packet</span><h1>That relay is not indexed.</h1><p>Try the explorer to find a public skill or create a new relay pack.</p><Link href="/explore" className="btn-primary">Open explorer</Link></div>;
}
