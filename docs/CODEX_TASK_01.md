# Codex 첫 실행 지시 — 그대로 붙여넣기

당신은 ERUTY Campaign OS의 개발 담당자입니다. 다음 작업만 수행하세요.

## 시작 전에
1. 루트 `AGENTS.md`, `README.md`, `docs/ERUTY_Campaign_Codex_Implementation_Spec.md`, `docs/IMPLEMENTATION_PHASES.md`, `docs/ARCHITECTURE_DECISIONS.md`를 **전부** 읽으세요.
2. 저장소의 실제 코드 상태를 조사하고, 이미 구현된 부분과 미구현 부분을 구별하세요. 현재 저장소는 최소 UI bootstrap이며 실제 데이터 저장, 인증, 정산, 간트 기능이 없을 수 있습니다.
3. 라이브러리/DB/인증 결정이 필요한 부분은 먼저 간결한 선택지와 추천을 보고하세요. 실제 비밀키, 서비스 계정, 실데이터는 임의로 만들거나 주장하지 마세요.

## 이번 작업 범위 — PR 1만
- `docs/IMPLEMENTATION_PHASES.md`의 **PR 1: 도메인 기반과 캠페인 골격**만 구현하세요.
- Next.js App Router + TypeScript + Tailwind 기반을 유지하세요. 서버 저장에는 PostgreSQL + Prisma를 사용할 수 있습니다. 필요한 스키마·마이그레이션·seed를 추가하고 사내 로그인/인가를 어떻게 적용할지 설계하세요. 비밀키 미제공 상황에서 가짜 인증을 운영 준비 상태로 제시하지 마세요.
- `Brand -> BrandCountry -> Campaign -> Strategy -> WorkItem(Activity -> optional Subtask)` CRUD, 기본 목록/상세 화면, 계획 시작·종료 및 상태, 예산 한도, 목표 순판매액과 목표 이루티 매출의 **분리 필드**를 구현하세요.
- 추후 일정/재무 확장에 필요한 키/소속 제약 및 기초 API 구조를 고려하되, PR 2~5 기능을 앞당겨 구현하지 마세요.
- 예시 데이터는 반드시 **DEMO** 배지를 붙이고 실제 성과로 보이게 하지 마세요.
- 사용자 UI 및 오류는 한국어로 작성하세요.
- 개인 직원별 '내 업무', 쇼핑몰 연동, AI, 블록체인은 절대 구현하지 마세요.

## 완료 시 필수 보고
- 구현 계획 및 실제 변경 파일
- 데이터 관계와 마이그레이션 실행 명령
- 사용자 화면 스크린샷 (가능한 경우)
- 실행한 `npm run typecheck`, 빌드, 테스트 결과와 실패 이유
- 이슈/한계 및 다음 PR 2 착수 조건
- 변경 사항은 리뷰 가능한 PR로 제출하세요. 명세 S1~S8 / B1~B11은 **최종 검수 목록**이므로 PR 1에 전부 구현했다고 주장하지 마세요.
