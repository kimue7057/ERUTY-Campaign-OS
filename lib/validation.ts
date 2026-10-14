import { z } from "zod";
z.config(z.locales.ko());

export const idSchema = z.uuid({ error: "올바른 식별자가 필요합니다." });
const name = z
  .string()
  .trim()
  .min(1, "이름을 입력해 주세요.")
  .max(120, "이름은 120자 이하여야 합니다.");
export const moneySchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/, "금액은 0 이상의 정수 원화로 입력해 주세요.")
  .refine(
    (v) => /^(0|[1-9]\d{0,18})$/.test(v) && BigInt(v) <= 9223372036854775807n,
    "저장 가능한 원화 범위를 초과했습니다.",
  );
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜는 YYYY-MM-DD 형식으로 입력해 주세요.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00.000Z`);
    return (
      Number.isFinite(d.getTime()) &&
      d.toISOString().slice(0, 10) === v &&
      v >= "1900-01-01" &&
      v <= "9999-12-31"
    );
  }, "존재하는 날짜를 입력해 주세요.");
const ownerId = idSchema.nullable();
const revision = z
  .number()
  .int()
  .positive("수정 버전이 필요합니다.")
  .optional();

export const brandSchema = z.object({ name, revision }).strict();
export const countrySchema = z
  .object({
    brandId: idSchema,
    countryCode: z
      .string()
      .regex(/^[A-Z]{2}$/, "국가 코드는 대문자 두 글자로 입력해 주세요."),
    countryName: name,
    revision,
  })
  .strict();
export const campaignSchema = z
  .object({
    brandCountryId: idSchema,
    name,
    ownerId,
    planStart: dateSchema,
    planEnd: dateSchema,
    status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"], {
      error: "올바른 캠페인 상태를 선택해 주세요.",
    }),
    budgetCeilingKrw: moneySchema,
    targetNetSalesKrw: moneySchema,
    targetErutyRevenueKrw: moneySchema,
    vatPolicy: z.enum(["INCLUDED", "EXCLUDED"], {
      error: "부가세 포함 여부를 선택해 주세요.",
    }),
    revision,
  })
  .strict()
  .refine((v) => v.planStart <= v.planEnd, {
    message: "계획 종료일은 시작일보다 빠를 수 없습니다.",
    path: ["planEnd"],
  });
export const strategySchema = z
  .object({ name, sortOrder: z.number().int().min(0).max(100000), revision,
    planStart: dateSchema.nullable().optional(),
    planEnd: dateSchema.nullable().optional(),
    budgetCeilingKrw: moneySchema.nullable().optional(),
  })
  .strict()
  .refine(v => (v.planStart === undefined) === (v.planEnd === undefined) && (v.planStart === null) === (v.planEnd === null), { message: "전략 시작일과 종료일을 함께 입력하거나 함께 비워 주세요.", path: ["planEnd"] })
  .refine(v => !v.planStart || !v.planEnd || v.planStart <= v.planEnd, { message: "전략 종료일은 시작일보다 빠를 수 없습니다.", path: ["planEnd"] });
export const workSchema = z
  .object({
    strategyId: idSchema,
    parentId: idSchema.nullable(),
    kind: z.enum(["ACTIVITY", "SUBTASK"], {
      error: "올바른 작업 유형을 선택해 주세요.",
    }),
    name,
    description: z.string().trim().max(10000, "활동 내용은 10,000자 이하여야 합니다.").refine(v => !v.includes("\u0000"), "사용할 수 없는 문자가 포함되어 있습니다.").nullable().optional(),
    ownerId,
    status: z.enum(["PLANNED", "IN_PROGRESS", "COMPLETED", "ON_HOLD"], {
      error: "올바른 활동 상태를 선택해 주세요.",
    }),
    plannedStart: dateSchema,
    plannedEnd: dateSchema,
    sortOrder: z.number().int().min(0).max(100000),
    plannedBudgetKrw: moneySchema.optional(),
    revision,
  })
  .strict()
  .refine((v) => v.plannedStart <= v.plannedEnd, {
    message: "계획 종료일은 시작일보다 빠를 수 없습니다.",
    path: ["plannedEnd"],
  })
  .refine(
    (v) => (v.kind === "ACTIVITY" ? v.parentId === null : v.parentId !== null),
    {
      message: "활동은 상위 작업이 없고, 세부 작업은 상위 활동이 필요합니다.",
      path: ["parentId"],
    },
  )
  .refine((v) => v.kind !== "SUBTASK" || v.plannedBudgetKrw === undefined, {
    message: "세부 작업 예산 배분은 후속 PR에서 지원합니다.",
    path: ["plannedBudgetKrw"],
  });

export const toDate = (v: string) => new Date(`${v}T00:00:00.000Z`);

export const descriptionSchema = z.object({
  description: z.string().trim().max(10000, "활동 내용은 10,000자 이하여야 합니다.").refine(v => !v.includes("\u0000"), "사용할 수 없는 문자가 포함되어 있습니다.").nullable(),
  revision: z.number().int().positive(),
}).strict();
export const journalSchema = z.object({
  body: z.string().trim().min(1, "업무일지 내용을 입력해 주세요.").max(10000, "업무일지는 10,000자 이하여야 합니다.").refine(v => !v.includes("\u0000"), "사용할 수 없는 문자가 포함되어 있습니다."),
  revision,
}).strict();
