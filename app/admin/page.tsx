"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type User = { id: string; email: string; displayName: string; role: string; plan: string; vipExpiresAt: number | null; createdAt: number };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [activationUrl, setActivationUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = await response.json() as { users?: User[]; activationUrl?: string; error?: string };
    if (!response.ok) setError(data.error || "无权访问后台");
    else { setUsers(data.users || []); setActivationUrl(data.activationUrl || ""); }
  };
  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then((response) => response.json().then((data: { users?: User[]; activationUrl?: string; error?: string }) => ({ response, data })))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) setError(data.error || "无权访问后台");
        else { setUsers(data.users || []); setActivationUrl(data.activationUrl || ""); }
      })
      .catch(() => { if (active) setError("后台暂时不可用"); });
    return () => { active = false; };
  }, []);

  const saveAddress = async () => {
    setMessage(""); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ activationUrl }) });
    const data = await response.json() as { error?: string; activationUrl?: string };
    if (!response.ok) setError(data.error || "保存失败"); else { setActivationUrl(data.activationUrl || activationUrl); setMessage("开通地址已保存"); }
  };

  const changePlan = async (userId: string, plan: string) => {
    setMessage(""); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, plan }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error || "更新失败"); else { setMessage("用户 VIP 已更新"); await load(); }
  };

  return (
    <main className="admin-shell">
      <header className="topbar"><Link className="brand" href="/"><span className="brand-mark">L</span><span>VIP 管理后台</span></Link><Link className="admin-account-link" href="/account">账户</Link></header>
      <section className="admin-page">
        <div className="admin-heading"><small>ADMIN</small><h1>VIP 管理后台</h1><p>修改开通地址，并为注册用户开通或取消 VIP。</p></div>
        {error && <p className="admin-alert error">{error}</p>}{message && <p className="admin-alert">{message}</p>}
        {!error || users.length ? <>
          <section className="admin-card"><h2>开通地址</h2><div className="admin-address"><input type="url" value={activationUrl} onChange={(event) => setActivationUrl(event.target.value)} /><button type="button" onClick={saveAddress}>保存地址</button></div><p>三个套餐都会跳转到这个地址，并自动附加套餐和用户邮箱参数。</p></section>
          <section className="admin-card"><h2>用户管理</h2><div className="admin-table-wrap"><table><thead><tr><th>用户</th><th>当前权限</th><th>到期时间</th><th>开通套餐</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><span>{user.email}</span></td><td>{user.role === "admin" ? "管理员" : user.plan}</td><td>{user.plan === "lifetime" || user.role === "admin" ? "永久" : user.vipExpiresAt ? new Date(user.vipExpiresAt * 1000).toLocaleDateString() : "—"}</td><td>{user.role === "admin" ? "—" : <select value={user.plan} onChange={(event) => changePlan(user.id, event.target.value)}><option value="free">免费</option><option value="monthly">月度 $49</option><option value="annual">年度 $300</option><option value="lifetime">永久 $588</option></select>}</td></tr>)}</tbody></table></div></section>
        </> : null}
      </section>
    </main>
  );
}
