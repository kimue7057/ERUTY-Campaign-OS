import type { Metadata } from "next";
import Link from "next/link";
import { AuthControls } from "@/components/auth-controls";
import "./globals.css";

export const metadata: Metadata = {
  title: "ERUTY Campaign OS",
  description: "이루티 내부 캠페인 운영 관리",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <a className="skip-link" href="#main">
          본문으로 건너뛰기
        </a>
        <aside className="sidebar">
          <Link href="/" className="logo">
            <span className="logo-symbol">E</span>
            <span>
              ERUTY<small>Campaign OS</small>
            </span>
          </Link>
          <p className="sidebar-label">운영 관리</p>
          <nav aria-label="주 메뉴">
            <Link href="/">
              <span aria-hidden="true">▦</span> 캠페인
            </Link>
            <Link href="/brands">
              <span aria-hidden="true">◇</span> 브랜드 · 국가
            </Link>
          </nav>
          <div className="sidebar-bottom">
            <span className="dot green" /> 내부 운영 시스템
            <p>
              계획에서 실행까지,
              <br />
              캠페인의 흐름을 한곳에.
            </p>
            <span className="version">일정 · 예산 계획</span>
          </div>
        </aside>
        <div className="app-shell">
          <header className="topbar">
            <span>이루티 캠페인 운영</span>
            {process.env.AUTH_MODE === "supabase" && <AuthControls />}
            <span className="topbar-note">
              {process.env.AUTH_MODE === "demo" &&
              process.env.ALLOW_DEMO_AUTH === "true" &&
              process.env.NODE_ENV !== "production"
                ? "DEMO · 로컬 예시 데이터"
                : "사내 인증 전용"}
            </span>
          </header>
          <main id="main">{children}</main>
          <footer>
            ERUTY Campaign OS · 계획 관리 기반 · 실제 매출·비용·지급 미연결
          </footer>
        </div>
      </body>
    </html>
  );
}
