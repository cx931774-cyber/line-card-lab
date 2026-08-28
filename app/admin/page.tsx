"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";

type User = { id: string; email: string; displayName: string; role: string; plan: string; vipExpiresAt: number | null; createdAt: number };
type AdminPayload = { users?: User[]; usdtAddress?: string; usdtNetwork?: string; error?: string };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [payment, setPayment] = useState({ usdtAddress: "", usdtNetwork: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = await response.json() as AdminPayload;
    if (!response.ok) setError(data.error || "无权访问后台");
    else { setUsers(data.users || []); setPayment({ usdtAddress: data.usdtAddress || "", usdtNetwork: data.usdtNetwork || "" }); }
  };
  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then((response) => response.json().then((data: AdminPayload) => ({ response, data })))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) setError(data.error || "无权访问后台");
        else { setUsers(data.users || []); setPayment({ usdtAddress: data.usdtAddress || "", usdtNetwork: data.usdtNetwork || "" }); }
      })
      .catch(() => { if (active) setError("后台暂时不可用"); });
    return () => { active = false; };
  }, []);

  const savePayment = async () => {
    setMessage(""); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment) });
    const data = await response.json() as AdminPayload;
    if (!response.ok) setError(data.error || "保存失败"); else { setPayment({ usdtAddress: data.usdtAddress || payment.usdtAddress, usdtNetwork: data.usdtNetwork || payment.usdtNetwork }); setMessage("USDT 充值信息已保存"); }
  };

  const changePlan = async (userId: string, plan: string) => {
    setMessage(""); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, plan }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error || "更新失败"); else { setMessage("用户 VIP 已更新"); await load(); }
  };

  return (
    <main className="admin-shell">
      <header className="topbar"><a className="brand" href="/"><span className="brand-mark">L</span><span>VIP 管理后台</span></a><a className="admin-account-link" href="/account">账户</a></header>
      <section className="admin-page">
        <div className="admin-heading"><small>ADMIN</small><h1>VIP 管理后台</h1><p>设置 USDT 收款信息，并为注册用户开通或取消 VIP。</p></div>
        {error && <p className="admin-alert error">{error}</p>}{message && <p className="admin-alert">{message}</p>}
        {!error || users.length ? <>
          <section className="admin-card"><h2>USDT 收款设置</h2><div className="admin-payment"><label><span>链网络</span><input type="text" placeholder="例如 TRC20" value={payment.usdtNetwork} onChange={(event) => setPayment({ ...payment, usdtNetwork: event.target.value })} /></label><label><span>USDT 收款地址</span><input type="text" autoComplete="off" value={payment.usdtAddress} onChange={(event) => setPayment({ ...payment, usdtAddress: event.target.value })} /></label><button type="button" onClick={savePayment}>保存充值信息</button></div><p>用户选择套餐后只会看到充值提示和复制按钮，不会跳转到其他网页。</p></section>
          <section className="admin-card"><h2>用户管理</h2><div className="admin-table-wrap"><table><thead><tr><th>用户</th><th>当前权限</th><th>到期时间</th><th>开通套餐</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><span>{user.email}</span></td><td>{user.role === "admin" ? "管理员" : user.plan}</td><td>{user.plan === "lifetime" || user.role === "admin" ? "永久" : user.vipExpiresAt ? new Date(user.vipExpiresAt * 1000).toLocaleDateString() : "—"}</td><td>{user.role === "admin" ? "—" : <select value={user.plan} onChange={(event) => changePlan(user.id, event.target.value)}><option value="free">免费</option><option value="monthly">月度 $49</option><option value="annual">年度 $300</option><option value="lifetime">永久 $588</option></select>}</td></tr>)}</tbody></table></div></section>
        </> : null}
      </section>
    </main>
  );
}
