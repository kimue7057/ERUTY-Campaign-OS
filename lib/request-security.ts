import { ensure } from "./errors";

export function requireSameOrigin(request: Request) {
  const configured = process.env.APP_BASE_URL;
  ensure(configured, 503, "운영 사이트 주소 설정을 완료해 주세요.");
  ensure(
    request.headers.get("origin") === new URL(configured).origin,
    403,
    "허용되지 않은 요청 출처입니다.",
  );
}

export function requireAuthOrigin(request: Request) {
  requireSameOrigin(request);
  ensure(
    request.headers.get("content-type")?.split(";")[0].trim() === "application/json",
    415,
    "JSON 형식으로 요청해 주세요.",
  );
}
