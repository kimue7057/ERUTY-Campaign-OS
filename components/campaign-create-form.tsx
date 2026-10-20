"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "./api";
import { EntityForm } from "./entity-form";
import { campaignFields } from "./campaign-fields";
import type { Bootstrap } from "./types";

export function CampaignCreateForm({ id, onSaved, onCancel, autoFocus = false }: {
  id?: string; onSaved: (value: { id: string }) => void | Promise<unknown>; onCancel: () => void; autoFocus?: boolean;
}) {
  const [bootstrap, setBootstrap] = useState<Bootstrap>();
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    api<Bootstrap>("bootstrap").then(value => { if (live) setBootstrap(value); }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);
  return <div id={id} className="inline-editor-slot">
    {error ? <p role="alert" className="error">{error}</p> : !bootstrap ? <p role="status">작성 폼을 불러오는 중입니다…</p>
      : bootstrap.actor.role !== "ADMIN" ? <p className="error">캠페인 생성은 관리자에게 요청해 주세요.</p>
      : !bootstrap.countries.length ? <p className="empty">먼저 <Link href="/brands">브랜드와 국가 운영</Link>을 등록해 주세요.</p>
      : <EntityForm title="캠페인 기본 정보" path="campaigns" fields={campaignFields(bootstrap)} autoFocus={autoFocus}
        values={{ name: "", brandCountryId: "", ownerId: null, status: "DRAFT", planStart: "", planEnd: "", budgetCeilingKrw: "0", targetNetSalesKrw: "0", targetErutyRevenueKrw: "0", vatPolicy: "" }}
        onSaved={onSaved} onCancel={onCancel} />}
    {(!bootstrap || bootstrap.actor.role !== "ADMIN" || !bootstrap.countries.length) && <button type="button" className="secondary" onClick={onCancel}>닫기</button>}
  </div>;
}
