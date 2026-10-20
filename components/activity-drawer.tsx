"use client";
import { useEffect, useId, useRef, useState } from "react";
import { api } from "./api";
import { EntityForm } from "./entity-form";
import { workFields, workValues } from "./campaign-fields";
import { day, krw, labelStatus, type Work, type Campaign, type Bootstrap } from "./types";

type Journal = { id: string; body: string; revision: number; createdAt: string; updatedAt: string; author: { name: string }; canEdit: boolean };
type History = { id: string; createdAt: string; action: string; actorName: string; changes: { label: string; before: string; after: string }[] };
type Page<T> = { items: T[]; nextCursor: string | null };
type Detail = { work: Work; canEdit: boolean; actorId: string };
const emptyPage = <T,>(): Page<T> => ({ items: [], nextCursor: null });
const timestamp = (value: string) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
const tabs = [{ key: "content", label: "활동 내용" }, { key: "journals", label: "업무일지" }, { key: "history", label: "변경 이력" }] as const;
type Tab = typeof tabs[number]["key"];

function HistoryList({ page, onMore, busy }: { page: Page<History>; onMore: () => void; busy: boolean }) {
  return <>
    {!page.items.length && <p className="muted">저장된 변경 이력이 없습니다.</p>}
    <ol className="record-list">
      {page.items.map(event => <li key={event.id}>
        <p className="record-meta"><strong>{event.actorName}</strong> · <time dateTime={event.createdAt}>{timestamp(event.createdAt)}</time> · {event.action === "CREATE" ? "등록" : event.action === "UPDATE" ? "수정" : "삭제"}</p>
        {event.changes.length ? event.changes.map(change => <div className="record-change" key={change.label}><strong>{change.label}</strong><div className="record-text">{change.before} → {change.after}</div></div>) : <p className="muted">표시 항목의 변경 없이 저장되었습니다.</p>}
      </li>)}
    </ol>
    {page.nextCursor && <button className="secondary" disabled={busy} onClick={onMore}>이전 이력 더 보기</button>}
  </>;
}

