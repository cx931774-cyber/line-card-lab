"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { FormEvent, useEffect, useRef, useState } from "react";

type Account = {
  id: string;
  identifier: string;
  displayName: string;
  role: "user" | "admin";
  plan: "free" | "monthly" | "annual" | "lifetime";
  vipExpiresAt: number | null;
  vip: boolean;
};

const PLANS = [
  { id: "monthly", name: "月度 VIP", price: 19.9, unit: "/ 月", note: "开通后使用 30 天" },
  { id: "annual", name: "年度 VIP", price: 89, unit: "/ 年", note: "开通后使用 365 天" },
  { id: "lifetime", name: "永久 VIP", price: 299, unit: "一次付费", note: "永久使用全部功能" },
] as const;
type VipPlan = (typeof PLANS)[number];

export default function AccountPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [payment, setPayment] = useState({ usdtAddress: "", usdtNetwork: "", usdtLogoUrl: "" });
  const [selectedPlan, setSelectedPlan] = useState<VipPlan | null>(null);
  const [transactionHash, setTransactionHash] = useState("");
  const [rechargeSubmitting, setRechargeSubmitting] = useState(false);
  const [rechargeError, setRechargeError] = useState("");
  const [rechargeNotice, setRechargeNotice] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ identifier: "", password: "" });
  const closeRechargeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    const loadAccount = async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(`/api/auth/me?refresh=${Date.now()}`, { cache: "no-store" });
          if (!response.ok) throw new Error("account request failed");
          const data = await response.json() as { user: Account | null; usdtAddress: string; usdtNetwork: string; usdtLogoUrl: string };
          if (!active) return;
          setAccount(data.user);
          setPayment({ usdtAddress: data.usdtAddress || "", usdtNetwork: data.usdtNetwork || "", usdtLogoUrl: data.usdtLogoUrl || "" });
          setError("");
          setLoading(false);
          return;
        } catch {
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 700 * (attempt + 1)));
        }
      }
      if (active) { setError("账户服务暂时不可用"); setLoading(false); }
    };
    void loadAccount();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedPlan) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPlan(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    window.requestAnimationFrame(() => closeRechargeRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedPlan]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setError(data.error || "操作失败");
        return;
      }
      window.location.replace("/");
    } catch {
      setError("账户服务暂时不可用");
    } finally {
      setSubmitting(false);
    }
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAccount(null);
    setSelectedPlan(null);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(payment.usdtAddress);
      setCopyMessage("已复制");
    } catch {
      setCopyMessage("复制失败，请手动复制");
    }
  };

  const submitRecharge = async () => {
    if (!selectedPlan || !transactionHash.trim()) return;
    setRechargeSubmitting(true);
    setRechargeError("");
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan.id, transactionHash: transactionHash.trim() }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) {
        setRechargeError(data.error || "提交失败");
        return;
      }
      setSelectedPlan(null);
      setTransactionHash("");
      setRechargeNotice("充值信息已提交，等待管理员确认。");
    } catch {
      setRechargeError("提交失败，请稍后重试");
    } finally {
      setRechargeSubmitting(false);
    }
  };

  return (
    <main className="account-shell">
      <header className="topbar"><a className="brand" href="/"><span className="brand-mark">L</span><span>LINE 卡片实验室</span></a></header>
      <div className="account-return"><a href="/">← 返回样板列表</a></div>
      <section className="account-page">
        {!loading && account ? (
          <div className="account-status">
            <div><strong>{account.displayName}</strong><span>{account.identifier}</span></div>
            <div className={account.vip ? "vip-chip active" : "vip-chip"}>{account.vip ? `${account.plan.toUpperCase()} VIP` : "免费账户"}</div>
            {account.role === "admin" && <a href="/admin">进入后台</a>}
            <button type="button" onClick={logout}>退出登录</button>
          </div>
        ) : !loading ? (
          <form className="auth-card" onSubmit={submit}>
            <div className="auth-tabs"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>登录</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>注册</button></div>
            <label><span>用户名或邮箱</span><input type="text" required value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} autoComplete="username" placeholder="用户名或邮箱" /></label>
            <label><span>密码</span><input type="password" required minLength={8} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
            {error && <p className="form-error">{error} <a href="/account">重新载入</a></p>}
            <button className="auth-submit" type="submit" disabled={submitting}>{submitting ? "请稍候…" : mode === "login" ? "登录" : "注册账户"}</button>
          </form>
        ) : <div className="account-loading">正在读取账户…</div>}

        {rechargeNotice && <p className="recharge-success">{rechargeNotice}</p>}
        <div className="pricing-grid">
          {PLANS.map((plan) => (
            <article className={`price-card ${plan.id === "annual" ? "featured" : ""}`} key={plan.id}>
              <span>{plan.name}</span><h2><small>USD</small> ${plan.price}</h2><p>{plan.unit}</p><em>{plan.note}</em>
              {account?.vip ? <button type="button" disabled>已开通 VIP</button> : account ? <button type="button" onClick={() => { setSelectedPlan(plan); setCopyMessage(""); setTransactionHash(""); setRechargeError(""); setRechargeNotice(""); }}>查看充值信息</button> : <button type="button" onClick={() => setMode("login")}>登录后开通</button>}
            </article>
          ))}
        </div>
      </section>
      {account && !account.vip && selectedPlan && (
        <div className="recharge-modal-backdrop">
          <button className="recharge-backdrop-dismiss" type="button" tabIndex={-1} aria-label="关闭充值信息" onClick={() => setSelectedPlan(null)} />
          <section className="recharge-panel recharge-modal" role="dialog" aria-modal="true" aria-label="USDT 充值信息">
            <div className="recharge-heading"><div className="recharge-brand"><div><small>USDT PAYMENT</small><h2>{selectedPlan.name}</h2></div></div><button ref={closeRechargeRef} type="button" aria-label="关闭充值信息" onClick={() => setSelectedPlan(null)}>×</button></div>
            <p className="recharge-amount">应付金额 <strong>{selectedPlan.price} USDT</strong></p>
            {payment.usdtAddress ? <>
              {payment.usdtLogoUrl && <div className="recharge-qr"><img src={payment.usdtLogoUrl} alt="USDT 充值二维码" /><span>使用钱包扫描二维码</span></div>}
              <dl><div><dt>链网络</dt><dd>{payment.usdtNetwork}</dd></div><div><dt>USDT 收款地址</dt><dd><code>{payment.usdtAddress}</code></dd></div></dl>
              <label className="transaction-hash"><span>交易哈希值</span><input type="text" value={transactionHash} onChange={(event) => setTransactionHash(event.target.value)} placeholder="请输入转账交易哈希值" autoComplete="off" /></label>
              <div className="recharge-actions">
                <button className="copy-address" type="button" onClick={copyAddress}>{copyMessage || "复制充值地址"}</button>
                <button className="recharge-confirm" type="button" disabled={!transactionHash.trim() || rechargeSubmitting} onClick={submitRecharge}>{rechargeSubmitting ? "正在提交…" : "我已充值"}</button>
              </div>
              {rechargeError && <p className="recharge-submit-error">{rechargeError}</p>}
              <p className="recharge-note">请确认充值网络与上方一致。转错网络可能导致资产无法找回。</p>
            </> : <p className="recharge-unavailable">管理员尚未设置 USDT 充值地址。</p>}
          </section>
        </div>
      )}
    </main>
  );
}
