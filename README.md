# ERUTY Campaign OS — PR 1

브랜드 → 국가 운영 → 캠페인 → 전략 → 활동 → 선택적 세부 작업을 PostgreSQL에 저장하고 한국어 화면에서 관리합니다. **PR 1 도메인 기반만 구현**했습니다. 간트·의존성·baseline·세부 예산 배분·실제 비용/지급/증빙은 후속 PR 범위입니다. 직원 개인 업무, 쇼핑몰 API, AI 기능은 없습니다.

순판매액 목표와 이루티 매출 목표는 별개입니다. 캠페인 예산 한도와 활동 기본 계획 예산 합계도 독립적입니다. 실제 매출/발생 비용/지급액은 미연결로 표시합니다. DEMO 데이터는 실제 이루티 성과가 아닙니다.

## 준비

- Node.js 24.x (검증: 24.19), npm, Git
- PostgreSQL (검증: 실제 PostgreSQL 18.4)
- Google Drive 가상 드라이브는 node_modules 파일 쓰기 오류가 생길 수 있으므로 로컬 NTFS 디스크의 체크아웃에서 설치/빌드하세요.

```bash
npm ci
```

postinstall이 Prisma Client를 생성합니다. 별도 실행은 `npm run db:generate`. 설치 없이 DB 연결을 임의로 대체하지 않습니다.

## 로컬 DEMO 실행

터미널 1:

```bash
npm run db:local
```

개발 전용 PostgreSQL을 127.0.0.1:55432에 실행하고 `.local-postgres/`에 보존합니다. **.env가 없는 경우에만** 로컬 난수 비밀번호와 DEMO 설정을 포함한 `.env`를 생성합니다. 기존 `.env`를 덮어쓰지 않습니다. 외부 서비스 또는 운영 자격 증명이 아닙니다. 종료는 Ctrl+C. 이 터미널을 열어 두세요.

터미널 2:

```bash
npm run db:migrate
npm run db:migrate:test
npm run db:seed
npm run dev
```

[로컬 화면](http://127.0.0.1:3000) · [DEMO 캠페인](http://127.0.0.1:3000/campaigns/10000000-0000-4000-8000-000000000001)

예시는 전략 3개, 활동 8개, 선택적 세부 작업 3개, 계획 예산 15,000,000원입니다. seed 재실행은 기존 DEMO 편집을 덮어쓰지 않습니다. 운영 환경에서 seed/DEMO 인증은 차단합니다.

## 기존 PostgreSQL 사용

`.env.example`을 `.env`로 복사하고 자신의 DB URL과 인증 설정을 넣으세요. `DATABASE_URL`과 `TEST_DATABASE_URL`은 서로 다른 DB를 사용하며 테스트 URL은 `/eruty_test`로 끝나야 합니다. 실데이터 DB에서 테스트하지 마세요.

```bash
npm run db:generate
npm run db:migrate
npm run db:migrate:test
```

기존 스키마 충돌이 있으면 마이그레이션 전에 검토하세요. 명령은 reset/drop을 하지 않습니다. 운영에서는 migration 실행 권한과 앱 런타임 권한을 분리하고 백업 후 deploy합니다.

## 검증

```bash
npm run typecheck
npm run lint
npm test
npm run test:integration
npx playwright install chromium
npm run test:e2e
npm run build
npm audit
```

E2E는 전용 테스트 DB의 DEMO 데이터를 사용하고 3100 포트/별도 `.next-e2e` 출력 디렉터리로 서버를 실행합니다. 해당 포트가 비어 있어야 합니다. 스크린샷은 `docs/screenshots/`, HTML 보고서는 `playwright-report/`. `npm run build`와 E2E는 순서대로 실행하세요. 테스트/계정 역할/마이그레이션 증빙은 `docs/PR1_DELIVERY.md`를 참고하세요.

## 운영 인증

운영 주소: [ERUTY Campaign OS](https://eruty-campaign-os.vercel.app/login).

Supabase/Vercel 배포에서는 `AUTH_MODE=supabase`를 사용합니다. `/login`에서 로그인하며 사전 등록된 AppUser와 CampaignMember 역할이 필요합니다. 기존 `AUTH_MODE=proxy`도 유지합니다. 설정이 없으면 업무 API를 차단하며 개발 DEMO 인증은 production에서 강제로 차단됩니다. [배포 설정·현재 상태](docs/DEPLOYMENT.md)를 확인하세요.

```bash
npm run build
npm start -- --hostname 127.0.0.1
```

[인증 계약](docs/AUTH.md) · [API](docs/API_PR1.md) · [구현 계획](docs/PR1_IMPLEMENTATION_PLAN.md) · [의존성 검증](docs/DEPENDENCIES.md)

## 모델과 후속 확장

- Prisma `@db.Date`: YYYY-MM-DD 계획 날짜, 한국 기준 표시. 실제 날짜는 별도 필드로 유지하며 계획 편집으로 변경하지 않습니다.
- 원화 BIGINT/JSON 십진 문자열: JS Number로 반올림하지 않습니다. 부가세 포함/별도 정책은 필수입니다.
- 복합 FK + CHECK: 같은 캠페인/전략 소속, 2단계 작업 깊이, 활동에만 예산 연결, 날짜 순서, 음수 금액 차단.
- Serializable 쓰기 + revision 충돌 검사 + append-only AuditEvent: 변경과 감사 기록을 함께 저장합니다.
- 활동 예산은 BudgetLine INITIAL 항목에 보관합니다. 세부 작업 예산을 합산하지 않습니다. 공통비/배분 모델·편집은 PR 3에서 추가합니다.
- 삭제는 자식 없는 기초 데이터만 허용합니다. 승인된 재무 기록의 취소/정정은 후속 PR에 별도 구현합니다.

원래 기획/검수 명세 S1–S8/B1–B11/Q1–Q5는 전체 개발의 최종 기준입니다. 이번 PR에서 전부 구현/통과했다고 주장하지 않습니다. PR 2 착수 전에 인증 공급자/내부 계정 정책과 간트 라이브러리 라이선스·접근성·React 호환성을 확정하세요.

