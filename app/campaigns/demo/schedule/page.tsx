import Link from "next/link";
const activities = [
  {group:"인플루언서 확보",name:"후보 리스트 확보",date:"10/16 ~ 10/31",status:"완료"},
  {group:"인플루언서 확보",name:"협업 제안 및 협의",date:"11/01 ~ 11/15",status:"진행 중"},
  {group:"인플루언서 확보",name:"계약·콘텐츠 제작",date:"11/05 ~ 12/15",status:"진행 중"},
  {group:"바이럴 확산",name:"댓글·커뮤니티 운영",date:"10/15 ~ 11/05",status:"진행 중"},
  {group:"바이럴 확산",name:"부스트 광고",date:"10/20 ~ 11/30",status:"진행 중"},
];
export default function SchedulePage() {
  return <div className="space-y-6">
    <div><Link href="/" className="text-sm text-blue-700 hover:underline">← 캠페인 홈</Link><p className="kicker mt-4">브랜드 A / 베트남 / 4분기 런칭 · DEMO</p><h1 className="heading">활동 일정 관리</h1><p className="mt-2 text-sm text-slate-600">드래그 가능한 간트, 의존성 미리보기, 베이스라인 기능은 개발 예정입니다. 아래는 단순 목록 시안입니다.</p></div>
    <section className="card overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="py-3">전략</th><th>활동</th><th>예정 기간</th><th>상태</th></tr></thead><tbody>{activities.map(a=><tr className="border-b last:border-0" key={a.name}><td className="py-3">{a.group}</td><td className="font-semibold">{a.name}</td><td>{a.date}</td><td>{a.status}</td></tr>)}</tbody></table></section>
  </div>;
}
