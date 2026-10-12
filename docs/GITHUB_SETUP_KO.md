# GitHub 신규 비공개 저장소 만들기 (사용자 단계)

현재 연동된 GitHub 작업 기능은 **신규 저장소 생성**을 지원하지 않아, 아래 1회 작업은 GitHub 웹에서 수행해야 합니다.

## 1. 비공개 저장소 생성
1. https://github.com/new 접속
2. Owner: 사용할 개인/조직 계정 선택
3. Repository name: `ERUTY-Campaign-OS`
4. Description: `Internal campaign scheduling and budget operations platform for ERUTY`
5. Visibility: **Private**
6. **Add README / .gitignore / license 자동 생성은 선택하지 않기** (업로드 번들과 충돌 예방)
7. `Create repository` 클릭

## 2. 이 초기 프로젝트 올리기
이 문서가 들어 있는 `ERUTY-Campaign-OS` 폴더에서 터미널(Windows PowerShell 가능)을 열고 아래를 실행합니다.

```bash
git init -b main
git add .
git commit -m "chore: bootstrap ERUTY Campaign OS and Codex specs"
git remote add origin https://github.com/kimue7057/ERUTY-Campaign-OS.git
git push -u origin main
```

연결된 GitHub 사용자 이름은 `kimue7057`로 확인되었습니다. 다른 GitHub 조직이나 소유자 계정 아래 저장소를 만든다면 위 URL의 `kimue7057`만 실제 Owner로 바꾸세요. Windows에 Git이 설치되지 않았다면 GitHub Desktop을 이용해 로컬 프로젝트를 게시할 수 있습니다. GitHub 인증 요청이 표시될 수 있습니다.

**주의**: ZIP 파일 자체를 하나의 파일로 업로드하면 Codex가 내부 소스를 일반 파일로 읽을 수 없습니다. ZIP을 풀어 그 안의 폴더/파일 구조를 저장소에 올려야 합니다.

## 3. Codex 연결
1. Codex에서 GitHub 접근을 연결/허용합니다.
2. `ERUTY-Campaign-OS` 저장소, 기본 `main` 브랜치를 선택합니다.
3. `docs/CODEX_TASK_01.md`의 전체 내용을 첫 작업 지시로 붙여넣습니다.
4. Codex의 변경 제안과 PR을 검토합니다. PR 1을 확인한 후 PR 2로 넘어갑니다.

## 비밀/재무 정보 주의
`.env`와 실제 수익금, 계약서, 증빙 파일은 Git에 커밋하지 않습니다. 인증/DB 연결 비밀키는 안전한 별도 Secret 관리에 저장합니다.
