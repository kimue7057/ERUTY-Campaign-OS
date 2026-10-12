import CampaignDetail from "@/components/campaign-detail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CampaignDetail id={id} tab="budget" />;
}
