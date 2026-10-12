# PR 1 구현 계획 및 저장소 조사

2026-10-12. 작업 디렉터리 하위 `ERUTY-Campaign-OS`가 실제 Git 루트이며 origin은 기존 설정된 `kimue7057/ERUTY-Campaign-OS`이다. 시작 시 원격/로컬 커밋은 없고 `.git`만 있었다. 제공된 Starter ZIP을 기존 파일 덮어쓰기 없이 복원하고 별도 초기 커밋으로 보존했다. AGENTS, README, 전체 명세, TASK_01, 구현 단계, ADR을 확인했다.

## 기존 상태

Next.js App Router / React / TypeScript / Tailwind 3 정적 한국어 화면, health API만 존재. DB, 인증, 저장 API, 실제 CRUD, 배포 환경 없음. 원격은 공개 저장소이므로 비밀값/실데이터/증빙은 포함하지 않는다. 예시는 전부 DEMO이다.

## 파일별 계획

- `prisma/schema.prisma`, `prisma/migrations`: Brand → BrandCountry → Campaign → Strategy → WorkItem, 2단계 작업 계층. PostgreSQL DATE와 BIGINT, 복합 FK 및 CHECK. User/CampaignMember와 최소 BudgetLine/AuditEvent 기반.
- `lib/validation.ts`, `lib/domain.ts`: 날짜/원화/계층 검증, 원화 문자열 직렬화, 서버 집계.
- `lib/auth.ts`, `lib/db.ts`, `lib/service.ts`: 검증된 프록시 JWT + 등록 계정/캠페인 역할, 서버 CRUD, 트랜잭션, 수정 버전 검사. 운영 인증 미설정 시 차단. 명시적 로컬 DEMO 예외만 제공.
- `app/api/[...segments]/route.ts`: 일관된 한국어 오류 및 CRUD 계약.
- `components/*`, `app/campaigns/*`, `app/brands/*`: 목록/생성/수정/개요, 활동/세부 작업, 일정·예산 후속 탭.
- `prisma/seed.ts`: 재실행 가능한 DEMO 전용 예시. 기존 실데이터 수정 금지.
- `tests/unit`, `tests/integration`, `tests/e2e`: 검증·집계, 실제 PostgreSQL CRUD/FK/계층/권한/수정충돌, 브라우저 생성·수정·조회·스크린샷.
- `README.md`, `docs/PR1_DELIVERY.md`, `docs/AUTH.md`: 실행/마이그레이션/인증 한계/검증 증빙.

## 의존성 선택

기존 Next.js 15 유지, 15.5.27 보안 패치 고정 (MIT). React 19.3.0 (MIT), Tailwind 3 (MIT), TypeScript 5.9 (Apache-2.0). Prisma client/CLI/pg adapter 7.10.0 (Apache-2.0), pg (MIT), Zod 4.6.6 (MIT), jose 6.2.12 (MIT). Vitest 5.0.3 (MIT), Playwright 1.64.0 (Apache-2.0), tsx (MIT). 개발 전용 embedded-postgres 18.4.0-beta.17 (MIT 래퍼, PostgreSQL License 바이너리)은 로컬 실 PostgreSQL 검증용이며 운영 DB 공급자가 아니다. npm lockfile과 audit로 정확한 해석 버전/취약점 확인.

공식 근거: [Next.js 보안 패치](https://nextjs.org/blog/september-2026-security-release), [Prisma PostgreSQL/driver](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql). 간트 라이브러리와 운영 인증/호스팅 공급자는 후속 결정.

## 실제 의존성 검증에 따른 조정

초기 audit에서 Tailwind 3과 기존 Next lint 플러그인의 glob 계열 취약점 및 Next/Prisma 하위 패키지 취약점을 확인했다. Tailwind 4.3.3, TypeScript/React hooks ESLint 규칙, 명시적 하위 패키지 overrides로 갱신했고 최종 audit는 0건이다. App Router/TypeScript/Tailwind/PostgreSQL/Prisma 스택은 유지한다. 자세한 고정 버전·라이선스·공식 근거는 `docs/DEPENDENCIES.md`에 기록했다. 네이티브 SWC가 Windows 정책으로 차단되어 공식 WASM compiler를 사용했고 보안 설정은 변경하지 않았다.

## 순서와 범위

1. 기초 모델/DB 제약 → 2. 서버 인증/검증/CRUD → 3. 한국어 화면 → 4. 마이그레이션/테스트/스크린샷 → 5. PR 제출.

활동 기본 계획 예산은 BudgetLine에 저장하고 캠페인 한도와 별도로 계산한다. 세부 작업 금액 배분, 간트 드래그, 의존성, baseline, 실제 비용/지급/증빙은 구현하지 않는다. 순판매액 목표와 이루티 매출 목표는 별개이며 실제 성과는 미연결로 표시한다. 개인 업무/쇼핑몰/AI 없음.
