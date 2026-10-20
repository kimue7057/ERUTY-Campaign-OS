# 확정 설계 기준 (ADR-000)

## 사용자 및 목적
- 이루티 직원 전용 웹 애플리케이션. 외부 제조사·크리에이터 포털은 제외.
- 활동 일정/예산의 계획·실제·증빙을 캠페인까지 연결하여 검토.

## 계층
Brand -> BrandCountry -> Campaign -> Strategy -> WorkItem(ACTIVITY) -> WorkItem(SUBTASK, optional).
- 캠페인에는 복수 활동이 동시에 실행될 수 있음.
- 캠페인에는 승인된 예산 한도(ceiling)와 활동/공통비 계획 예산 합계(allocation)가 따로 존재함.
- 활동은 세부 작업이 하나도 없어도 독립 동작함.

## 화면
- `/`: 임시 캠페인 진입 화면(향후 캠페인 목록)
- `/campaigns/[id]`: 캠페인 개요 (1차 PR)
- `/campaigns/[id]/schedule`: 일정 간트 화면 (2차 PR)
- `/campaigns/[id]/budget`: 예산/비용 화면 (3차 PR)
- 별도의 직원 개인 업무 화면 없음.

## 핵심 계산
- allocated = SUM(activity budget lines) + SUM(campaign common lines)
- subtask allocation은 위 SUM에 포함하지 않음 (분할 배정만 의미)
- activity-plan unallocated = ceiling - allocated; negative -> 활동 계획 초과 경고
- 캠페인 개요와 예산 탭의 전략 배정 예산 = SUM(strategy budget ceilings). 캠페인 남은 예산 = 캠페인 한도 - 전략 배정 예산; negative -> 전략 배정 초과 경고. 전략 미설정 예산은 합계에서 제외하고 개수를 표시한다. 전략 내부의 남은 예산은 전략 한도 - 활동 배정 합계이다. 전략 배정과 활동 계획을 합산하거나 캠페인 잔여에서 두 번 차감하지 않는다. (2026-10-13 사용자 확정)
- incurred = SUM(effective approved expenses); draft/reversed 제외
- paid = SUM(effective cleared payments) net of reversals
- unpaid = incurred - paid, 동일 지급 대상 범위에서 계산
- open commitment = approved commitment - commitments를 충족한 연결 approved expenses (중복 합산 금지)
- KRW integer won, FX quote snapshot stored, explicit VAT mode; historical amounts are not repriced automatically.

## 일정
- start/end are YYYY-MM-DD inclusive, Asia/Seoul for comparisons.
- baseline is separately snapshotted and immutable upon approval.
- plan shift moves start/end equally; resize changes one endpoint only; actual dates never silently changed.
- FS dependency with nonnegative lag; reject cycle, same-node, improper ancestor edge.
- successor scheduling changes need **preview then explicit confirm**.

## 보안 및 운영

- 2026-10-15 사용자 요청: 캠페인별 실제 순판매액·이루티 매출·발생 비용을 집계 기준일과 함께 수기 누적값으로 저장한다. 목표/예산과 별도이며 비용 원장 승인·지급액으로 취급하지 않는다. 기존 값 대체와 감사 기록으로 중복 가산을 방지하며 미입력(null)과 0원을 구분한다. 대시보드는 서버에서 조회 권한 범위의 입력 금액만 합산한다.
- Internal login required for all persisted application data; server-side campaign membership/role checks.
- Server-validated finance writes and traceable audit events; private attachment storage and signed read.
- Demo records must be labeled clearly, isolated from production.

## 결정 유보 (Codex가 추천 후 확정)
- 구체적 인증 공급자 (사내 도메인/계정 정책 확인 후)
- PostgreSQL 호스팅 및 비공개 스토리지 공급자
- 간트차트 라이브러리 최종 선정(라이선스/React 버전/접근성/기능 조사)
- 배포 도메인 및 운영 환경

결정이 미확정이어도 Mock/Demo 시안과 DB schema proposal은 가능하지만, 실제 외부 서비스 배포나 실데이터 투입은 승인 전 진행하지 않는다.
