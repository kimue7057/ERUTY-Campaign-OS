"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";
import { EntityForm, DeleteButton, type Field } from "./entity-form";
import { campaignFields, workFields } from "./campaign-fields";
import { StrategyPlan } from "./strategy-plan";
import { ActivityDrawer } from "./activity-drawer";
import { CampaignActuals } from "./campaign-actuals";
import { actualFields } from "../lib/actuals";
import { seoulToday } from "../lib/domain";
import {
  krw,
  day,
  labelStatus,
  type Bootstrap,
  type Campaign,
  type Strategy,
  type Work,
} from "./types";
type Editor = {
  title: string;
  path: string;
  fields: Field[];
  values: Record<string, unknown>;
  editing?: boolean;
  hint?: string;
};
export default function CampaignDetail({
  id,
  tab = "overview",
}: {
  id: string;
  tab?: "overview" | "schedule" | "budget";
}) {
  const [c, setC] = useState<Campaign>();
  const [b, setB] = useState<Bootstrap>();
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor>();
  const [selectedWork, setSelectedWork] = useState<string>();
  const router = useRouter();
  const load = () =>
    Promise.all([api<Campaign>(`campaigns/${id}`), api<Bootstrap>("bootstrap")])
      .then(([campaign, bootstrap]) => {
        setC(campaign);
        setB(bootstrap);
        setError("");
      })
      .catch((e) => setError(e.message));
  useEffect(() => {
    let live = true;
    Promise.all([api<Campaign>(`campaigns/${id}`), api<Bootstrap>("bootstrap")])
      .then(([campaign, bootstrap]) => {
        if (live) {
          setC(campaign);
          setB(bootstrap);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [id]);
  if (!c || !b)
    return (
      <>
        <Link className="back-link" href="/">
          ← 캠페인 목록
        </Link>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : (
          <p className="empty" role="status">
            캠페인을 불러오는 중입니다…
          </p>
        )}
      </>
    );
  const editCampaign = () =>
    setEditor({
      title: "캠페인 수정",
      path: `campaigns/${id}`,
      fields: campaignFields(b, true),
      editing: true,
      values: {
        name: c.name,
        brandCountryId: c.brandCountryId,
        ownerId: c.ownerId,
        status: c.status,
        planStart: day(c.planStart),
        planEnd: day(c.planEnd),
        budgetCeilingKrw: c.budgetCeilingKrw,
        targetNetSalesKrw: c.targetNetSalesKrw,
        targetErutyRevenueKrw: c.targetErutyRevenueKrw,
        vatPolicy: c.vatPolicy,
        revision: c.revision,
      },
    });
  const editStrategy = (strategy?: Strategy) =>
    setEditor({
      title: strategy ? "전략 수정" : "전략 추가",
      path: `campaigns/${id}/strategies${strategy ? `/${strategy.id}` : ""}`,
      fields: [
        { key: "name", label: "전략명" },
        { key: "planStart", label: "전략 시작일", type: "date", nullable: true },
        { key: "planEnd", label: "전략 종료일", type: "date", nullable: true },
        { key: "budgetCeilingKrw", label: "전략 예산 한도 (원)", type: "money", nullable: true },
        { key: "sortOrder", label: "정렬 순서", type: "number" },
      ],
      editing: !!strategy,
      values: strategy
        ? {
            name: strategy.name,
            planStart: strategy.planStart ? day(strategy.planStart) : null,
            planEnd: strategy.planEnd ? day(strategy.planEnd) : null,
            budgetCeilingKrw: strategy.budgetCeilingKrw,
            sortOrder: strategy.sortOrder,
            revision: strategy.revision,
          }
        : { name: "", sortOrder: c.strategies.length, planStart: day(c.planStart), planEnd: day(c.planEnd), budgetCeilingKrw: null },
    });
  const editActuals = () => setEditor({
    title: "실제 매출·발생 비용 입력", path: `campaigns/${id}/actuals`, editing: true,
    hint: "집계 기준일까지의 누적 금액을 입력하세요. 기존 금액을 대체하며, 빈 금액은 미입력으로 저장합니다.",
    fields: [
      ...actualFields.map(({ key, label }) => ({ key, label: `${label} (원)`, type: "money" as const, nullable: true })),
      { key: "actualsAsOfDate", label: "집계 기준일", type: "date", nullable: true },
      { key: "actualsNote", label: "집계 메모", type: "textarea", nullable: true },
    ],
    values: { actualNetSalesKrw: c.actualNetSalesKrw, actualErutyRevenueKrw: c.actualErutyRevenueKrw, actualIncurredCostKrw: c.actualIncurredCostKrw, actualsAsOfDate: c.actualsAsOfDate ? day(c.actualsAsOfDate) : seoulToday(), actualsNote: c.actualsNote, revision: c.revision },
  });
  const editWork = (
    strategyId: string,
    parentId: string | null,
    item?: Work,
  ) => {
    const activity = !parentId;
    const strategy = c.strategies.find(s => s.id === strategyId);
    setEditor({
      title: item
        ? activity
          ? "활동 수정"
          : "세부 작업 수정"
        : activity
          ? "활동 추가"
          : "세부 작업 추가",
      path: `campaigns/${id}/work-items${item ? `/${item.id}` : ""}`,
      fields: workFields(b, activity),
      editing: !!item,
      values: {
        strategyId,
        parentId,
        kind: activity ? "ACTIVITY" : "SUBTASK",
        name: item?.name ?? "",
        description: item?.description ?? null,
        ownerId: item?.ownerId ?? null,
        status: item?.status ?? "PLANNED",
        plannedStart: day(item?.plannedStart ?? strategy?.planStart ?? c.planStart),
        plannedEnd: day(item?.plannedEnd ?? strategy?.planEnd ?? c.planEnd),
        sortOrder: item?.sortOrder ?? c.workItems.length,
        ...(item ? { revision: item.revision } : {}),
        ...(activity
          ? {
              plannedBudgetKrw:
                item?.budgetLines.find((l) => l.category === "INITIAL")
                  ?.plannedAmountKrw ?? "0",
            }
          : {}),
      },
    });
  };
  const workRows = (item: Work) => {
    const outside =
      day(item.plannedStart) < day(c.planStart) ||
      day(item.plannedEnd) > day(c.planEnd);
    return (
      <tr key={item.id}>
        <td>
          <span
            className={`work-name ${item.kind === "SUBTASK" ? "subtask-name" : ""}`}
          >
            {item.kind === "SUBTASK" && <span aria-hidden="true">↳ </span>}
            <button className="work-link" disabled={!!editor} onClick={() => setSelectedWork(item.id)} aria-label={`${item.name} 상세 보기`}>{item.name}</button>
          </span>
          {outside && <span className="badge warning">캠페인 기간 밖</span>}
        </td>
        <td>
          <span className={`badge state-${item.status}`}>
            {labelStatus(item.status)}
          </span>
        </td>
        <td>{item.owner?.name ?? "미지정"}</td>
        <td className="date-cell">
          {day(item.plannedStart)}
          <br />
          {day(item.plannedEnd)}
        </td>
        <td className="money-cell">
          {item.kind === "ACTIVITY"
            ? krw(
                item.budgetLines
                  .reduce((n, l) => n + BigInt(l.plannedAmountKrw), 0n)
                  .toString(),
              )
            : "배분 미지원"}
        </td>
        {c.canEdit && (
          <td>
            <div className="row-actions">
              <button
                disabled={!!editor}
                className="quiet"
                aria-label={`${item.name} 수정`}
                onClick={() => editWork(item.strategyId, item.parentId, item)}
              >
                수정
              </button>
              {item.kind === "ACTIVITY" && (
                <button
                  disabled={!!editor}
                  className="quiet"
                  aria-label={`${item.name} 세부 작업 추가`}
                  onClick={() => editWork(item.strategyId, item.id)}
                >
                  + 세부 작업
                </button>
              )}
              <DeleteButton
                disabled={!!editor}
                path={`campaigns/${id}/work-items/${item.id}`}
                revision={item.revision}
                name={item.name}
                onDeleted={load}
              />
            </div>
          </td>
        )}
      </tr>
    );
  };
  return (
    <>
      {selectedWork && <ActivityDrawer key={selectedWork} campaignId={id} workId={selectedWork} onClose={() => setSelectedWork(undefined)} onSaved={load} onEdit={work => { setSelectedWork(undefined); editWork(work.strategyId, work.parentId, work); }} />}
      <nav className="breadcrumb" aria-label="현재 위치">
        <Link href="/">캠페인</Link>
        <span>/</span>
        <Link href="/brands">{c.brandCountry.brand.name}</Link>
        <span>/</span>
        <span>{c.brandCountry.countryName}</span>
      </nav>
      <div className="page-head">
        <div>
          <div className="title-tags">
            <span className="country-tag">
              {c.brandCountry.countryCode} · {c.brandCountry.countryName}
            </span>
            {c.isDemo && <span className="badge demo">DEMO</span>}
            <span className={`badge state-${c.status}`}>
              {labelStatus(c.status)}
            </span>
          </div>
          <h1>{c.name}</h1>
          <p className="subtitle">
            담당자 {c.owner?.name ?? "미지정"}{" "}
            <span className="meta-dot">·</span> 계획 {day(c.planStart)} →{" "}
            {day(c.planEnd)} <span className="meta-dot">·</span>{" "}
            {c.summary.calendarDays}일
          </p>
        </div>
        {c.canEdit && (
          <button
            disabled={!!editor}
            className="secondary"
            onClick={editCampaign}
          >
            캠페인 수정
          </button>
        )}
      </div>
      <nav className="tabs" aria-label="캠페인 메뉴">
        {[
          { key: "overview", label: "개요", path: "" },
          { key: "schedule", label: "일정", path: "/schedule" },
          { key: "budget", label: "예산 · 비용", path: "/budget" },
        ].map((t) => (
          <Link
            key={t.key}
            aria-current={tab === t.key ? "page" : undefined}
            href={`/campaigns/${id}${t.path}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {editor && (
        <EntityForm
          key={`${editor.path}-${editor.title}`}
          {...editor}
          onSaved={async () => {
            await load();
            setEditor(undefined);
          }}
          onCancel={() => setEditor(undefined)}
        />
      )}
      {tab === "overview" && (
        <>
          <div className="stats-grid">
            <div className="metric">
              <span>캠페인 예산 한도</span>
              <strong className="amount">{krw(c.budgetCeilingKrw)}</strong>
              <p>
                {c.vatPolicy === "INCLUDED" ? "부가세 포함" : "부가세 별도"}
              </p>
            </div>
            <div className="metric">
              <span>전략 배정 예산</span>
              <strong className="amount">
                {krw(c.summary.allocatedStrategyKrw)}
              </strong>
              <Link href={`/campaigns/${id}/budget`}>전략별 배정 보기 →</Link>
              {c.summary.unbudgetedStrategyCount > 0 && <p>예산 미설정 전략 {c.summary.unbudgetedStrategyCount}개</p>}
            </div>
            <div className="metric">
              <span>순판매액 목표</span>
              <strong className="amount">{krw(c.targetNetSalesKrw)}</strong>
              <p>실제 순판매액: {c.actualNetSalesKrw === null ? "미입력" : krw(c.actualNetSalesKrw)}</p>
            </div>
            <div className="metric">
              <span>이루티 매출 목표</span>
              <strong className="amount">{krw(c.targetErutyRevenueKrw)}</strong>
              <p>실제 이루티 매출: {c.actualErutyRevenueKrw === null ? "미입력" : krw(c.actualErutyRevenueKrw)}</p>
            </div>
          </div>
          <div className="overview-strip">
            <div>캠페인 남은 예산 <strong>{krw(c.summary.unallocatedStrategyKrw)}</strong>{c.summary.strategyOverBudget && <span className="badge warning">한도 초과</span>}</div>
            <div>
              <span className="dot green" />
              활동 <strong>{c.summary.activityCount}</strong>
            </div>
            <div>
              완료 <strong>{c.summary.completedCount}</strong>
            </div>
            <div>
              기한 경과 <strong>{c.summary.overdueCount}</strong>
            </div>
            <div>
              기준 일정 <strong>미설정</strong>
            </div>
            <div>
              발생 비용 <strong>{c.actualIncurredCostKrw === null ? "미입력" : krw(c.actualIncurredCostKrw)}</strong> · 지급액 <strong>미연결</strong>
            </div>
          </div>
          <CampaignActuals campaign={c} onEdit={editActuals} disabled={!!editor} />
          <div className="section-head">
            <div>
              <h2>전략과 활동</h2>
              <p className="muted">
                활동은 독립적으로 관리하며, 필요한 경우에만 세부 작업을
                추가하세요.
              </p>
            </div>
            {c.canEdit && (
              <button
                disabled={!!editor}
                className="primary"
                onClick={() => editStrategy()}
              >
                + 전략 추가
              </button>
            )}
          </div>
          {c.strategies.length === 0 && (
            <div className="empty">
              <h3>첫 전략을 추가해 주세요.</h3>
              <p>
                전략 아래에 활동을 만들면 일정과 예산 계획을 시작할 수 있습니다.
              </p>
            </div>
          )}
          <div className="strategy-stack">
            {c.strategies.map((strategy) => {
              const activities = c.workItems.filter(
                (w) => w.strategyId === strategy.id && w.kind === "ACTIVITY",
              );
              const total = activities.reduce(
                (n, w) =>
                  n +
                  w.budgetLines.reduce(
                    (sum, l) => sum + BigInt(l.plannedAmountKrw),
                    0n,
                  ),
                0n,
              );
              return (
                <section className="strategy-panel" key={strategy.id}>
                  <div className="strategy-head">
                    <div>
                      <span className="strategy-icon" aria-hidden="true">
                        ≡
                      </span>
                      <h3>{strategy.name}</h3>
                      <span className="count">활동 {activities.length}</span>
                      <span className="strategy-amount">
                        {krw(total.toString())}
                      </span>
                    </div>
                    {c.canEdit && (
                      <div className="row-actions">
                        <button
                          disabled={!!editor}
                          className="secondary compact"
                          aria-label={`${strategy.name} 활동 추가`}
                          onClick={() => editWork(strategy.id, null)}
                        >
                          + 활동 추가
                        </button>
                        <button
                          disabled={!!editor}
                          className="quiet"
                          aria-label={`${strategy.name} 수정`}
                          onClick={() => editStrategy(strategy)}
                        >
                          수정
                        </button>
                        <DeleteButton
                          disabled={!!editor}
                          path={`campaigns/${id}/strategies/${strategy.id}`}
                          revision={strategy.revision}
                          name={strategy.name}
                          onDeleted={load}
                        />
                      </div>
                    )}
                  </div>
                  <StrategyPlan strategy={strategy} workItems={c.workItems} campaign={c} />
                  {activities.length ? (
                    <div
                      className="table-scroll"
                      tabIndex={0}
                      aria-label={`${strategy.name} 활동 표`}
                    >
                      <table>
                        <thead>
                          <tr>
                            <th>활동 · 세부 작업</th>
                            <th>상태</th>
                            <th>담당자</th>
                            <th>계획 시작 · 종료</th>
                            <th className="money-cell">계획 예산</th>
                            {c.canEdit && <th>관리</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {activities.flatMap((w) => [
                            workRows(w),
                            ...c.workItems
                              .filter((sub) => sub.parentId === w.id)
                              .map(workRows),
                          ])}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="empty compact-empty">
                      등록된 활동이 없습니다.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
          {c.canEdit && (
            <div className="campaign-delete">
              <DeleteButton
                disabled={!!editor}
                path={`campaigns/${id}`}
                revision={c.revision}
                name={c.name}
                onDeleted={() => router.push("/")}
              />
              <p className="muted">
                하위 데이터가 있는 캠페인은 삭제할 수 없습니다. 보관 상태로
                관리할 수 있습니다.
              </p>
            </div>
          )}
        </>
      )}
      {tab === "schedule" && (
        <>
          <section className="panel"><h2>전략별 계획 기간</h2>{c.strategies.map(strategy => <div key={strategy.id}><h3>{strategy.name}</h3><StrategyPlan strategy={strategy} workItems={c.workItems} campaign={c} /></div>)}</section>
          <aside className="note">
            <strong>현재 계획 일정</strong>
            <p>
              간트차트·드래그·선후행 관계·기준 일정은 준비 중입니다. 날짜, 상태,
              담당자는 개요의 활동 수정에서 관리하세요.
            </p>
            <Link href={`/campaigns/${id}`}>전략과 활동 관리 →</Link>
          </aside>
          <section className="panel">
            <div className="section-head">
              <h2>계획 일정 목록</h2>
              <span className="muted">날짜 구간은 시작일·종료일 포함</span>
            </div>
            <div
              className="table-scroll"
              tabIndex={0}
              aria-label="계획 일정 표"
            >
              <table>
                <thead>
                  <tr>
                    <th>전략</th>
                    <th>활동 · 세부 작업</th>
                    <th>계획 시작일</th>
                    <th>계획 종료일</th>
                    <th>담당자</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {c.strategies.flatMap((s) =>
                    c.workItems
                      .filter(
                        (w) => w.strategyId === s.id && w.kind === "ACTIVITY",
                      )
                      .flatMap((w) => [
                        w,
                        ...c.workItems.filter((sub) => sub.parentId === w.id),
                      ])
                      .map((w) => (
                        <tr key={w.id}>
                          <td>{s.name}</td>
                          <td
                            className={
                              w.kind === "SUBTASK" ? "subtask-name" : ""
                            }
                          >
                            {w.kind === "SUBTASK" ? "↳ " : ""}
                            <button className="work-link" onClick={() => setSelectedWork(w.id)} aria-label={`${w.name} 상세 보기`}>{w.name}</button>
                            {(day(w.plannedStart) < day(c.planStart) ||
                              day(w.plannedEnd) > day(c.planEnd)) && (
                              <span className="badge warning">
                                캠페인 기간 밖
                              </span>
                            )}
                          </td>
                          <td className="date-cell">{day(w.plannedStart)}</td>
                          <td className="date-cell">{day(w.plannedEnd)}</td>
                          <td>{w.owner?.name ?? "미지정"}</td>
                          <td>
                            <span className={`badge state-${w.status}`}>
                              {labelStatus(w.status)}
                            </span>
                          </td>
                        </tr>
                      )),
                  )}
                </tbody>
              </table>
              {!c.workItems.length && (
                <p className="empty">등록된 활동이 없습니다.</p>
              )}
            </div>
          </section>
        </>
      )}
      {tab === "budget" && (
        <>
          <CampaignActuals campaign={c} onEdit={editActuals} disabled={!!editor} />
          <div className="stats-grid three">
            <div className="metric">
              <span>승인 예산 한도</span>
              <strong className="amount">{krw(c.budgetCeilingKrw)}</strong>
              <p>
                {c.vatPolicy === "INCLUDED" ? "부가세 포함" : "부가세 별도"}
              </p>
            </div>
            <div className="metric">
              <span>전략 배정 예산</span>
              <strong className="amount">
                {krw(c.summary.allocatedStrategyKrw)}
              </strong>
              <p>전략별 예산 한도 합계</p>
              {c.summary.unbudgetedStrategyCount > 0 && <p>예산 미설정 전략 {c.summary.unbudgetedStrategyCount}개</p>}
            </div>
            <div
              className={`metric ${c.summary.strategyOverBudget ? "over-budget" : ""}`}
            >
              <span>
                {c.summary.strategyOverBudget ? "예산 한도 초과" : "캠페인 남은 예산"}
              </span>
              <strong className="amount">
                {krw(c.summary.unallocatedStrategyKrw)}
              </strong>
              <p>캠페인 한도 − 전략 배정 합계</p>
            </div>
          </div>
          <section className="panel"><h2>전략별 예산 한도 · 잔여</h2>{c.strategies.map(strategy => <div key={strategy.id}><h3>{strategy.name}</h3><StrategyPlan strategy={strategy} workItems={c.workItems} campaign={c} /></div>)}</section>
          <aside className="note">
            <strong>기초 예산 계획</strong>
            <p>
              캠페인 배정·잔여는 전략 예산을 기준으로 표시하며, 전략 잔여는
              소속 활동 예산을 차감합니다. 세부 작업 배분·공통비
              편집과 계약·활동별 발생 비용·지급·증빙 관리는 준비 중입니다.
              캠페인 전체의 수기 발생 비용은 위 실적에 표시하며, 활동별 비용 원장과 지급액은 미연결입니다.
            </p>
            <Link href={`/campaigns/${id}`}>활동 예산 수정 →</Link>
          </aside>
          <section className="panel">
            <h2>활동별 계획 예산</h2>
            <div
              className="table-scroll"
              tabIndex={0}
              aria-label="활동 계획 예산 표"
            >
              <table>
                <thead>
                  <tr>
                    <th>전략</th>
                    <th>활동</th>
                    <th className="money-cell">계획 예산</th>
                    <th>발생 비용</th>
                    <th>지급액</th>
                  </tr>
                </thead>
                <tbody>
                  {c.strategies.flatMap((s) =>
                    c.workItems
                      .filter(
                        (w) => w.strategyId === s.id && w.kind === "ACTIVITY",
                      )
                      .map((w) => (
                        <tr key={w.id}>
                          <td>{s.name}</td>
                          <td><button className="work-link" onClick={() => setSelectedWork(w.id)} aria-label={`${w.name} 상세 보기`}>{w.name}</button></td>
                          <td className="money-cell">
                            {krw(
                              w.budgetLines
                                .reduce(
                                  (n, l) => n + BigInt(l.plannedAmountKrw),
                                  0n,
                                )
                                .toString(),
                            )}
                          </td>
                          <td className="muted">미연결</td>
                          <td className="muted">미연결</td>
                        </tr>
                      )),
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={2}>계획 합계</th>
                    <td className="money-cell">
                      {krw(c.summary.allocatedPlanKrw)}
                    </td>
                    <td>미연결</td>
                    <td>미연결</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}
    </>
  );
}
