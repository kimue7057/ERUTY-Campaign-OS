import { expect, it } from "vitest";
import { descriptionSchema, journalSchema } from "../../lib/validation";
import { workChanges } from "../../lib/work-history";

it("업무일지의 공백·과도한 길이·작성자 위조와 활동 내용 길이를 차단한다", () => {
  expect(journalSchema.safeParse({ body: " \n " }).success).toBe(false);
  expect(journalSchema.safeParse({ body: "a".repeat(10001) }).success).toBe(false);
  expect(journalSchema.safeParse({ body: "일지", authorId: crypto.randomUUID() }).success).toBe(false);
  expect(journalSchema.safeParse({ body: "a\u0000b" }).success).toBe(false);
  expect(descriptionSchema.safeParse({ description: "a".repeat(10001), revision: 1 }).success).toBe(false);
  expect(descriptionSchema.parse({ description: null, revision: 1 }).description).toBeNull();
  expect(journalSchema.parse({ body: " 작업 완료\n다음: 검수 " }).body).toBe("작업 완료\n다음: 검수");
});
it("변경 전후의 날짜·상태·담당자·내용과 큰 예산을 정확히 표시한다", () => {
  const before = { status: "PLANNED", ownerId: "u", plannedEnd: "2026-10-14T00:00:00.000Z", description: null, budgetLines: [{ plannedAmountKrw: "9007199254740993" }] };
  const after = { ...before, status: "IN_PROGRESS", ownerId: null, plannedEnd: "2026-10-18T00:00:00.000Z", description: "발주 후 입고 검수", budgetLines: [{ plannedAmountKrw: "9007199254740994" }] };
  expect(workChanges(before, after, { u: "담당 직원" })).toEqual([
    { label: "활동 내용", before: "미설정", after: "발주 후 입고 검수" },
    { label: "상태", before: "예정", after: "진행 중" },
    { label: "담당자", before: "담당 직원", after: "미지정" },
    { label: "계획 종료일", before: "2026-10-14", after: "2026-10-18" },
    { label: "활동 계획 예산", before: "9,007,199,254,740,993원", after: "9,007,199,254,740,994원" },
  ]);
  expect(workChanges({ body: "이전" }, { body: "수정" })).toEqual([{ label: "업무일지 내용", before: "이전", after: "수정" }]);
});
