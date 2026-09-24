"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="route-error"><span className="eyebrow">route / interrupted</span><h1>The signal took a wrong turn.</h1><p>Try the request again. Your persisted relay data is not affected.</p><button type="button" className="btn-primary" onClick={() => reset()}>Retry route</button></div>;
}
