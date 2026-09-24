import { AgentConsole } from "@/components/agent-console";
import { SectionLabel } from "@/components/ui";

export const metadata = { title: "Agent console" };

export default function AgentPage() {
  return <div className="stack-page shell page-wide"><div className="page-intro-row"><div><SectionLabel tone="lime">interface / mcp-style</SectionLabel><h1>Let an agent use the relay.</h1></div></div><AgentConsole /></div>;
}
