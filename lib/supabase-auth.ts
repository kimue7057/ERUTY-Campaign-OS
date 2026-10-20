import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensure } from "./errors";

// This client is used only in Route Handlers, where refreshed cookies are writable.
// Application data continues through Prisma and the existing membership checks.
export async function createAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  ensure(url && key, 503, "Supabase 로그인 설정을 완료해 주세요.");
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        for (const { name, value, options } of values)
          cookieStore.set(name, value, options);
      },
    },
  });
}

export async function supabaseSubject() {
  const client = await createAuthClient();
  // getUser verifies with the Auth server, including account/session revocation.
  const { data, error } = await client.auth.getUser();
  ensure(!error && data.user, 401, "로그인이 필요하거나 세션이 만료되었습니다.");
  return `supabase:${data.user.id}`;
}
