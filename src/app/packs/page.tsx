import { PackBoard } from "@/components/pack-board";
import { SectionLabel } from "@/components/ui";

export const metadata = { title: "Relay packs" };

export default function PacksPage() {
  return <div className="stack-page shell page-wide"><div className="page-intro-row"><div><SectionLabel tone="orange">workspace / persistent state</SectionLabel><h1>Your relay shelf.</h1></div></div><PackBoard /></div>;
}
