"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export function LoginForm({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel login-card">
      <p className="eyebrow">ERUTY CAMPAIGN OS</p>
      <h1>내부 계정 로그인</h1>
      <p className="muted">등록된 이루티 계정으로 캠페인을 관리하세요.</p>
      {!enabled && <p role="status">Supabase 로그인 연결을 준비하고 있습니다.</p>}
      <form onSubmit={async (event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        setBusy(true);
        setError("");
        try {
          await api("auth/login", "POST", { email: values.get("email"), password: values.get("password") });
          router.replace("/");
          router.refresh();
        } catch (error) { setError(error instanceof Error ? error.message : "로그인에 실패했습니다."); }
        finally { setBusy(false); }
      }}>
        <label>이메일<input name="email" type="email" autoComplete="username" required maxLength={254} disabled={busy || !enabled} /></label>
        <label>비밀번호<input name="password" type="password" autoComplete="current-password" required maxLength={1024} disabled={busy || !enabled} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={busy || !enabled}>{busy ? "로그인 중…" : "로그인"}</button>
      </form>
      <p className="muted">계정 등록·비밀번호 변경은 내부 관리자에게 요청해 주세요.</p>
    </section>
  );
}
