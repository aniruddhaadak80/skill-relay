import { getSkillBySlug } from "@/lib/catalog";
import { SkillDetail } from "@/components/skill-detail";

export const metadata = { title: "Skill profile" };

export default async function SkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initialSkill = await getSkillBySlug(id);
  return <div className="stack-page shell page-wide"><SkillDetail slug={id} initialSkill={initialSkill} /></div>;
}
