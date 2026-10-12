# PR 1 인도 보고서

2026-10-12 / ERUTY Campaign OS — 도메인 기반과 캠페인 골격

## 구현 결과

- Brand → BrandCountry → Campaign → Strategy → WorkItem(ACTIVITY → 선택적 SUBTASK) CRUD와 한국어 목록/상세/입력 화면.
- 캠페인 계획 기간·상태·담당자·예산 한도·VAT 정책. 순판매액 목표와 이루티 매출 목표를 별도 BIGINT 필드로 저장.
- 활동/세부 작업 계획 시작·종료·상태·담당자. 독립 활동은 parent NULL이며 세부 작업 없이 동작. 세부 작업 완료가 상위 활동을 자동 완료하지 않음.
- 활동 기본 예산은 BudgetLine INITIAL에 저장. 캠페인 한도와 계획 합계는 독립. 세부 작업을 중복 합산하지 않음. 실제 비용/지급/매출은 미연결로 표시.
- PostgreSQL DATE/BIGINT, 복합 외래키, CHECK로 날짜 순서·소속·2단계 깊이·활동 예산 연결을 강제.
- 서버 JWT 검증 + 활성 내부 계정 + ADMIN/캠페인 EDITOR/VIEWER 권한. 인증 미설정·위조·미소속 접근 차단. 운영에서 DEMO 인증 금지.
- 쓰기 트랜잭션 + revision 충돌 검사 + append-only AuditEvent. 자식 있는 엔터티 삭제 차단. 승인 재무 기록은 이번 모델에 없음.
- 반복 실행 시 편집을 보존하는 DEMO seed. 예시 3개 전략/8개 활동/3개 세부 작업/15,000,000원 계획.

## 마이그레이션

1. `202610120001_foundation`: enum, 9개 도메인/권한/감사 테이블, 인덱스, 복합 FK.
2. `202610120002_invariants`: 날짜·금액·깊이·이름·국가 코드 제약, 감사 이벤트 변경/삭제 차단 트리거.

실제 PostgreSQL 18.4의 `eruty_demo`, `eruty_test` 두 DB에 적용했다. 기존 데이터를 reset/drop하지 않는다. Prisma Client는 생성물로 커밋하지 않으며 설치 시 생성한다. 날짜는 DATE이고 화면은 YYYY-MM-DD, 한국 날짜로 기한을 계산한다.

```bash
npm ci
# 터미널 1: 개발 전용 PostgreSQL 실행, .env가 없을 때만 로컬 설정 생성
npm run db:local
```

다른 터미널:

```bash
npm run db:generate
npm run db:migrate
npm run db:migrate:test
npm run db:seed
npm run dev
```

`http://127.0.0.1:3000`. Google Drive 가상 드라이브에서 node_modules 쓰기 오류가 발생해 로컬 NTFS 체크아웃에서 검증했다. 기존 PostgreSQL을 쓰면 `.env.example`에서 DB URL을 설정한다. 운영 연결은 아직 제공되지 않았으며 임의로 배포하지 않았다.

## 검증 결과

검증 환경: Windows, Node.js 24.19.0, PostgreSQL 18.4, Prisma 7.10.0, Next.js 15.5.27.

| 명령 | 결과 | 증빙 범위 |
|---|---|---|
| `npm run db:generate` | PASS | Prisma Client 생성 |
| `npm run db:migrate` | PASS | DEMO DB에 2개 마이그레이션 |
| `npm run db:migrate:test` | PASS | 전용 test DB에 동일 마이그레이션 |
| `npm run db:seed` | PASS | DEMO 예시 저장, 재실행 보존 |
| `npm run typecheck` | PASS | TypeScript |
| `npm run lint` | PASS | TypeScript/React hooks ESLint |
| `npm test` | PASS — 18개 | 날짜·원화·계층 입력, 집계, 한국 시간대, JWT 검증 |
| `npm run test:integration` | PASS — 11개 | 실제 PG CRUD/FK/CHECK, 역할, 수정 충돌/동시 쓰기, 실제 날짜 보존, 감사·삭제 |
| `npm run test:e2e` | PASS — 3개 | 생성/수정/조회/삭제, 브랜드/국가 CRUD, 한국어 검증 오류, 1440/390px, 7개 화면 캡처 |
| `npm run build` | PASS | 운영 최적화 빌드 (공식 SWC WASM fallback) |
| `npm audit` | PASS — 0건 | lockfile 포함 전체 의존성 |
| 운영 서버 smoke | PASS | health 200, 인증 미설정 업무 API 503; .env의 DEMO=true도 production에서 차단 |

