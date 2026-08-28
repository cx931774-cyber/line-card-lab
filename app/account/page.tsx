"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

type Account = {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "admin";
  plan: "free" | "monthly" | "annual" | "lifetime";
  vipExpiresAt: number | null;
  vip: boolean;
};

const PLANS = [
  { id: "monthly", name: "月度 VIP", price: 49, unit: "/ 月", note: "开通后使用 30 天" },
  { id: "annual", name: "年度 VIP", price: 300, unit: "/ 年", note: "开通后使用 365 天" },
  { id: "lifetime", name: "永久 VIP", price: 588, unit: "一次付费", note: "永久使用全部功能" },
] as const;

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [activationUrl, setActivationUrl] = useState("https://www.google.com");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ displayName: "", email: "", password: "" });

  const returnTo = typeof window === "undefined" ? "/" : new URLSearchParams(window.location.search).get("returnTo") || "/";

  const refresh = async () => {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    const data = await response.json() as { user: Account | null; activationUrl: string };
    setAccount(data.user);
    setActivationUrl(data.activationUrl);
    setLoading(false);
    if (data.user && returnTo.startsWith("/") && !returnTo.startsWith("//") && returnTo !== "/") window.location.href = returnTo;
  };

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { user: Account | null; activationUrl: string }) => {
        if (!active) return;
        setAccount(data.user);
        setActivationUrl(data.activationUrl);
        setLoading(false);
        const destination = new URLSearchParams(window.location.search).get("returnTo") || "/";
        if (data.user && destination.startsWith("/") && !destination.startsWith("//") && destination !== "/") window.location.href = destination;
      })
      .catch(() => { if (active) { setError("账户服务暂时不可用"); setLoading(false); } });
    return () => { active = false; };
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error || "操作失败");
    else await refresh();
    setSubmitting(false);
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccount(null);
  };

  const checkoutUrl = (plan: string) => {
    try {
      const url = new URL(activationUrl);
      url.searchParams.set("plan", plan);
      if (account?.email) url.searchParams.set("email", account.email);
      return url.href;
    } catch { return activationUrl; }
  };

  return (
    <main className="account-shell">
      <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">L</span><span>LINE 卡片实验室</span></Link></header>
      <div className="account-return"><Link href="/">← 返回样板列表</Link></div>
      <section className="account-page">
        {!loading && account ? (
          <div className="account-status">
            <div><strong>{account.displayName}</strong><span>{account.email}</span></div>
            <div className={account.vip ? "vip-chip active" : "vip-chip"}>{account.vip ? `${account.plan.toUpperCase()} VIP` : "免费账户"}</div>
            {account.role === "admin" && <a href="/admin">进入后台</a>}
            <button type="button" onClick={logout}>退出登录</button>
          </div>
        ) : !loading ? (
          <form className="auth-card" onSubmit={submit}>
            <div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>注册</button></div>
            {mode === "register" && <label><span>名称</span><input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} autoComplete="name" /></label>}
            <label><span>邮箱</span><input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} autoComplete="email" /></label>
            <label><span>密码</span><input type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
            {error && <p className="form-error">{error}</p>}
            <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "请稍候…" : mode === "login" ? "登录" : "注册账户"}</button>
          </form>
        ) : <div className="account-loading">正在读取账户…</div>}

        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <article className={`price-card ${plan.id === "annual" ? "featured" : ""}`} key={plan.id}>
              <span>{plan.name}</span><h2><small>USD</small> ${plan.price}</h2><p>{plan.unit}</p><em>{plan.note}</em>
              {account?.vip ? <button type="button" disabled>已开通 VIP</button> : account ? <a href={checkoutUrl(plan.id)} target="_blank" rel="noreferrer">前往开通</a> : <button type="button" onClick={() => setMode("login")}>登录后开通</button>}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
