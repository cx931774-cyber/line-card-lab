"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { ChangeEvent, useEffect, useState } from "react";

type User = { id: string; email: string; displayName: string; role: string; plan: string; vipExpiresAt: number | null; createdAt: number };
type AdminPayload = { users?: User[]; usdtAddress?: string; usdtNetwork?: string; usdtLogoUrl?: string; error?: string };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [payment, setPayment] = useState({ usdtAddress: "", usdtNetwork: "", usdtLogoUrl: "" });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = await response.json() as AdminPayload;
    if (!response.ok) setError(data.error || "无权访问后台");
    else { setUsers(data.users || []); setPayment({ usdtAddress: data.usdtAddress || "", usdtNetwork: data.usdtNetwork || "", usdtLogoUrl: data.usdtLogoUrl || "" }); }
  };
  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then((response) => response.json().then((data: AdminPayload) => ({ response, data })))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) setError(data.error || "无权访问后台");
        else { setUsers(data.users || []); setPayment({ usdtAddress: data.usdtAddress || "", usdtNetwork: data.usdtNetwork || "", usdtLogoUrl: data.usdtLogoUrl || "" }); }
      })
      .catch(() => { if (active) setError("后台暂时不可用"); });
    return () => { active = false; };
  }, []);

  const savePayment = async () => {
    setMessage(""); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment) });
    const data = await response.json() as AdminPayload;
    if (!response.ok) setError(data.error || "保存失败"); else { setPayment((current) => ({ ...current, usdtAddress: data.usdtAddress || current.usdtAddress, usdtNetwork: data.usdtNetwork || current.usdtNetwork })); setMessage("USDT 充值信息已保存"); }
  };

  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploadingLogo(true); setMessage(""); setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/usdt-logo", { method: "POST", body: formData });
      const data = await response.json() as AdminPayload;
      if (!response.ok || !data.usdtLogoUrl) throw new Error(data.error || "上传失败");
      setPayment((current) => ({ ...current, usdtLogoUrl: data.usdtLogoUrl || "" }));
      setMessage("USDT 图片已上传并保存");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上传失败");
    } finally {
      setUploadingLogo(false);
    }
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
          <section className="admin-card"><h2>USDT 收款设置</h2><div className="admin-usdt-logo">{payment.usdtLogoUrl ? <img src={payment.usdtLogoUrl} alt="当前 USDT 图片" /> : <div className="admin-logo-placeholder">USDT</div>}<div><strong>充值图片</strong><span>支持 JPG、PNG、WebP，最大 2MB；充值时会完整显示。</span><label className={uploadingLogo ? "upload-logo-button disabled" : "upload-logo-button"}><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingLogo} onChange={uploadLogo} />{uploadingLogo ? "正在上传…" : payment.usdtLogoUrl ? "更换图片" : "上传图片"}</label></div></div><div className="admin-payment"><label><span>链网络</span><input type="text" placeholder="例如 TRC20" value={payment.usdtNetwork} onChange={(event) => setPayment({ ...payment, usdtNetwork: event.target.value })} /></label><label><span>USDT 收款地址</span><input type="text" autoComplete="off" value={payment.usdtAddress} onChange={(event) => setPayment({ ...payment, usdtAddress: event.target.value })} /></label><button type="button" onClick={savePayment}>保存充值信息</button></div><p>用户选择套餐后只会看到充值提示和复制按钮，不会跳转到其他网页。</p></section>
          <section className="admin-card"><h2>用户管理</h2><div className="admin-table-wrap"><table><thead><tr><th>用户</th><th>当前权限</th><th>到期时间</th><th>开通套餐</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><span>{user.email}</span></td><td>{user.role === "admin" ? "管理员" : user.plan}</td><td>{user.plan === "lifetime" || user.role === "admin" ? "永久" : user.vipExpiresAt ? new Date(user.vipExpiresAt * 1000).toLocaleDateString() : "—"}</td><td>{user.role === "admin" ? "—" : <select value={user.plan} onChange={(event) => changePlan(user.id, event.target.value)}><option value="free">免费</option><option value="monthly">月度 $19.9</option><option value="annual">年度 $89</option><option value="lifetime">永久 $299</option></select>}</td></tr>)}</tbody></table></div></section>
        </> : null}
      </section>
    </main>
  );
}
