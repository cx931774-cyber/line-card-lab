"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useState } from "react";

export default function AdminSetupPage() {
  const [form, setForm] = useState({ displayName: "管理員", identifier: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const response = await fetch("/api/admin/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, token }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error || "初始化失敗"); else window.location.href = "/admin";
    setSubmitting(false);
  };

  return <main className="account-shell"><header className="topbar"><a className="brand" href="/"><span className="brand-mark">L</span><span>建立管理帳戶</span></a></header><section className="setup-page"><form className="auth-card" onSubmit={submit}><h1>建立管理員</h1><p>此頁面只能成功使用一次。</p><label><span>名稱</span><input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label><span>管理員使用者名稱或電子郵件</span><input type="text" required value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} autoComplete="username" /></label><label><span>管理員密碼</span><input type="password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="auth-submit" disabled={submitting}>{submitting ? "正在建立…" : "建立管理員"}</button></form></section></main>;
}
