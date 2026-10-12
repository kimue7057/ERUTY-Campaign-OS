# PR 1 의존성 검증

2026-10-12 npm registry와 공식 Next.js/Prisma 문서, `npm audit`를 확인했다. 최종 버전은 `package-lock.json`에 고정한다.

| 의존성 | 버전 | 라이선스 | 목적 |
|---|---|---|---|
| Next.js | 15.5.27 | MIT | 기존 App Router 유지, 15.5 보안 패치 |
| React / React DOM | 19.3.0 | MIT | 화면 |
| Tailwind / PostCSS adapter | 4.3.3 | MIT | 기존 Tailwind 스타일 시스템 유지 |
| TypeScript | 5.9.3 | Apache-2.0 | 정적 검사 |
| Prisma CLI / Client / PG adapter | 7.10.0 | Apache-2.0 | PostgreSQL 모델·마이그레이션·저장 |
| node-postgres | lockfile 참조 | MIT | PostgreSQL 드라이버 |
| Zod | 4.6.6 | MIT | 한국어 서버 검증 |
| jose | 6.2.12 | MIT | 인증 프록시 JWT 검증 |
| Vitest | 5.0.3 | MIT | 단위·DB 통합 테스트 |
| Playwright | 1.64.0 | Apache-2.0 | 브라우저 CRUD·스크린샷 |
| embedded-postgres | 18.4.0-beta.17 | MIT wrapper / PostgreSQL License | 개발 전용 실제 PostgreSQL |
| @next/swc-wasm-nodejs | 15.5.27 | Next.js MIT | Windows 정책으로 native compiler가 차단될 때 공식 WASM fallback |

초기 설치 audit는 15건(고위험 12, 중위험 3)이었다. Tailwind 3의 glob/braces 계열에 패치 버전이 없어 Tailwind 4와 PostCSS adapter로 갱신했다. ESLint는 TypeScript/React hooks 규칙을 사용하고 취약한 이전 Next lint 의존성을 제거했다. PostCSS 8.5.29, selector-parser 7.1.6, deepmerge-ts 8.0.2, mysql2 3.24.5를 overrides에 명시해 Next/Prisma의 하위 의존성을 패치했다. 최종 `npm audit`: 0건. Build/마이그레이션/테스트로 override 호환성을 확인한다.

확인 근거: [Next.js September 2026 Security Release](https://nextjs.org/blog/september-2026-security-release), [Prisma PostgreSQL](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/postgresql), [SWC 공식 오류 처리](https://nextjs.org/docs/messages/failed-loading-swc). 실제 실행 시 보안 정책을 변경하지 않았으며 WASM 대체 컴파일러로 검증했다.

운영 빌드는 일반 Node.js/npm 환경에서 native 또는 공식 WASM compiler를 사용한다. 이 실행 환경에는 npm PATH가 없었고 자동 다운로드가 생성한 빈 캐시가 남아, npm으로 설치한 공식 WASM 파일을 Next의 fallback 캐시에 복사했다. 이 로컬 캐시는 커밋하지 않는다. 배포 전에 공급망/라이선스 검토와 이후 보안 패치 업데이트를 유지한다.
