import Link from "next/link";
const lines = [
  {name:"댓글·커뮤니티 운영",plan:"100만원"}, {name:"부스트 광고",plan:"250만원"},
  {name:"콘텐츠 시딩",plan:"150만원"}, {name:"인플루언서 후보 리스트",plan:"50만원"},
  {name:"협업 제안",plan:"100만원"}, {name:"계약·콘텐츠 제작",plan:"350만원"},
  {name:"상세페이지 제작",plan:"150만원"}, {name:"할인 프로모션",plan:"350만원"}
];
export default function BudgetPage() {
  return <div className="space-y-6">
    <div><Link href="/" className="text-sm text-blue-700 hover:underline">← 캠페인 홈</Link><p className="kicker mt-4">브랜드 A / 베트남 / 4분기 런칭 · DEMO</p><h1 className="heading">활동별 예산·비용 관리</h1><p className="mt-2 text-sm text-slate-600">아래는 가상 예산 예시입니다. 실제 비용, 계약, 지급, 증빙 데이터는 아직 저장되지 않습니다.</p></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="card"><p className="kicker">예산 한도</p><p className="mt-2 text-2xl font-bold">1,500만원</p></div><div className="card"><p className="kicker">활동 계획 예산</p><p className="mt-2 text-2xl font-bold">1,500만원</p></div><div className="card"><p className="kicker">하위 작업 예산</p><p className="mt-2 text-2xl font-bold">중복 합산 금지</p></div></div>
    <section className="card overflow-x-auto"><table className="w-full min-w-[430px] text-sm"><thead><tr className="border-b"><th className="py-2 text-left">실행 활동</th><th className="text-right">계획 예산</th></tr></thead><tbody>{lines.map(line=><tr key={line.name} className="border-b last:border-0"><td className="py-3">{line.name}</td><td className="text-right">{line.plan}</td></tr>)}</tbody></table></section>
  </div>;
}
