# 내부 인증·권한 계약 (PR 1)

PR 1은 인증 프록시 계약을 제공한다. Supabase/Vercel 배포 준비 변경에서 `AUTH_MODE=supabase`를 추가했다. 실제 외부 연결 상태는 [배포 기록](DEPLOYMENT.md)을 확인한다. 인증 미설정 시 업무 API는 503, 세션 누락/만료/위조 시 401, 비활성·미등록 계정은 403으로 차단한다. UI HTML에는 저장된 업무 데이터가 없고, 데이터 요청은 모두 보호된 API를 통한다.

## Supabase 로그인

- `/login`에서 이메일·비밀번호로 로그인한다. 공개 가입·자동 관리자 승격은 제공하지 않는다. 운영에서는 Supabase 신규 가입을 비활성화한다.
- 로그인·로그아웃·세션 조회 및 업무 API Route Handler만 Supabase SSR 클라이언트를 사용한다. HttpOnly/Secure/SameSite=Lax 쿠키를 사용하며 브라우저에는 토큰을 반환하지 않는다. 데이터 없는 Server Component는 인증 쿠키를 쓰지 않으므로 세션 갱신 미들웨어는 필요하지 않다.
- 매 요청 `auth.getUser()`로 Auth 서버의 검증을 받고, `supabase:<Auth UUID>`와 일치하는 활성·비DEMO AppUser만 허용한다. 사용자 메타데이터/이메일/프록시 헤더로 역할을 부여하지 않는다. 기존 ADMIN 및 CampaignMember 검사는 그대로 적용한다.
- Auth 로그인 성공 후 내부 등록이 없으면 403을 반환하고 로컬 세션을 정리한다. 업무 데이터 요청에서 401이 오면 로그인 화면으로 이동한다.
- 쿠키 인증 쓰기 요청은 `APP_BASE_URL`과 일치하는 Origin이 필수다. 로그인·로그아웃은 JSON만 받는다. 모든 인증 API 응답은 `no-store`다.
- Supabase Auth에 확인된 계정을 만든 후 관리자가 `npx tsx scripts/register-supabase-user.ts --id AUTH_UUID --name 표시이름 --role ADMIN`으로 최초 계정을 등록한다. 관리자 연결 문자열은 DIRECT_URL로 별도 주입한다. 기존 계정/권한은 덮어쓰지 않는다. 일반 직원은 MEMBER로 등록하고 캠페인 소속을 별도로 설정한다.
- Supabase Data API의 브라우저 역할에는 업무 데이터 접근 정책이 없다. 9개 테이블의 RLS를 활성화하고 anon/authenticated 권한을 회수한다. 별도 eruty_app 서버 역할에만 허용 정책과 제한된 DML 권한을 부여한다. 플랫폼 Data API 비활성화 설정도 운영자가 별도로 관리한다.

## 운영 접속

1. 사내 SSO를 검증하는 인증 프록시를 애플리케이션 앞에 배치한다. 앱의 직접 외부 접근은 차단한다.
2. 프록시는 브라우저가 보낸 `x-eruty-assertion`을 제거한 후 새 JWT를 넣는다. 브라우저에 서명 비밀값/JWT를 노출하지 않는다. 쿠키 세션·로그인·로그아웃은 선택한 공급자/프록시가 관리한다.
3. 앱은 HS256 서명, issuer, audience, sub, exp, iat와 최대 발급 후 5분을 검증한다. 32자 이상의 `AUTH_PROXY_SECRET`은 보안 저장소로 관리하고 순환 정책을 운영 전에 정한다.
4. JWT `sub`에 대응하는 활성 `AppUser.authSubject`가 DB에 사전 등록되어야 한다. JWT의 이름/역할 클레임은 권한으로 신뢰하지 않고 DB 역할을 사용한다.
5. 관리자 ADMIN은 브랜드/국가 CRUD와 캠페인 생성이 가능하다. MEMBER는 `CampaignMember`에 등록된 캠페인만 조회한다. VIEWER는 읽기만, EDITOR는 해당 캠페인의 전략/활동/기본 정보만 수정·빈 캠페인 삭제할 수 있다. 브랜드·국가 편집은 ADMIN 전용이다. 미소속 캠페인은 404로 숨긴다.
6. 담당자는 활성 계정이어야 하며, 일반 직원은 해당 캠페인 구성원이어야 한다. 담당자 선택은 권한 부여 기능이 아니다. 캠페인 생성 시 관리자와 선택한 담당자를 EDITOR로 등록한다. 기존 캠페인의 소속 변경은 지원하지 않는다.
7. 계정/멤버십 관리는 PR 1에서 관리자용 DB 운영 절차로 수행한다. 관리 화면·사내 SSO 공급자 구현은 미포함이다. 운영 사용 전에 승인된 공급자, 계정 정책, 멤버십 관리, 프록시 경계와 키 보관을 확인해야 한다.

운영 환경은 `AUTH_MODE=proxy`, `ALLOW_DEMO_AUTH=false`, `NODE_ENV=production`을 사용한다. 앱 쓰기 API는 출처가 존재하는 경우 `APP_BASE_URL`과 일치해야 하며 JSON 입력만 허용한다. 실제 주소를 APP_BASE_URL에 명시한다. 스케줄/비용 증빙 다운로드 기능은 이번 PR에 없다.

## 개발 DEMO

`AUTH_MODE=demo`, `ALLOW_DEMO_AUTH=true`, `NODE_ENV!=production` 세 조건이 일치해야 한다. 서버에 등록된 `demo-admin` 계정으로만 동작하고 `isDemo=true` 브랜드/캠페인/계정만 허용한다. 입력한 새 캠페인도 서버가 DEMO로 표시한다. 운영 모드에서 이 우회는 강제로 비활성화되며 실데이터로 전환하는 API는 없다. 로컬 dev 서버는 127.0.0.1에만 바인딩한다.

`npm run db:local`은 로컬 개발용 PostgreSQL과 난수 비밀번호를 생성한다. 운영 계정·외부 서비스 자격 증명을 생성하지 않는다. 기존 `.env`가 있으면 덮어쓰지 않는다. DEMO seed는 운영에서 금지하고 재실행 시 기존 DEMO 편집을 덮어쓰지 않는다.