`TEST_DATABASE_URL`은 `/eruty_test` 전용 DB만 허용한다. E2E는 3100 포트와 `.next-e2e`를 사용한다. 실패한 E2E의 라벨된 테스트 캠페인만 준비 단계에서 정리하며 seed 원본/실데이터는 수정하지 않는다. GitHub Actions workflow는 동일 명령을 순서대로 실행하며 원격 결과는 PR checks에서 별도 확인한다.

### 초기 실패와 수정

- 깨끗한 설치에서 ESLint 9 지원 종료 경고를 확인해, peer 호환성을 검증한 ESLint 10.12.0 / typescript-eslint 8.71.1 / React hooks 7.1.1로 갱신했다. ESLint 10으로 전체 소스 lint 통과. Node 최소 버전은 22.13으로 맞췄다.

- Linux CI의 첫 npm ci가 선택적 WASM 의존성 누락으로 실패해, node_modules가 없는 환경에서 잠금 파일을 다시 생성했다. Linux/x64 npm ci dry-run으로 잠금 파일 완전성을 확인하고 같은 PR의 Linux CI에서 설치·마이그레이션·타입·린트·32개 테스트·빌드·audit가 모두 통과했다. 깨끗한 Windows npm ci도 통과했다.

- Google Drive 파일 시스템에서 npm tar 쓰기 실패 → 로컬 체크아웃으로 검증 환경 이동.
- Windows Application Control이 native SWC를 차단 → 공식 WASM compiler 사용. 보안 정책 변경 없음.
- 원화 형식 검증 뒤 BigInt 변환에서 예외 → 형식/길이 검사를 먼저 적용해 소수·지수 입력도 한국어 검증 오류로 처리.
- Tailwind 자동 소스 검색이 테스트 추적 파일까지 감시 → app/components 명시적 소스만 검색해 재컴파일 반복과 임시 manifest 오류 해결.
- 폼 label의 옵션 텍스트와 Next route announcer로 테스트 선택자가 모호함 → label/control 구조 분리, 오류 영역 선택자 한정. 삭제 완료/새 목록 조회를 기다리고 각 확인 버튼에 고유 접근성 이름 부여.

## 화면 증빙

모두 PostgreSQL의 DEMO 데이터이며 실매출·비용·지급을 주장하지 않는다.

| 화면 | 스크린샷 |
|---|---|
| 캠페인 목록 1440px | [01](screenshots/01-campaign-list-desktop.png) |
| 개요/전략/활동/선택적 작업 | [02](screenshots/02-campaign-overview-desktop.png) |
| 현재 계획 일정 | [03](screenshots/03-schedule-foundation.png) |
| 활동 기본 예산 | [04](screenshots/04-budget-foundation.png) |
| 브랜드/국가 | [05](screenshots/05-brand-country.png) |
| 캠페인 생성 | [06](screenshots/06-create-campaign.png) |
| 모바일 390px/표 가로 스크롤 | [07](screenshots/07-campaign-overview-mobile.png) |

## 한계와 PR 2 착수 조건

