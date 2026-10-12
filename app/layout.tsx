import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "ERUTY Campaign OS", description: "이루티 내부 캠페인 운영 관리" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-slate-900">ERUTY <span className="font-medium text-blue-700">Campaign OS</span></Link>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">DEMO · 초기 화면 · 데이터 미연결</span>
      </div>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    <footer className="mx-auto max-w-6xl px-5 py-8 text-xs text-slate-500">내부용 시스템 초기 개발 기반 · 표시값은 예시이며 저장되지 않습니다.</footer>
  </body></html>;
}
