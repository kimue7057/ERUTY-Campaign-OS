# 캠페인 수기 매출·발생 비용

## 범위와 저장소 분석

대시보드에는 실제 매출·발생 비용이 미연결로 표시되고, 캠페인에는 매출 목표와 예산 계획만 저장되어 있었다. 사용자 요청에 따라 실제 순판매액·이루티 매출·발생 비용을 캠페인별 누적 실적으로 직접 입력한다. 수기 집계이며 판매채널 API, 자동 회계 인식, 승인 비용 원장이나 지급 처리는 추가하지 않는다.

기존 Next.js/React/TypeScript/Prisma/PostgreSQL과 인증·캠페인 권한을 유지한다. 새 의존성은 없다. 설치 패키지의 기존 MIT React/Next.js/Zod, Apache-2.0 Prisma/Playwright 기반이며 npm audit 취약점 0건을 확인했다. 구현 순서는 nullable 필드·DB 검증 → 권한·버전·감사 API → 캠페인 입력과 대시보드 → 단위/통합/E2E 검증이다.

## 입력과 계산

- 캠페인 개요와 예산 화면의 **실제 매출·비용 입력** 버튼에서 세 금액, 집계 기준일, 집계 메모를 입력한다. 금액은 각각 독립적인 정수 원화이다.
- 기준일까지의 **누적값을 대체**한다. 재입력 금액을 기존 금액에 더하지 않는다. 실적이 있는 경우 기준일이 필요하다. 부가세는 캠페인 설정의 입력 기준을 따른다.
- 기존 캠페인은 모두 null로 시작하며 0원을 임의로 채우지 않는다. 빈 금액은 미입력, 명시적인 0원은 집계된 0원으로 구분한다. 금액은 0 이상 PostgreSQL BIGINT 범위다.
- 순판매액 목표·이루티 매출 목표와 실제 값은 별도이다. 입력으로 목표·예산·전략 배정·활동 예산·지급액을 변경하지 않는다. 일반 캠페인 수정도 실적을 덮어쓰지 않는다.
- 대시보드는 조회 권한이 있는 캠페인만 서버에서 합산한다. 금액별 입력 캠페인 수를 함께 표시하고 미입력은 합계에서 제외한다. 순판매액·이루티 매출·발생 비용을 서로 더하거나 상계하지 않는다.
- 수기 발생 비용은 승인된 비용 원장과 구분한다. 지급액·활동별 비용은 계속 별도이며, 수기 비용을 전략 배정 잔여에서 다시 차감하지 않는다.
- 수정과 미입력으로 정정한 경우에도 이전 금액·기준일·메모와 작성자·시각을 감사 이벤트에 보존한다. 수정은 캠페인 revision 검사와 직렬화 트랜잭션을 따른다. 이력은 50개씩 더 불러올 수 있다.

## 변경 파일과 API

- prisma/schema.prisma 및 여덟 번째 마이그레이션: Campaign에 actualNetSalesKrw / actualErutyRevenueKrw / actualIncurredCostKrw nullable BIGINT, actualsAsOfDate DATE, actualsNote TEXT를 추가한다. 음수·본문 길이·기준일 CHECK를 적용하고 기존 데이터를 보존한다.
- lib/actuals.ts: 정밀 합계·입력 개수와 변경 전후 표시. lib/campaign-actuals.ts: 저장·수정 이력·조회 범위 제한. lib/validation.ts: 엄격한 금액·기준일·메모 검증.
- app/api/[...segments]/route.ts: PATCH /api/campaigns/:id/actuals, GET 같은 경로로 입력 이력 조회(cursor 지원), GET /api/dashboard-summary로 권한 범위의 실적 합계 조회.
- components/campaign-actuals.tsx: 캠페인 실적·집계 메모·수정 이력. campaign-detail.tsx: 기존 편집기에 실적 입력 연결. campaign-list.tsx: 실적 합계와 캠페인별 수기 값. entity-form.tsx: 누적 입력 안내. types.ts: 새 실적 필드.
- 기존 캠페인 RLS·서버 전용 역할 권한과 Origin 검사를 유지한다. VIEWER는 조회만 가능하고 ADMIN/캠페인 EDITOR만 저장한다. 목표/집계 위조 필드는 거절한다.

## 실행과 검증

환경은 .env.example 기준으로 설정한다. `npm ci`, `npm run db:migrate`, `npm run dev` 순서로 실행한다. 테스트 DB는 eruty_test로 분리하며 `npm run db:migrate:test`, `npm test`, `npm run test:integration`, `npm run test:e2e`를 실행한다. 정적 검증은 `npm run typecheck`, `npm run lint`, 빌드는 `npm run build`이다.

단위 38개 + 실제 PostgreSQL 통합 16개 + 브라우저 E2E 6개 (총 60개) 통과. 큰 원화의 정밀 합계, 미입력/0원, 입력·수정·정정·재조회, 일반 수정 시 실적 유지, 목표/예산 독립, VIEWER/외부 차단, DB CHECK, 수정 이력과 대시보드, 모바일 표시를 검증했다.

안내 문구와 캠페인 카드 배치를 보완한 뒤 관련 E2E 2개도 재통과했다. TypeScript·ESLint·운영 빌드가 통과했다. 운영 Supabase에 여덟 번째 마이그레이션을 적용하고 실제 eruty_app 역할로 세 실적의 저장/수정, 목표·예산 유지, 수정 이력·충돌 검사, 대시보드 합계도 확인했다. 직접 생성한 검증용 행만 정리하고 감사 기록 8개를 보존했다.

스크린샷: docs/screenshots/16-campaign-actuals-input.png, 17-campaign-actuals-mobile.png, 18-dashboard-actuals.png.
