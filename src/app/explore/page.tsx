import { getCatalog } from "@/lib/catalog";
import { CatalogExplorer } from "@/components/catalog-explorer";
import { SectionLabel } from "@/components/ui";

export const metadata = { title: "Explore the public index" };

export default async function ExplorePage() {
  const catalog = await getCatalog({ limit: 64 });
  return <div className="stack-page shell page-wide"><div className="page-intro-row"><div><SectionLabel tone="blue">catalog / live signals</SectionLabel><h1>Find a capability worth relaying.</h1><p>Search public skill records, filter by the runtime you need, and inspect the exact source before you build a pack.</p></div><div className="page-stat"><strong>179,054</strong><span>public records in the mirror</span></div></div><CatalogExplorer initial={catalog} /></div>;
}
