"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { EntityForm } from "./entity-form";
import { campaignFields } from "./campaign-fields";
import type { Bootstrap } from "./types";

export default function NewCampaign() {
  const [b, setB] = useState<Bootstrap>();
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    api<Bootstrap>("bootstrap")
      .then(setB)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <Link className="back-link" href="/">
        ← 캠페인 목록
      </Link>
      <div className="page-head">
        <div>
          <p className="eyebrow">새로운 계획</p>
          <h1>캠페인 만들기</h1>
          <p className="subtitle">
            예산 한도와 두 가지 매출 목표를 각각 설정하세요.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {b?.actor.role !== "ADMIN" && b && (
        <p className="error">캠페인 생성은 관리자에게 요청해 주세요.</p>
      )}
      {b?.actor.role === "ADMIN" &&
        (b.countries.length ? (
          <EntityForm
            title="캠페인 기본 정보"
            path="campaigns"
            fields={campaignFields(b)}
            values={{
              name: "",
              brandCountryId: "",
              ownerId: null,
              status: "DRAFT",
              planStart: "",
              planEnd: "",
              budgetCeilingKrw: "0",
              targetNetSalesKrw: "0",
              targetErutyRevenueKrw: "0",
              vatPolicy: "",
            }}
            onSaved={(value) => router.push(`/campaigns/${value.id}`)}
            onCancel={() => router.push("/")}
          />
        ) : (
          <p className="empty">
            먼저 <Link href="/brands">브랜드와 국가 운영</Link>을 등록해 주세요.
          </p>
        ))}
    </>
  );
}
