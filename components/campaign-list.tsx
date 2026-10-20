"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { CampaignCreateForm } from "./campaign-create-form";
import { api } from "./api";
import { krw, day, labelStatus, type Campaign } from "./types";
import { actualFields, type ActualTotals } from "../lib/actuals";

export default function CampaignList() {
  const [rows, setRows] = useState<Campaign[] | null>(null);
  const [totals, setTotals] = useState<ActualTotals>();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const createButton = useRef<HTMLButtonElement>(null);
  const createId = useId();
  const closeCreate = () => {
    setCreating(false);
    requestAnimationFrame(() => { if (!document.getElementById(createId)) createButton.current?.focus({ preventScroll: true }); });
  };
  useEffect(() => {
    let live = true;
    Promise.all([api<Campaign[]>("campaigns"), api<ActualTotals>("dashboard-summary")])
      .then(([campaigns, summary]) => { if (live) { setRows(campaigns); setTotals(summary); } })
      .catch((e) => { if (live) setError(e.message); });
    return () => { live = false; };
  }, []);
  const filtered = rows?.filter(
    (c) =>
      (!status || c.status === status) &&
      `${c.name} ${c.brandCountry.brand.name} ${c.brandCountry.countryName}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">캠페인 관리</p>
          <h1>캠페인 운영 대시보드</h1>
          <p className="subtitle">
            브랜드의 계획을 국가별 전략과 활동으로 연결합니다.
          </p>
        </div>
        <button ref={createButton} type="button" className="primary" disabled={creating} aria-expanded={creating} aria-controls={createId} onClick={() => { setNotice(""); setCreating(true); }}>
          + 캠페인 만들기
        </button>
      </div>
      {creating && <CampaignCreateForm id={createId} autoFocus onCancel={closeCreate} onSaved={async () => {
        try {
          const [campaigns, summary] = await Promise.all([api<Campaign[]>("campaigns"), api<ActualTotals>("dashboard-summary")]);
          setRows(campaigns); setTotals(summary); setQuery(""); setStatus(""); setError(""); setNotice("캠페인을 만들었습니다.");
        } catch { setError("캠페인은 저장되었습니다. 목록을 새로고침해 주세요."); }
        closeCreate();
      }} />}
      {notice && <p role="status" className="note">{notice}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="stats-grid three">
        <div className="metric">
          <span>전체 캠페인</span>
          <strong>
            {rows?.length ?? "—"}
            <small>개</small>
          </strong>
        </div>
        <div className="metric">
          <span>진행 중</span>
          <strong>
            {rows?.filter((c) => c.status === "ACTIVE").length ?? "—"}
            <small>개</small>
          </strong>
        </div>
        <div className="metric">
          <span>계획 활동</span>
          <strong>
            {rows?.reduce((n, c) => n + c.summary.activityCount, 0) ?? "—"}
            <small>개</small>
          </strong>
        </div>
      </div>
      <div className="stats-grid three" aria-label="실제 매출·발생 비용 합계">
        {actualFields.map(({ key, label }) => <div className="metric" key={key}>
          <span>{label}</span><strong className="amount">{!totals ? "—" : totals[key].recordedCount === 0 ? "미입력" : krw(totals[key].totalKrw)}</strong>
          <p>수기 입력 {totals?.[key].recordedCount ?? "—"} / {totals?.campaignCount ?? "—"}개 캠페인</p>
        </div>)}
      </div>
      <p className="muted">조회 권한이 있는 전체 캠페인의 수기 누적 실적 합계입니다. 미입력 금액은 제외하며, 부가세는 각 캠페인의 입력 기준을 따릅니다.</p>
      <div className="section-head list-toolbar">
        <h2>
          캠페인 목록 <span className="count">{filtered?.length ?? 0}</span>
        </h2>
        <div className="filters">
          <label>
            <span className="sr-only">캠페인 검색</span>
            <input
              placeholder="브랜드, 국가, 캠페인 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">상태 필터</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">모든 상태</option>
              <option value="DRAFT">준비 중</option>
              <option value="ACTIVE">진행 중</option>
              <option value="COMPLETED">완료</option>
              <option value="ARCHIVED">보관</option>
            </select>
          </label>
        </div>
      </div>
      {!rows && !error && (
        <p className="empty" role="status">
          캠페인을 불러오는 중입니다…
        </p>
      )}
      {filtered?.length === 0 && (
        <div className="empty">
          <h3>조회된 캠페인이 없습니다.</h3>
          <p>브랜드와 국가를 등록한 후 첫 캠페인을 만들어 주세요.</p>
          <Link href="/brands">브랜드 · 국가 관리 →</Link>
        </div>
      )}
      <div className="campaign-grid">
        {filtered?.map((c) => (
          <Link
            key={c.id}
            href={`/campaigns/${c.id}`}
            className="campaign-card"
          >
            <div className="section-head">
              <span className="country-tag">
                {c.brandCountry.countryCode} · {c.brandCountry.countryName}
              </span>
              <span className={`badge state-${c.status}`}>
                {labelStatus(c.status)}
              </span>
            </div>
            <p className="brand-name">
              {c.brandCountry.brand.name}{" "}
              {c.isDemo && <span className="badge demo">DEMO</span>}
            </p>
            <h3>{c.name}</h3>
            <p className="date-text">
              {day(c.planStart)} → {day(c.planEnd)}
            </p>
            <div className="card-divider" />
            <div className="card-facts">
              <span>
                예산 한도<strong>{krw(c.budgetCeilingKrw)}</strong>
              </span>
              <span>
                담당자<strong>{c.owner?.name ?? "미지정"}</strong>
              </span>
            </div>
            <div className="card-facts actual-card-facts">
              <span>실제 이루티 매출<strong>{c.actualErutyRevenueKrw === null ? "미입력" : krw(c.actualErutyRevenueKrw)}</strong></span>
              <span>발생 비용<strong>{c.actualIncurredCostKrw === null ? "미입력" : krw(c.actualIncurredCostKrw)}</strong></span>
            </div>
            <div className="card-bottom">
              <span>
                전략 {c.strategies.length} · 활동 {c.summary.activityCount}
              </span>
              <span className="arrow">상세 보기 ↗</span>
            </div>
          </Link>
        ))}
      </div>
      <aside className="note">
        <strong>계획과 성과를 구분합니다.</strong>
        <p>
          매출 목표와 실제 순판매액·이루티 매출은 별도로 저장됩니다. 실제 매출과 발생 비용은 캠페인에서 수기로 입력한 누적 값이며, 승인된 비용 원장·지급액과는 별도입니다.
        </p>
      </aside>
    </>
  );
}
