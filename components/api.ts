export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    cache: "no-store",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const body = await response.json();
  if (response.status === 401 && !path.startsWith("auth/"))
    window.location.replace("/login");
  if (!response.ok)
    throw new Error(body.error?.message ?? "요청을 처리할 수 없습니다.");
  return body.data as T;
}
