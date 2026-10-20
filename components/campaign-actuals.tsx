"use client";
import { useEffect, useState } from "react";
import { api } from "./api";
import { actualFields } from "../lib/actuals";
import { day, krw, type Campaign } from "./types";
type HistoryItem = { id: string; actorName: string; createdAt: string; changes: { label: string; before: string; after: string }[] };
type HistoryPage = { items: HistoryItem[]; nextCursor: string | null };

export function CampaignActuals({ campaign, onEdit, disabled }: { campaign: Campaign; onEdit: () => void; disabled: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [history, setHistory] = useState<HistoryPage>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!expanded) return;
    let live = true;
    api<HistoryPage>(`campaigns/${campaign.id}/actuals`).then(data => { if (live) { setHistory(data); setError(""); } }).catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [campaign.id, campaign.revision, expanded]);
  const loadMore = async () => {
    setBusy(true); setError("");
    try {
      const next = await api<HistoryPage>(`campaigns/${campaign.id}/actuals${history?.nextCursor ? `?cursor=${history.nextCursor}` : ""}`);
      setHistory(previous => ({ ...next, items: previous?.nextCursor ? [...previous.items, ...next.items] : next.items }));
    } catch (e) { setError(e instanceof Error ? e.message : "이력을 불러올 수 없습니다."); } finally { setBusy(false); }
  };
  return <section className="panel actuals-panel" aria-label="캠페인 실제 매출·발생 비용">
    <div className="section-head"><div><h2>실제 매출 · 발생 비용</h2><p className="muted">캠페인별 누적 실적 · 수기 입력 · 지급액과 별도</p></div>{campaign.canEdit && <button className="secondary" disabled={disabled} onClick={onEdit}>실제 매출·비용 입력</button>}</div>
    <div className="stats-grid three">{actualFields.map(({ key, label }) => <div key={key} className="metric"><span>{label}</span><strong className="amount">{campaign[key] === null ? "미입력" : krw(campaign[key])}</strong></div>)}</div>
    <p className="muted">집계 기준일: {campaign.actualsAsOfDate ? day(campaign.actualsAsOfDate) : "미입력"} · {campaign.vatPolicy === "INCLUDED" ? "부가세 포함" : "부가세 별도"}</p>
    {campaign.actualsNote && <p className="record-text">{campaign.actualsNote}</p>}
    <details onToggle={e => setExpanded(e.currentTarget.open)}><summary>입력·수정 이력</summary>
      {error && <p className="error" role="alert">{error} <button className="quiet" disabled={busy} onClick={() => void loadMore()}>다시 불러오기</button></p>}
      {!history && !error && <p role="status">이력을 불러오는 중입니다…</p>}
      {history?.items.length === 0 && <p className="muted">저장된 실적 입력 이력이 없습니다.</p>}
      <ol className="record-list">{history?.items.map(item => <li key={item.id}><p className="record-meta">{item.actorName} · <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</time></p>{item.changes.length ? item.changes.map(change => <div className="record-change" key={change.label}><strong>{change.label}</strong><div className="record-text">{change.before} → {change.after}</div></div>) : <p className="muted">금액 변경 없이 저장되었습니다.</p>}</li>)}</ol>
      {history?.nextCursor && <button className="secondary" disabled={busy} onClick={() => void loadMore()}>이전 실적 이력 더 보기</button>}
    </details>
  </section>;
}
