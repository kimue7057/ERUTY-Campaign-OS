# Supabase / Vercel 배포

## 2026-10-20 Git 병합과 배포 경로 정리

사용자 요청에 따라 기존 누적 PR #6 → #5 → #4 → #3 → #2 → #1을 merge commit으로 순서대로 병합했다. 최종 PR #1의 파일 내용이 기존 운영 커밋 `2a56fca`와 동일함을 확인하고 최신 GitHub Actions 검증 성공 후 main에 반영했다. 기능별 중간 버전을 main에 먼저 반영하지 않았다.

main 커밋 `1a4154d`의 CI가 통과했고 Vercel Git 연동이 운영 배포 `dpl_Hn9QmmgYv1cavQ8uD3p9U8PMWwYa`를 생성해 READY가 되었다. 운영 도메인 `eruty-campaign-os.vercel.app`이 해당 배포에 연결된 것을 확인했다. 이제 main이 기존 운영 기능을 포함하며 신규 변경은 main 기준 PR에서 검증·병합한 후 Git 자동 배포한다. 이번 정리에 DB 변경은 없다. 아래의 10월 12일 설명은 최초 구축 당시의 기록이다.

사용자는 2026-10-12 신규 Supabase 및 Vercel 프로젝트 생성·배포를 요청했다. 프로젝트 이름은 `eruty-campaign-os`, 최초 관리자 이메일은 사용자에게 확인했다. 비밀번호·DB 연결 문자열·토큰은 저장소에 보관하지 않는다.

## 상태

Supabase `KIMUE_PRIVATE`의 `eruty-campaign-os` 프로젝트(서울, PostgreSQL 17.11)와 Vercel `eruty1/eruty-campaign-os` 프로젝트(서울 함수, Node 24)를 연결했다. 운영 DB에 Prisma 마이그레이션 5개를 적용했고 확인된 Supabase Auth 계정을 내부 ADMIN으로 등록했다. Vercel Production 배포와 HTTPS 검증을 완료했다. 운영 주소는 **https://eruty-campaign-os.vercel.app** 이다. 최초 관리자 로그인은 사용자가 직접 확인했고 Auth 기록도 확인했다. Node 메이저 자동 업그레이드를 막기 위해 package engines를 24.x로 고정한다.

Supabase 신규 생성 비용 확인 기능이 연결 서버에 없어, 사용자가 Pro 조직에서 별도로 신규 프로젝트를 만들었다. Vercel 플러그인의 팀 권한은 403이었으나 CLI 로그인 후 동일 팀 접근에 성공했다. 기존 외부 프로젝트는 수정하지 않았다.

## 연결 구조

- Next.js 15 / Node.js 24를 Vercel에서 실행한다. `vercel.json`의 `npm ci` → `postinstall` Prisma generate → `npm run build` 순서를 사용한다.
- 서버 Prisma는 Supabase transaction pooler(6543)의 DATABASE_URL을 사용한다. 인스턴스별 pool 최대 1개, idle timeout 10초다. Supabase 권장 session pooler(5432) 또는 직접 연결 DIRECT_URL은 관리 컴퓨터의 마이그레이션에만 사용한다. Supabase 루트 CA와 호스트명을 검증하며 TLS 인증서 검증을 끄지 않는다.
- Prisma migrate deploy는 검토한 운영 DB에 한 번 별도로 실행한다. Preview 빌드가 운영 DB를 변경하지 않도록 빌드 명령에 migrate deploy를 넣지 않는다. 기존 DB는 적용 전 테이블·마이그레이션 내역을 확인하며 reset/db push를 사용하지 않는다.
- 운영 DB에는 DEMO seed를 적용하지 않는다. 최초 로그인 시 브랜드·캠페인 목록이 비어 있는 것이 정상이다.
- 업무 데이터는 Next 서버의 인증·권한 검사를 통과해야 한다. Supabase Data API 직접 접근은 RLS + 브라우저 역할 권한 회수로 차단한다. `eruty_app`에만 허용 정책을 부여한다. AppUser는 SELECT만, AuditEvent는 SELECT/INSERT만, 업무 테이블은 DML만 허용한다. 이 역할은 BYPASSRLS/DDL/Auth 스키마 접근 권한을 갖지 않는다. `_prisma_migrations`는 RLS 정책 없이 내부 마이그레이션 소유자만 접근한다. 가능하면 신규 프로젝트 Data API도 비활성화한다.
- 로그인 세션은 서버 쿠키에서 갱신하며, `SUPABASE_URL`과 publishable key도 서버에서만 사용한다. service-role key는 앱에 필요하지 않다.

## Vercel Production 환경변수

| 변수 | 값 / 관리 방법 |
| --- | --- |
| DATABASE_URL | TLS를 사용하는 Supabase transaction pooler URL. sensitive로 등록 |
| DATABASE_CA_CERT | Supabase 루트 CA PEM 전체. pg URL 옵션을 제거한 후 명시적으로 CA/호스트를 검증 |
| SUPABASE_URL | 해당 프로젝트 API URL |
| SUPABASE_PUBLISHABLE_KEY | 활성 publishable key |
| AUTH_MODE | supabase |
| ALLOW_DEMO_AUTH | false |
| APP_BASE_URL | 실제 운영 HTTPS 주소. Origin 검증에 사용 |

DIRECT_URL, TEST_DATABASE_URL, AUTH_PROXY_SECRET, 로컬 DEMO 환경변수는 Vercel 운영에 복사하지 않는다. 별도 Preview DB가 없으면 Preview AUTH_MODE는 disabled로 유지한다. 운영과 같은 DB에 Preview 쓰기를 열지 않는다.

