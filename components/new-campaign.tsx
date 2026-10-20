"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CampaignCreateForm } from "./campaign-create-form";

// Preserve direct /campaigns/new links; the dashboard opens this same form inline.
export default function NewCampaign() {
  const router = useRouter();
  return <>
    <Link className="back-link" href="/">← 캠페인 목록</Link>
    <div className="page-head"><div><p className="eyebrow">새로운 계획</p><h1>캠페인 만들기</h1><p className="subtitle">예산 한도와 두 가지 매출 목표를 각각 설정하세요.</p></div></div>
    <CampaignCreateForm onSaved={value => router.push(`/campaigns/${value.id}`)} onCancel={() => router.push("/")} />
  </>;
}
