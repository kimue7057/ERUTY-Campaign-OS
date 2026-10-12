import Link from "next/link";
export default function HomePage() {
  return <div className="space-y-6">
    <div className="space-y-2"><p className="kicker">ERUTY / INTERNAL CAMPAIGN OPERATIONS</p><h1 className="heading">캠페인 운영 대시보드</h1><p className="text-sm text-slate-600">현재는 기획/개발 착수를 위한 초기 화면입니다. 실제 캠페인과 재무 데이터는 연결되지 않았습니다.</p></div>
    <div className="grid gap-4 md:grid-cols-3">
      <div className="card"><p className="kicker">브랜드 구조</p><h2 className="mt-3 font-semibold">브랜드 → 국가 → 캠페인</h2><p className="mt-2 text-sm text-slate-600">관리 기본 계층</p></div>
      <div className="card"><p className="kicker">개발 우선순위 1</p><h2 className="mt-3 font-semibold">활동 일정 관리</h2><p className="mt-2 text-sm text-slate-600">간트·의존성·변경 이력</p></div>
      <div className="card"><p className="kicker">개발 우선순위 2</p><h2 className="mt-3 font-semibold">세부 예산·비용 관리</h2><p className="mt-2 text-sm text-slate-600">예산 배분·발생 비용·지급 추적</p></div>
    </div>
    <section className="space-y-3"><h2 className="text-lg font-bold">데모 캠페인</h2><div className="grid gap-3 md:grid-cols-2">
      <Link className="link-card" href="/campaigns/demo/schedule"><p className="kicker">화면 골격</p><h3 className="mt-2 font-bold">활동 일정 관리 →</h3><p className="mt-2 text-sm text-slate-600">간트 상세 기능은 Codex PR 2에서 구현합니다.</p></Link>
      <Link className="link-card" href="/campaigns/demo/budget"><p className="kicker">화면 골격</p><h3 className="mt-2 font-bold">예산·비용 관리 →</h3><p className="mt-2 text-sm text-slate-600">원장·지급 기능은 Codex PR 3~4에서 구현합니다.</p></Link>
    </div></section>
  </div>;
}
