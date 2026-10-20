"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "./api";

export function AuthControls() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<{ name: string }>();
  useEffect(() => { api<{ name: string }>("auth/session").then(setUser).catch(() => setUser(undefined)); }, []);
  return <div className="auth-controls">
    {!user ? <Link href="/login">로그인</Link> : <><span>{user.name}</span>
    <button type="button" disabled={busy} onClick={async () => {
      setBusy(true);
      setError("");
      try { await api("auth/logout", "POST", {}); window.location.assign("/login"); }
      catch (error) { setError(error instanceof Error ? error.message : "로그아웃에 실패했습니다."); setBusy(false); }
    }}>{busy ? "로그아웃 중…" : "로그아웃"}</button></>}
    {error && <span role="alert">{error}</span>}
  </div>;
}
