type Snapshot = Record<string, unknown>;
const snapshot = (value: unknown): Snapshot => value && typeof value === "object" && !Array.isArray(value) ? value as Snapshot : {};
const text = (value: unknown) => value === null || value === undefined || value === "" ? "미설정" : String(value);
const statuses: Record<string, string> = { PLANNED: "예정", IN_PROGRESS: "진행 중", COMPLETED: "완료", ON_HOLD: "보류" };
function amount(value: unknown) {
  const lines = snapshot(value).budgetLines;
  if (!Array.isArray(lines)) return 0n;
  return lines.reduce((total, line) => {
    const raw = snapshot(line).plannedAmountKrw;
    return total + (typeof raw === "string" && /^\d+$/.test(raw) ? BigInt(raw) : 0n);
  }, 0n);
}
export function workChanges(beforeValue: unknown, afterValue: unknown, names: Record<string, string> = {}) {
  const before = snapshot(beforeValue), after = snapshot(afterValue);
  const changes: { label: string; before: string; after: string }[] = [];
  const fields = [
    ["name", "활동명"], ["description", "활동 내용"], ["status", "상태"],
    ["ownerId", "담당자"], ["plannedStart", "계획 시작일"], ["plannedEnd", "계획 종료일"],
    ["body", "업무일지 내용"],
  ];
  for (const [key, label] of fields) {
    if ((before[key] ?? null) === (after[key] ?? null)) continue;
    const format = (value: unknown) => key === "ownerId" ? value ? names[String(value)] ?? "이전 담당자" : "미지정"
      : key === "status" ? statuses[String(value)] ?? text(value)
      : key === "plannedStart" || key === "plannedEnd" ? typeof value === "string" ? value.slice(0, 10) : "미설정"
      : text(value);
    changes.push({ label, before: format(before[key]), after: format(after[key]) });
  }
  if (amount(beforeValue) !== amount(afterValue)) changes.push({
    label: "활동 계획 예산", before: `${amount(beforeValue).toLocaleString("ko-KR")}원`, after: `${amount(afterValue).toLocaleString("ko-KR")}원`,
  });
  return changes;
}
