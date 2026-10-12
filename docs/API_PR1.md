# PR 1 API

업무 API는 `docs/AUTH.md` 인증/인가 계약을 따른다. 응답은 `{data: ...}` 또는 `{error: {message: 한국어}}`. BIGINT 원화는 JSON 십진 문자열, DATE는 UTC 자정 ISO 문자열(화면은 YYYY-MM-DD). 조회는 no-store. POST 201, GET/PATCH/DELETE 200. 잘못된 입력 422, 수정 충돌/중복/자식 있는 삭제 409.

| 경로 | 메서드 | 설명 |
|---|---|---|
| `/api/bootstrap` | GET | 허용된 브랜드·국가·활성 담당자 선택지, 현재 계정 |
| `/api/brands` | GET, POST | 브랜드 목록/생성 (생성 ADMIN) |
| `/api/brands/:id` | PATCH, DELETE | 수정/빈 브랜드 삭제 (ADMIN) |
| `/api/brand-countries` | GET, POST | 국가 운영 목록/생성 (생성 ADMIN) |
| `/api/brand-countries/:id` | PATCH, DELETE | 수정/빈 국가 운영 삭제 (ADMIN) |
| `/api/campaigns` | GET, POST | 권한 범위 목록/생성 (생성 ADMIN) |
| `/api/campaigns/:id` | GET, PATCH, DELETE | 상세/수정/빈 캠페인 삭제 |
| `/api/campaigns/:id/strategies` | GET, POST | 전략 목록/생성 |
| `/api/campaigns/:id/strategies/:strategyId` | PATCH, DELETE | 전략 수정/빈 전략 삭제 |
| `/api/campaigns/:id/work-items` | GET, POST | 활동·세부 작업 조회/생성 |
| `/api/campaigns/:id/work-items/:workId` | PATCH, DELETE | 작업 수정/자식 없는 작업 삭제 |
| `/api/campaigns/:id/summary` | GET | 서버 계산 계획 집계 |

PATCH는 생성과 같은 전체 편집 필드와 정수 `revision`을 받는다. DELETE는 `?revision=N`을 요구한다. READ/CREATE/UPDATE/DELETE 기본 흐름은 목록과 상세에서 제공한다. 브랜드/국가는 bootstrap, 전략/작업은 캠페인 상세/각 목록에서 개별 객체를 조회한다. 임의 필드(집계값 등), 기존 계층 소속 변경은 거절한다.

활동 입력: `strategyId`, `parentId:null`, `kind:ACTIVITY`, `name`, `ownerId:null|UUID`, `status`, `plannedStart`, `plannedEnd`, `sortOrder`, 선택적 `plannedBudgetKrw:"정수"`. 세부 작업은 `kind:SUBTASK`, 같은 전략·캠페인의 상위 ACTIVITY ID를 `parentId`로 지정하고 `plannedBudgetKrw`는 보내지 않는다. 세부 작업을 완료해도 상위 활동 상태는 변경하지 않는다. 계획 수정은 `actualStart`, `actualEnd`를 변경하지 않는다.

예산은 `BudgetLine`의 `INITIAL` 항목 하나로 활동 기본 계획을 저장한다. 활동 편집은 이 항목만 변경한다. 세부 예산 항목/공통비/세부 작업 배분 편집 API는 PR 3에서 추가한다. 캠페인 한도는 계획 합계와 독립이며, 계획 한도 초과와 캠페인 기간 밖 작업은 읽기 화면에서 표시한다. 캠페인 기간 변경 시 활동 날짜를 자동 조정하지 않는다.

쓰기와 감사 이벤트는 같은 Serializable 트랜잭션에 저장하고, 충돌은 409로 반환한다. AuditEvent는 DB 트리거로 UPDATE/DELETE를 금지한다. PR 1 삭제는 승인 재무 기록이 없는 기초 엔터티에 한정한다. 후속 재무 기록은 별도 취소 정책을 구현해야 한다.