export function ActivityDrawer({ campaignId, campaign, bootstrap, workId, onClose, onSaved }: {
  campaignId: string; campaign: Campaign; bootstrap: Bootstrap; workId: string; onClose: () => void; onSaved: () => Promise<unknown>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const [detail, setDetail] = useState<Detail>();
  const [tab, setTab] = useState<Tab>("content");
  const [logs, setLogs] = useState<Page<Journal>>(emptyPage);
  const [history, setHistory] = useState<Page<History>>(emptyPage);
  const [revisions, setRevisions] = useState<Page<History>>(emptyPage);
  const [revisionId, setRevisionId] = useState<string>();
  const [description, setDescription] = useState("");
  const [editingContent, setEditingContent] = useState(false);
  const [body, setBody] = useState("");
  const [editingLog, setEditingLog] = useState<Journal>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingWork, setEditingWork] = useState(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const closeWorkEditor = () => {
    setEditingWork(false);
    requestAnimationFrame(() => { if (!document.getElementById(`${uid}-work-editor`)) editButton.current?.focus({ preventScroll: true }); });
  };
  const base = `campaigns/${campaignId}/work-items/${workId}`;
  useEffect(() => {
    const node = dialog.current;
    const opener = document.activeElement;
    node?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = overflow; if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, []);
  useEffect(() => {
    let live = true;
    Promise.all([api<Detail>(base), api<Page<Journal>>(`${base}/journals`), api<Page<History>>(`${base}/history`)])
      .then(([data, journals, changes]) => { if (live) { setDetail(data); setDescription(data.work.description ?? ""); setLogs(journals); setHistory(changes); } })
      .catch(e => { if (live) setError(e.message); });
    return () => { live = false; };
  }, [base]);
  const refresh = async () => {
    const [data, journals, changes] = await Promise.all([api<Detail>(base), api<Page<Journal>>(`${base}/journals`), api<Page<History>>(`${base}/history`)]);
    setDetail(data); setDescription(data.work.description ?? ""); setLogs(journals); setHistory(changes);
    setRevisionId(undefined);
    await onSaved();
  };
  const action = async (fn: () => Promise<void>) => {
    setBusy(true); setError(""); setNotice("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "처리할 수 없습니다."); }
    finally { setBusy(false); }
  };
  const more = async (kind: "journals" | "history") => {
    const current = kind === "journals" ? logs : history;
    if (!current.nextCursor) return;
    await action(async () => {
      if (kind === "journals") { const next = await api<Page<Journal>>(`${base}/journals?cursor=${current.nextCursor}`); setLogs(previous => ({ ...next, items: [...previous.items, ...next.items] })); }
      else { const next = await api<Page<History>>(`${base}/history?cursor=${current.nextCursor}`); setHistory(previous => ({ ...next, items: [...previous.items, ...next.items] })); }
    });
  };
  const logHistory = async (id: string, cursor?: string) => action(async () => {
    const next = await api<Page<History>>(`${base}/history?journalId=${id}${cursor ? `&cursor=${cursor}` : ""}`);
    setRevisions(previous => ({ ...next, items: cursor ? [...previous.items, ...next.items] : next.items })); setRevisionId(id);
  });
  const work = detail?.work;
  return <dialog ref={dialog} className="activity-drawer" aria-labelledby={`${uid}-title`} onCancel={e => { e.preventDefault(); if (!busy) { if (editingWork) closeWorkEditor(); else onClose(); } }} onClick={e => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <div className="drawer-header">
      <div><p className="eyebrow">{work?.kind === "SUBTASK" ? "세부 작업 상세" : "활동 상세"}</p><h2 id={`${uid}-title`}>{work?.name ?? "활동 불러오는 중"}</h2></div>
      <button className="secondary" onClick={onClose} disabled={busy} aria-label="활동 상세 닫기">닫기</button>
    </div>
    <div className="drawer-body">
      {error && <p className="error" role="alert">{error} <button className="quiet" disabled={busy} onClick={() => action(refresh)}>새로고침</button></p>}
      {notice && <p role="status" className="note">{notice}</p>}
      {work && <>
        <dl className="drawer-facts">
          <div><dt>상태</dt><dd>{labelStatus(work.status)}</dd></div><div><dt>담당자</dt><dd>{work.owner?.name ?? "미지정"}</dd></div>
          <div><dt>계획 기간</dt><dd>{day(work.plannedStart)} ~ {day(work.plannedEnd)}</dd></div>
          <div><dt>활동 계획 예산</dt><dd>{work.kind === "ACTIVITY" ? krw(work.budgetLines.reduce((n, line) => n + BigInt(line.plannedAmountKrw), 0n).toString()) : "배분 미지원"}</dd></div>
        </dl>
        {detail.canEdit && <button ref={editButton} className="secondary" disabled={busy || editingWork || editingContent || !!editingLog} aria-expanded={editingWork} aria-controls={`${uid}-work-editor`} onClick={() => setEditingWork(true)}>상태·일정·예산 수정</button>}
        {editingWork && <EntityForm id={`${uid}-work-editor`} autoFocus title={work.kind === "ACTIVITY" ? "활동 수정" : "세부 작업 수정"}
          path={base} fields={workFields(bootstrap, work.kind === "ACTIVITY")} values={workValues(campaign, work.strategyId, work.parentId, work)} editing
          onBusyChange={setBusy} onCancel={closeWorkEditor} onSaved={async () => { await refresh(); closeWorkEditor(); setNotice("활동을 수정했습니다."); }} />}
        <div className="tabs drawer-tabs" role="tablist" aria-label="활동 상세 메뉴" onKeyDown={e => {
          if (busy || editingWork || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
          e.preventDefault();
          const index = tabs.findIndex(t => t.key === tab);
          const next = e.key === "Home" ? 0 : e.key === "End" ? 2 : (index + (e.key === "ArrowRight" ? 1 : 2)) % 3;
          setTab(tabs[next].key); e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next].focus();
        }}>
          {tabs.map(t => <button key={t.key} id={`${uid}-${t.key}`} role="tab" aria-selected={tab === t.key} aria-controls={`${uid}-panel-${t.key}`} tabIndex={tab === t.key ? 0 : -1} disabled={busy || editingWork} onClick={() => setTab(t.key)}>{t.label}</button>)}
        </div>
        <section role="tabpanel" hidden={editingWork} id={`${uid}-panel-${tab}`} aria-labelledby={`${uid}-${tab}`}>
          {tab === "content" && <>
            <h3>활동 내용</h3>
            {editingContent ? <form onSubmit={e => { e.preventDefault(); void action(async () => {
              await api(`${base}/description`, "PATCH", { description: description || null, revision: work.revision });
              setEditingContent(false); await refresh(); setNotice("활동 내용을 저장했습니다.");
            }); }}>
              <label htmlFor={`${uid}-description`}>활동 내용 작성</label><textarea id={`${uid}-description`} value={description} onChange={e => setDescription(e.target.value)} maxLength={10000} rows={8} disabled={busy} placeholder="해야 할 일 / 완료 기준 / 참고 사항" />
              <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={() => { setEditingContent(false); setDescription(work.description ?? ""); }}>취소</button><button className="primary" disabled={busy}>{busy ? "저장 중…" : "내용 저장"}</button></div>
            </form> : <><p className="record-text">{work.description || "작성된 활동 내용이 없습니다."}</p>{detail.canEdit && <button className="secondary" disabled={busy} onClick={() => setEditingContent(true)}>내용 수정</button>}</>}
          </>}
          {tab === "journals" && <>
            <h3>업무일지</h3>
            {detail.canEdit && <form onSubmit={e => { e.preventDefault(); void action(async () => {
              await api(`${base}/journals${editingLog ? `/${editingLog.id}` : ""}`, editingLog ? "PATCH" : "POST", { body, ...(editingLog ? { revision: editingLog.revision } : {}) });
              setBody(""); setEditingLog(undefined); await refresh(); setNotice("업무일지를 저장했습니다.");
            }); }}>
              <label htmlFor={`${uid}-body`}>{editingLog ? "업무일지 수정 내용" : "업무일지 내용"}</label>
              <textarea id={`${uid}-body`} value={body} onChange={e => setBody(e.target.value)} rows={5} required maxLength={10000} disabled={busy} placeholder="오늘 진행한 일, 변경 사항, 다음 할 일을 기록해 주세요." />
              <div className="form-actions">{editingLog && <button type="button" className="secondary" disabled={busy} onClick={() => { setEditingLog(undefined); setBody(""); }}>수정 취소</button>}<button className="primary" disabled={busy}>{busy ? "저장 중…" : editingLog ? "일지 수정 저장" : "일지 추가"}</button></div>
            </form>}
            {!logs.items.length && <p className="muted">아직 작성된 업무일지가 없습니다.</p>}
            <ol className="record-list">{logs.items.map(log => <li key={log.id}>
              <p className="record-meta"><strong>{log.author.name}</strong> · <time dateTime={log.createdAt}>{timestamp(log.createdAt)}</time>{log.revision > 1 && <span> · 수정됨 ({log.revision}번째 버전)</span>}</p>
              <p className="record-text">{log.body}</p>
              <div className="row-actions">{log.canEdit && <button className="quiet" disabled={busy} aria-label={`업무일지 ${log.id} 수정`} onClick={() => { setEditingLog(log); setBody(log.body); dialog.current?.querySelector("textarea")?.focus(); }}>수정</button>}<button className="quiet" disabled={busy} aria-label={`업무일지 ${log.id} 수정 이력`} onClick={() => { if (revisionId === log.id) setRevisionId(undefined); else void logHistory(log.id); }}>수정 이력</button></div>
              {revisionId === log.id && <HistoryList page={revisions} busy={busy} onMore={() => void logHistory(log.id, revisions.nextCursor ?? undefined)} />}
            </li>)}</ol>
            {logs.nextCursor && <button className="secondary" disabled={busy} onClick={() => void more("journals")}>이전 일지 더 보기</button>}
          </>}
          {tab === "history" && <><h3>변경 이력</h3><HistoryList page={history} busy={busy} onMore={() => void more("history")} /></>}
        </section>
      </>}
    </div>
  </dialog>;
}
