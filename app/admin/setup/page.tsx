"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function AdminSetupPage() {
  const [form, setForm] = useState({ displayName: "管理员", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError("");
    const token = new URLSearchParams(window.location.search).get("token") || "";
    const response = await fetch("/api/admin/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, token }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error || "初始化失败"); else window.location.href = "/admin";
    setSubmitting(false);
  };

  return <main className="account-shell"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">L</span><span>建立管理账户</span></Link></header><section className="setup-page"><form className="auth-card" onSubmit={submit}><h1>建立管理员</h1><p>此页面只能成功使用一次。</p><label><span>名称</span><input required value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label><span>管理员邮箱</span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label><span>管理员密码</span><input type="password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label>{error && <p className="form-error">{error}</p>}<button className="auth-submit" disabled={submitting}>{submitting ? "正在建立…" : "建立管理员"}</button></form></section></main>;
}
