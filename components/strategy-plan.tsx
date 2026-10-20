import { day, krw, type Strategy, type Work, type Campaign } from "./types";

export function StrategyPlan({ strategy, workItems, campaign }: { strategy: Strategy; workItems: Work[]; campaign: Campaign }) {
  const activities = workItems.filter(w => w.strategyId === strategy.id && w.kind === "ACTIVITY");
  const allocated = activities.reduce((total, w) => total + w.budgetLines.reduce((sum, l) => sum + BigInt(l.plannedAmountKrw), 0n), 0n);
  const remaining = strategy.budgetCeilingKrw === null ? null : BigInt(strategy.budgetCeilingKrw) - allocated;
  const start = strategy.planStart ? day(strategy.planStart) : null;
  const end = strategy.planEnd ? day(strategy.planEnd) : null;
  const outside = start && end ? workItems.filter(w => w.strategyId === strategy.id && (day(w.plannedStart) < start || day(w.plannedEnd) > end)).length : 0;
  const days = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) + 1 : null;
  return <div className="strategy-plan">
    <span>전략 기간 <strong>{start && end ? `${start} ~ ${end} · ${days}일` : "미설정"}</strong></span>
    <span>전략 예산 한도 <strong>{strategy.budgetCeilingKrw === null ? "미설정" : krw(strategy.budgetCeilingKrw)}</strong></span>
    <span>활동 배정 <strong>{krw(allocated.toString())}</strong></span>
    <span>전략 남은 예산 <strong>{remaining === null ? "미설정" : krw(remaining.toString())}</strong></span>
    {remaining !== null && remaining < 0n && <span className="badge warning">전략 예산 한도 초과</span>}
    {outside > 0 && <span className="badge warning">전략 기간 밖 작업 {outside}개</span>}
    {start && end && (start < day(campaign.planStart) || end > day(campaign.planEnd)) && <span className="badge warning">캠페인 기간 밖 전략</span>}
  </div>;
}