- 실제 사내 SSO/프록시 공급자, 계정 정책, DB 호스팅과 배포 주소가 미선정이다. 운영 사용 전에 공급자 연결, 사전 계정/멤버십 관리, 키 보관/순환, 프록시 접근 경계를 확인해야 한다. 현재 설정이 없으면 차단한다.
- 간트 드래그/리사이즈, 선후행 의존성/영향 미리보기, 기준 일정, 실제 날짜 입력/정정 UI는 PR 2 범위. 이번 일정 탭은 저장된 현재 계획 목록이다.
- 세부 예산 항목/세부 작업 배분/공통비 편집은 PR 3, 계약/발생 비용/부분 지급/증빙/취소 원장은 PR 4 범위.
- 최종 명세 S1–S8, B1–B11, Q1–Q5 전체 통과를 주장하지 않는다. 날짜/선택적 작업/기본 예산과 정확한 저장·권한 검증의 토대만 확인했다. 드래그/재무 원장 E2E는 아직 없다.
- 간트 라이브러리의 라이선스·React 호환성·키보드 접근성을 검토하고, 일정 변경 영향 미리보기/동시 수정/불변 baseline 계약부터 PR 2에 착수한다.
- 이번 삭제는 자식 없는 기초 엔터티와 활동 기본 계획만 대상으로 한다. 후속 승인 재무 기록은 파괴적 삭제 대신 취소/정정 정책을 추가해야 한다.
- 현재 목록은 기본 데이터 규모를 위한 전체 조회다. 대량 캠페인 운용 전 페이지네이션/성능 검증을 후속 추가한다.

## 변경 파일

아래는 초기 Starter(main) 대비 전체 PR 변경 파일이다. 원본 명세/AGENTS는 보존했다.
- `.env.example`
- `.github/workflows/pr1.yml`
- `.gitignore`
- `app/api/[...segments]/route.ts`
- `app/api/health/route.ts`
- `app/brands/page.tsx`
- `app/campaigns/[id]/budget/page.tsx`
- `app/campaigns/[id]/page.tsx`
- `app/campaigns/[id]/schedule/page.tsx`
- `app/campaigns/demo/budget/page.tsx`
- `app/campaigns/demo/schedule/page.tsx`
- `app/campaigns/new/page.tsx`
- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `components/api.ts`
- `components/brand-manager.tsx`
- `components/campaign-detail.tsx`
- `components/campaign-fields.ts`
- `components/campaign-list.tsx`
- `components/entity-form.tsx`
- `components/new-campaign.tsx`
- `components/types.ts`
- `docs/API_PR1.md`
- `docs/AUTH.md`
- `docs/DEPENDENCIES.md`
- `docs/PR1_DELIVERY.md`
- `docs/PR1_IMPLEMENTATION_PLAN.md`
- `docs/screenshots/01-campaign-list-desktop.png`
- `docs/screenshots/02-campaign-overview-desktop.png`
- `docs/screenshots/03-schedule-foundation.png`
- `docs/screenshots/04-budget-foundation.png`
- `docs/screenshots/05-brand-country.png`
- `docs/screenshots/06-create-campaign.png`
- `docs/screenshots/07-campaign-overview-mobile.png`
- `eslint.config.mjs`
- `lib/auth.ts`
- `lib/db.ts`
- `lib/domain.ts`
- `lib/errors.ts`
- `lib/service.ts`
- `lib/validation.ts`
- `next-env.d.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `playwright.config.ts`
- `postcss.config.js`
- `prisma.config.ts`
- `prisma/migrations/202610120001_foundation/migration.sql`
- `prisma/migrations/202610120002_invariants/migration.sql`
- `prisma/migrations/migration_lock.toml`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `README.md`
- `scripts/local-postgres.ts`
- `scripts/migrate-test.ts`
- `tailwind.config.ts`
- `tests/e2e/campaign.spec.ts`
- `tests/e2e/setup.ts`
- `tests/integration/crud.test.ts`
- `tests/setup.ts`
- `tests/unit/domain.test.ts`
- `tsconfig.json`
- `vitest.config.mts`


