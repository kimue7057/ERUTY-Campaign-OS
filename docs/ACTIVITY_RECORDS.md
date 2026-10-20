# 활동 내용·업무일지·변경 이력

## 저장소 분석과 구현 순서

기존 Next.js 15 / React 19 / TypeScript / Prisma 7 / PostgreSQL 앱에는 활동명·기간·담당자·상태·예산과 WorkItem 감사 이벤트가 있었다. 활동 내용, 업무일지와 상세 조회 UI는 없었다. 기존 인증·캠페인 권한·금액 집계를 유지하며 nullable 내용 필드 → 업무일지 테이블·검증 → 권한/API → 상세 패널 → DB/E2E 검증 순서로 추가했다. 추가 라이브러리는 없다. 설치된 패키지 메타데이터에서 확인한 기존 MIT 라이선스 React/Next.js/Zod와 Apache-2.0 Prisma/Playwright 기반을 유지한다.

## 기능과 화면

- 개요·일정·예산 화면의 활동명을 누르면 오른쪽 상세 패널이 열린다. 상태·담당자·기간·예산과 활동 내용 / 업무일지 / 변경 이력 탭을 제공한다. 세부 작업도 같은 상세 패널을 사용할 수 있다.
- 활동 추가·수정 및 상세 패널에서 여러 줄의 활동 내용을 작성·수정한다. 기존 활동은 내용 미설정 상태를 보존하며 예전 API가 필드를 생략해도 기존 내용을 지우지 않는다.
- 업무일지는 최신 작성 순으로 쌓이며 작성자·작성 시각을 서버에서 저장한다. 본인이 작성한 일지만 수정할 수 있고 이전 내용은 변경 불가한 AuditEvent에 남는다. 조회 권한은 캠페인 권한을 따른다. VIEWER는 읽기만 가능하다.
- 상태·담당자·계획 기간·활동 예산·활동 내용의 변경 전후와 작성자·시각을 표시한다. 기존 감사 기록도 함께 읽는다. 일지 작성 자체가 일정·상태·예산을 변경하지 않는다.
- 일지와 변경 이력은 50개씩 이전 기록을 더 불러올 수 있다. 조회 위치가 다른 활동에 속하면 거절한다. 수정은 revision 기반 충돌 검사와 직렬화 트랜잭션을 사용한다.
- Escape로 닫기, 닫은 후 활동명으로 포커스 복귀, 탭의 좌우/Home/End 키 이동, 모바일 전체 폭 패널을 지원한다. 일반 텍스트로 표시해 HTML을 실행하지 않는다.

## 데이터와 API

WorkItem.description nullable TEXT (최대 10,000자).
WorkJournal: UUID id, workItemId, campaignId, authorId, body, revision, createdAt, updatedAt. 활동/캠페인 복합 FK와 작성자 FK, 본문 길이·버전 CHECK, 활동별 시간/ID 정렬 및 작성자 인덱스.

기존 마이그레이션을 수정하지 않고 Prisma migrate diff(이전/현재 datamodel)로 만든 additive 일곱 번째 마이그레이션을 migrate deploy로 적용한다. 새 테이블 RLS를 켜고 PUBLIC/anon/authenticated 접근을 차단한다. eruty_app은 SELECT/INSERT와 본문·버전·수정시각 UPDATE만 가지며 작성자·소속 수정과 DELETE는 허용하지 않는다. API는 작성자·작성시각 입력 위조와 캠페인 밖 접근을 차단한다.

기본 경로 `/api/campaigns/:campaignId/work-items/:workId`:

- GET: 활동 상세와 편집 가능 여부
- PATCH `/description`: description, revision
- GET/POST `/journals`: 일지 페이지 / body로 작성
- PATCH `/journals/:journalId`: body, revision으로 본인 기록 수정
- GET `/history`: 자동 변경 이력. `journalId` 쿼리로 해당 일지의 과거 내용을 조회
- 페이지 조회는 `cursor` 쿼리와 응답 `nextCursor`를 사용한다.

## 보존 규칙과 제한

업무일지 삭제 기능은 제공하지 않는다. 업무일지가 있는 활동은 내용·일정·상태 등을 계속 수정할 수 있으나 기록 보존을 위해 삭제할 수 없다. 이 제한은 API와 FK로 강제한다. 작성자와 편집 시각, 수정 전후 내용을 보존한다. 본문은 일반 텍스트 최대 10,000자이며 사진·파일 첨부는 이번 변경에 포함되지 않는다. 별도 개인 업무 화면, 쇼핑몰 API, AI는 구현하지 않는다.

## 실행·검증

`.env.example`을 복사해 DB/인증 설정 후 `npm ci`, `npm run db:migrate`, `npm run dev`. 테스트 DB는 이름이 eruty_test여야 하며 `npm run db:migrate:test`, `npm test`, `npm run test:integration`, `npm run test:e2e`로 검증한다. 정적 검증은 `npm run typecheck`, `npm run lint`, 운영 빌드는 `npm run build`이다.

단위 35개 + 실제 PostgreSQL 통합 15개 + 브라우저 E2E 5개 (총 55개) 통과. 내용 저장/보존, 작성자 위조·VIEWER/외부 접근 차단, 본인 일지 수정·충돌·과거 내용 보존, DB 소속 FK/RLS, 페이지 조회, 일지 있는 활동 삭제 차단, 상태·일정·예산의 변경 전후, 모바일·키보드를 확인했다. npm audit는 취약점 0건이다.

운영 Supabase에 일곱 번째 마이그레이션을 적용했다. 실제 eruty_app 서버 계정으로 내용·일지 작성/수정·조회와 과거 내용 보존을 확인했다. RLS 활성화 및 anon/authenticated 조회 권한 없음, 서버 역할의 일지 DELETE/작성자 변경 거절, 오래된 버전 수정·일지 있는 활동 삭제 차단도 검증했다. 직접 생성한 검증용 데이터만 정리하고 감사 이벤트 14개는 보존했다. TypeScript·ESLint·운영 빌드도 통과했다.

스크린샷: docs/screenshots/13-activity-content.png, 14-activity-journal.png, 15-activity-history-mobile.png.