## 적용·검증 순서

1. 연결된 Supabase 조직을 사용자에게 확인하고 제공되는 비용을 확인한 후 신규 프로젝트를 만든다. 기본 지역은 서울(ap-northeast-2)을 사용한다.
2. 신규 DB가 비어 있는지 확인한다. 관리자용 session/direct 연결을 로컬 보안 환경에 주입하고 `npm run db:migrate`를 실행한다. 이번 적용에서는 eruty_migrator에 public 스키마 생성/소유 권한을 부여하고 실제 Prisma migrate deploy로 적용했다. 최초 CREATE SCHEMA 권한 오류는 DB CREATE 권한을 추가하고 실패 기록만 rolled-back 처리한 뒤 재실행했다. 앱 데이터는 존재하지 않았으며 reset/drop은 사용하지 않았다. 앱 runtime 역할은 업무 테이블 DML만 허용하며 Auth 스키마·DDL 접근을 부여하지 않는다.
3. Supabase 신규 가입을 차단하고 확인된 내부 계정을 등록한다. `scripts/register-supabase-user.ts`는 Auth UUID 확인과 AppUser 생성·감사 기록을 하나의 트랜잭션으로 처리한다. ADMIN 이외 계정의 캠페인 소속은 별도 관리한다.
4. Vercel 프로젝트를 Git 저장소에 연결하고 Node 24, 서울 함수 지역을 설정한다. Production 전용 환경변수 등록 후 검증한 커밋을 배포한다. APP_BASE_URL을 최종 운영 주소와 맞춘다.
5. 실제 HTTPS 주소에서 health 200, 로그인 화면, 미인증 업무 API 401, 로그인/로그아웃 및 권한, 브랜드·캠페인 생성/수정/조회, 별도 목표 필드, 감사 기록을 확인한다. Supabase Data API의 익명/인증 역할이 업무 테이블에 접근하지 못하는지도 확인한다.

## 로컬 검증 (2026-10-12)

- PostgreSQL 18.4 전용 테스트 DB와 Supabase PostgreSQL 17.11에 마이그레이션을 적용했다. 운영 Prisma status는 up to date다.
- 단위 30개 + 실제 PostgreSQL 통합 13개 + 기존 브라우저 E2E 3개 = 46개 통과. 타입 검사·린트·Vercel 프로덕션 빌드·npm audit(0건) 통과. 배포 코드 커밋 db61756의 GitHub CI 두 건도 모두 통과했다.
- 새 인증 테스트는 서버 검증 ID, 위조/만료 세션, 미등록·비활성·DEMO 계정 차단, DB 역할 사용, 쿠키 보안, Origin 검사, 미등록 로그인 후 세션 정리를 확인한다. RLS 테스트는 실제 PG 비소유자 역할에 DML 권한을 부여해도 조회/생성이 차단되는지 확인한다.
- 실제 운영 HTTPS 주소에서 로그인/health 200, 미로그인 캠페인·세션 API 401, 외부 Origin 로그인 403을 확인했다. 최초 관리자 실제 로그인은 사용자가 확인했고 Supabase Auth의 로그인 기록도 확인했다.
- 실제 Supabase transaction pooler와 eruty_app 역할로 서비스 계층의 브랜드→국가→캠페인→전략→활동→세부 작업 생성/수정/조회/삭제를 확인했다. 원화 계획 합계, 독립된 두 매출 목표, 활동 수와 날짜 기간이 정확했다. 검증용 데이터 6개는 삭제했고 감사 기록 14개는 유지했다. 이는 실제 DB 서비스 검증이며, 운영 브라우저 CRUD 자동 E2E와 구분한다.
- 실제 Supabase REST Data API에서 Brand/AppUser/Campaign/마이그레이션 테이블의 익명 조회가 권한 오류로 차단됐다. 앱 DB 역할은 AppUser 수정, AuditEvent 삭제, Auth 스키마 접근, DDL을 수행할 수 없다.
- Supabase 보안 점검의 `_prisma_migrations` 무정책 INFO는 의도된 기본 거부다. 감사 함수의 search_path WARN은 다섯 번째 마이그레이션으로 해소했다. 플랫폼의 유출 비밀번호 보호는 아직 꺼져 있으며 [Auth 설정](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)에서 활성화가 필요하다. 공개 가입 차단/Data API 비활성화 등 플랫폼 설정은 별도로 관리한다.

## 이후 배포

2026-10-20 기존 PR들을 main에 병합해 Git 자동 운영 배포를 확인했다. Git 연동의 Production Branch는 main이며, 이후 변경도 main 기준 PR의 CI 통과 후 병합한다. 별도 Preview DB가 없어 Preview는 업무 API가 차단된다.

`vercel --scope eruty1 deploy --prod`로 검증된 변경을 다시 배포할 수 있다. 마이그레이션은 먼저 관리용 DIRECT_URL과 CA 경로를 사용해 `npm run db:migrate`로 적용한다. 앱용 역할을 마이그레이션에 사용하거나 운영 DEMO seed를 실행하지 않는다.
- [데스크톱 로그인 화면](screenshots/08-supabase-login-desktop.png), [모바일 로그인 화면](screenshots/09-supabase-login-mobile.png). 390px 화면의 가로 넘침 없음.

```bash
npm run db:migrate:test
npm test
npm run test:integration
npm run test:e2e
npm run typecheck
npm run lint
npm run build
npm audit
```

공식 근거: [Supabase Prisma 연결](https://supabase.com/docs/guides/database/prisma), [서버 쿠키 인증](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Vercel 배포](https://vercel.com/docs/projects/deploy-from-cli).
