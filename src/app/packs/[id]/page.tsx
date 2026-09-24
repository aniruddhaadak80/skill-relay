import { PackDetail } from "@/components/pack-detail";

export const metadata = { title: "Relay pack" };

export default async function PackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div className="stack-page shell page-wide"><PackDetail id={id} /></div>;
}
