# ERUTY Campaign OS

이루티 내부 캠페인 운영 플랫폼의 신규 개발 저장소입니다.

> **프로젝트 상태: Bootstrap only / 개발 초기 기반**  
> 화면에는 예시 데이터만 표시되며, DB 저장·인증·간트 드래그·비용 원장 기능은 아직 구현되지 않았습니다.

## 이번 개발 범위

1. **활동 일정 관리**: 전략 > 활동 > 선택적 세부 작업, 간트차트, 드래그/리사이즈, 선행·후속 의존 관계, 일정 변경 영향 미리보기, Baseline 및 변경 이력
2. **활동별 예산·비용 관리**: 활동 예산 및 세부 작업 배정, 계약 확약액/발생 비용/실지급 구분, 증빙, 정산 내역과 원장, 자동 합계 및 변경 이력
3. 위 기능을 위한 최소 **브랜드 > 국가 > 캠페인 > 전략 > 활동 > 세부 작업** CRUD/요약

**제외:** 직원별 '내 업무' 화면, 쇼핑몰 API, AI 분석, 블록체인 정산, 전사 회계 및 급여 처리. 캠페인 목표 순판매액과 목표 이루티 매출은 *별개의 필드*로 유지하고 이번 차수에서 실제 판매 연동은 하지 않습니다.

## Codex 시작 순서

1. `AGENTS.md`를 읽습니다.
2. `docs/ERUTY_Campaign_Codex_Implementation_Spec.md` 전체를 읽습니다.
3. `docs/CODEX_TASK_01.md`의 첫 개발 지시를 수행합니다.
4. `docs/IMPLEMENTATION_PHASES.md`의 각 완료 기준을 통과하며 단계별 PR을 만듭니다.

## 임시 기술 기반

- Next.js App Router + TypeScript + Tailwind CSS (bootstrap)
- PostgreSQL + Prisma ORM (Codex가 1차 구현에서 추가)
- 간트 라이브러리 선정은 2차 PR에서 **라이선스, 의존성, 드래그 안정성, 접근성** 검토 후 결정
- 서버 API, 인증, RLS/권한 검사 및 보안 스토리지는 구현이 완료되기 전까지 미지원

## 로컬 시작

```bash
npm install
npm run dev
```

`http://localhost:3000`에 접속합니다. `npm run typecheck`로 TypeScript 검사를 실행할 수 있습니다.

## GitHub 업로드

`docs/GITHUB_SETUP_KO.md` 참고. 내부 자료가 포함될 수 있으므로 **Private** 저장소를 사용하세요.

## 사용 주의

표시되는 브랜드·캠페인·금액은 모두 **DEMO 데이터**입니다. 실제 이루티 매출이나 비용으로 취급하지 마세요. 실제 재무 데이터는 비공개 저장소/스토리지에서 권한 검증 후만 접근합니다.
