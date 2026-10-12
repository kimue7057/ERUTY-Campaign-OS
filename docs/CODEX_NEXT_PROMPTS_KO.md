# 2~5차 Codex 실행 지시 템플릿

각 단계는 직전 PR 병합 및 테스트 확인 후 별도로 실행합니다.

## PR 2 시작 프롬프트
`AGENTS.md`와 전체 구현 명세를 먼저 읽고, PR 1의 실제 DB/권한 구조를 확인하세요. `docs/IMPLEMENTATION_PHASES.md`의 **PR 2(활동 일정/간트/의존성/베이스라인)**만 구현하고 S1~S8을 검증하세요. FS predecessor with lag, cycle check, drag move, edge resize, current-vs-baseline, user-confirmed successor shift preview를 반드시 다루세요. silent successor auto-shift는 금지합니다. 화면 캡처와 테스트 결과를 포함한 PR을 올리세요.

## PR 3 시작 프롬프트
`AGENTS.md`, 원본 명세, 현재 스키마를 읽고 **PR 3(활동 예산/세부 작업 예산 배분)**만 구현하세요. activity budget lines의 합은 상위로 올라가지만 subtask allocations는 활동 예산의 분할일 뿐 상위에 추가하지 않습니다. common line은 캠페인에 한 번만 합산됩니다. B1/B2/B3/B10/B11(계획 영역) 테스트를 자동화하고 PR 제출하세요.

## PR 4 시작 프롬프트
현재 PR 1~3의 코드와 명세를 읽고 **PR 4(Commitment/Expense/Payment/Evidence)**만 구현하세요. 승인된 계약확약액/발생비용/지급액은 별도로 집계하며 linked amounts double-counting을 차단하세요. partial/reversal/audit, locked FX, restricted evidence, Korean CSV export를 구현하고 B4~B9/B11 검증 후 PR 제출하세요.

## PR 5 시작 프롬프트
현재 프로젝트 전체를 실제 실행하여 명세 S1~S8, B1~B11, Q1~Q5 검수표를 완성하고 CI/보안/접근성/반응형/한글 UI를 점검하세요. 테스트 통과 여부를 정직하게 보고하고 미완료 기능을 명시하세요. 직원별 업무 화면이나 판매채널 API 등 범위 외 기능은 추가하지 마세요. 최종 PR과 데모 접근 절차를 남기세요.
