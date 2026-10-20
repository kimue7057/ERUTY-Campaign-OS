"use client";
import { useId, useState } from "react";
import { seoulToday } from "../lib/domain";
import { barPosition, calendarDays, matchesSchedule, scheduleActivities, scheduleBounds, scheduleDay, scheduleTicks, validScheduleDate } from "../lib/schedule";
import { labelStatus, workStatuses, type Campaign, type Work } from "./types";

export function ScheduleTimeline({ campaign, onSelect, onAdd, disabled }: {
  campaign: Campaign; onSelect: (id: string) => void; onAdd: (strategyId: string) => void; disabled: boolean;
}) {
  const uid = useId();
  const [zoom, setZoom] = useState<"week" | "month">("week");
  const [strategy, setStrategy] = useState("");
  const [status, setStatus] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const today = seoulToday();
  const filters = { strategy, status, start, end };
  const invalidDate = !!((start && !validScheduleDate(start)) || (end && !validScheduleDate(end)));
  const invalid = invalidDate || !!(start && end && start > end);
  const bounds = scheduleBounds({ start: campaign.planStart, end: campaign.planEnd }, [
    ...campaign.workItems.map(item => ({ start: item.plannedStart, end: item.plannedEnd })),
    ...campaign.strategies.filter(item => item.planStart && item.planEnd).map(item => ({ start: item.planStart!, end: item.planEnd! })),
  ]);
  const range = { start: start || (end && end < bounds.start ? end : bounds.start), end: end || (start && start > bounds.end ? start : bounds.end) };
  const days = calendarDays(range.start, range.end);
  const width = Math.min(4800, Math.max(720, days * (zoom === "week" ? 22 : 7)));
  const ticks = scheduleTicks(range, zoom);
  const todayPosition = barPosition(today, today, range);
  const groups = scheduleActivities(campaign.workItems, filters);
  const matched = campaign.workItems.filter(item => matchesSchedule(item, filters));
  const toggle = (id: string) => setCollapsed(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const bar = (item: Work) => {
    const position = barPosition(item.plannedStart, item.plannedEnd, range);
    if (!position) return null;
    return <button type="button" className={`gantt-bar gantt-${item.status} ${item.kind === "SUBTASK" ? "gantt-subtask" : ""}`}
      style={{ left: `${position.left}%`, width: `${position.width}%` }}
      aria-label={`${item.name} 일정 막대: ${scheduleDay(item.plannedStart)}부터 ${scheduleDay(item.plannedEnd)}까지, ${labelStatus(item.status)}`}
      title={`${item.name} · ${scheduleDay(item.plannedStart)} ~ ${scheduleDay(item.plannedEnd)}${position.clipped ? " · 조회 기간에 맞춰 일부 표시" : ""}`}
      disabled={disabled} onClick={() => onSelect(item.id)}><span>{item.name}</span></button>;
  };
  const workRow = (item: Work, context = false, childCount = 0) => {
    const outside = scheduleDay(item.plannedStart) < scheduleDay(campaign.planStart) || scheduleDay(item.plannedEnd) > scheduleDay(campaign.planEnd);
    const overdue = item.status !== "COMPLETED" && scheduleDay(item.plannedEnd) < today;
    return <tr key={item.id} className={item.kind === "SUBTASK" ? "gantt-child-row" : ""}>
      <th scope="row" className="gantt-label">
        <div className="gantt-item-name">
          {childCount > 0 && <button type="button" className="gantt-toggle" aria-expanded={!collapsed.has(item.id)} aria-label={`${item.name} 세부 작업 ${collapsed.has(item.id) ? "펼치기" : "접기"}`} onClick={() => toggle(item.id)}>{collapsed.has(item.id) ? "▸" : "▾"}</button>}
          <button type="button" className="work-link" disabled={disabled} onClick={() => onSelect(item.id)} aria-label={`${item.name} 상세 보기`}>{item.kind === "SUBTASK" && "↳ "}{item.name}</button>
        </div>
        <p className="gantt-dates">{scheduleDay(item.plannedStart)} ~ {scheduleDay(item.plannedEnd)} · {calendarDays(item.plannedStart, item.plannedEnd)}일</p>
        <p className="gantt-meta">{labelStatus(item.status)} · {item.owner?.name ?? "미지정"}{context && " · 하위 작업의 상위 활동"}</p>
        {(outside || overdue) && <p className="gantt-warnings">{outside && <span>캠페인 기간 밖</span>}{overdue && <span>기한 초과</span>}</p>}
      </th>
      <td className="gantt-track-cell"><div className="gantt-track" style={{ width }}>
        {ticks.map(tick => <span aria-hidden="true" className="gantt-gridline" key={tick.date} style={{ left: `${tick.left}%` }} />)}
        {todayPosition && <span aria-hidden="true" className="gantt-today" style={{ left: `${todayPosition.left}%` }} />}
        {bar(item)}
      </div></td>
    </tr>;
  };
  return <section className="panel schedule-panel" aria-label="일정 간트">
    <div className="section-head"><div><h2>일정 간트</h2><p className="muted">막대나 활동명을 선택하면 내용·업무일지·변경 이력을 확인하고 일정을 수정할 수 있습니다.</p></div></div>
    <div className="gantt-toolbar">
      <div className="gantt-filter"><label htmlFor={`${uid}-strategy`}>전략 필터</label><select id={`${uid}-strategy`} value={strategy} onChange={e => setStrategy(e.target.value)}><option value="">모든 전략</option>{campaign.strategies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="gantt-filter"><label htmlFor={`${uid}-status`}>작업 상태 필터</label><select id={`${uid}-status`} value={status} onChange={e => setStatus(e.target.value)}><option value="">모든 상태</option>{Object.entries(workStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="gantt-filter"><label htmlFor={`${uid}-start`}>조회 시작일</label><input id={`${uid}-start`} type="date" min="0001-01-01" max="9999-12-31" value={start} onChange={e => setStart(e.target.value)} /></div>
      <div className="gantt-filter"><label htmlFor={`${uid}-end`}>조회 종료일</label><input id={`${uid}-end`} type="date" min="0001-01-01" max="9999-12-31" value={end} onChange={e => setEnd(e.target.value)} /></div>
      <button type="button" className="quiet" onClick={() => { setStrategy(""); setStatus(""); setStart(""); setEnd(""); }}>필터 초기화</button>
    </div>
    <div className="gantt-view-options">
      <div className="gantt-zoom" role="group" aria-label="간트 표시 단위"><button type="button" aria-pressed={zoom === "week"} onClick={() => setZoom("week")}>주 단위</button><button type="button" aria-pressed={zoom === "month"} onClick={() => setZoom("month")}>월 단위</button></div>
      <button type="button" className="quiet" onClick={() => setCollapsed(new Set())}>모두 펼치기</button>
      <button type="button" className="quiet" onClick={() => setCollapsed(new Set([...campaign.strategies.map(item => item.id), ...campaign.workItems.map(item => item.id)]))}>모두 접기</button>
      <span className="gantt-today-key">오늘 {today}</span>
    </div>
    {invalid ? <p role="alert" className="error">{invalidDate ? "올바른 조회 날짜를 입력해 주세요." : "조회 종료일은 시작일보다 빠를 수 없습니다."}</p> : <>
      <div className="section-head gantt-summary"><h3>계획 일정 목록</h3><p role="status">활동 {matched.filter(item => item.kind === "ACTIVITY").length}개 · 세부 작업 {matched.filter(item => item.kind === "SUBTASK").length}개</p></div>
      <p className="muted gantt-range">표시 기간 {range.start} ~ {range.end} · 시작일·종료일 포함 · 가로로 스크롤하여 전체 기간 확인</p>
      <div className="gantt-scroll" tabIndex={0} role="region" aria-label="계획 일정 표" aria-describedby={`${uid}-help`}>
        <table className="gantt-table" style={{ width: width + 320 }}>
          <caption className="sr-only">전략별 활동과 선택적 세부 작업의 현재 계획 일정. 왼쪽 열에 전체 날짜, 상태, 담당자를 표시합니다.</caption>
          <colgroup><col style={{ width: 320 }} /><col style={{ width }} /></colgroup>
          <thead><tr><th scope="col" className="gantt-label">전략 · 활동 · 세부 작업</th><th scope="col" className="gantt-axis-cell"><div className="gantt-axis" style={{ width }}><span className="sr-only">{zoom === "week" ? "주" : "월"} 단위 일정</span>{ticks.map(tick => <span aria-hidden="true" key={tick.date} style={{ left: `${tick.left}%` }}>{zoom === "week" ? tick.date.slice(5).replace("-", ".") : tick.date.slice(0, 7).replace("-", ".")}</span>)}</div></th></tr></thead>
          <tbody>{campaign.strategies.filter(item => !strategy || item.id === strategy).flatMap(item => {
            const activities = groups.filter(group => group.activity.strategyId === item.id);
            if (!activities.length && (status || start || end)) return [];
            const position = item.planStart && item.planEnd ? barPosition(item.planStart, item.planEnd, range) : null;
            return [<tr key={item.id} className="gantt-strategy-row"><th scope="row" className="gantt-label"><div className="gantt-strategy-name"><button type="button" className="gantt-toggle" aria-expanded={!collapsed.has(item.id)} aria-label={`${item.name} 전략 ${collapsed.has(item.id) ? "펼치기" : "접기"}`} onClick={() => toggle(item.id)}>{collapsed.has(item.id) ? "▸" : "▾"}</button><strong>{item.name}</strong>{campaign.canEdit && <button type="button" className="quiet gantt-add" disabled={disabled} aria-label={`${item.name} 일정 활동 추가`} onClick={() => onAdd(item.id)}>+ 활동</button>}</div><p className="gantt-dates">{item.planStart && item.planEnd ? `${scheduleDay(item.planStart)} ~ ${scheduleDay(item.planEnd)}` : "전략 기간 미설정"}</p></th><td className="gantt-track-cell"><div className="gantt-track" style={{ width }}>{position && <span className="gantt-strategy-bar" style={{ left: `${position.left}%`, width: `${position.width}%` }} aria-label={`${item.name} 전략 계획 기간`} />}</div></td></tr>,
              ...(!collapsed.has(item.id) ? activities.flatMap(group => [workRow(group.activity, !group.matches, group.children.length), ...(!collapsed.has(group.activity.id) ? group.children.map(child => workRow(child)) : [])]) : []),
            ];
          })}</tbody>
        </table>
      </div>
      {!matched.length && <p className="empty">조건에 맞는 활동·세부 작업이 없습니다.</p>}
    </>}
    <p id={`${uid}-help`} className="muted gantt-help">날짜는 활동 상세의 ‘상태·일정·예산 수정’에서 변경합니다. 필터·펼치기·표시 단위 변경은 저장된 일정을 바꾸지 않습니다. 드래그 편집·선후행 관계·기준 일정은 후속 개발 예정입니다.</p>
  </section>;
}
