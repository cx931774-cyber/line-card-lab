"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { ChangeEvent, useEffect, useState } from "react";

type User = { id: string; identifier: string; displayName: string; role: string; plan: string; vipExpiresAt: number | null; createdAt: number };
type Payment = { id: string; userId: string; identifier: string; displayName: string; plan: string; amountCents: number; transactionHash: string; status: string; createdAt: number };
type AdminPayload = { users?: User[]; payments?: Payment[]; usdtAddress?: string; usdtNetwork?: string; usdtLogoUrl?: string; error?: string };

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payment, setPayment] = useState({ usdtAddress: "", usdtNetwork: "", usdtLogoUrl: "" });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const response = await fetch("/api/admin", { cache: "no-store" });
    const data = await response.json() as AdminPayload;
    if (!response.ok) setError(data.error || "無權存取後台");
    else { setUsers(data.users || []); setPayments(data.payments || []); setPayment({ usdtAddress: data.usdtAddress || "", usdtNetwork: data.usdtNetwork || "", usdtLogoUrl: data.usdtLogoUrl || "" }); }
  };
  useEffect(() => {
    let active = true;
    fetch("/api/admin", { cache: "no-store" })
      .then((response) => response.json().then((data: AdminPayload) => ({ response, data })))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) setError(data.error || "無權存取後台");
        else { setUsers(data.users || []); setPayments(data.payments || []); setPayment({ usdtAddress: data.usdtAddress || "", usdtNetwork: data.usdtNetwork || "", usdtLogoUrl: data.usdtLogoUrl || "" }); }
      })
      .catch(() => { if (active) setError("後台暫時不可用"); });
    return () => { active = false; };
  }, []);

  const savePayment = async () => {
    setMessage(""); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payment) });
    const data = await response.json() as AdminPayload;
    if (!response.ok) setError(data.error || "儲存失敗"); else { setPayment((current) => ({ ...current, usdtAddress: data.usdtAddress || current.usdtAddress, usdtNetwork: data.usdtNetwork || current.usdtNetwork })); setMessage("USDT 充值資訊已儲存"); }
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
      if (!response.ok || !data.usdtLogoUrl) throw new Error(data.error || "上傳失敗");
      setPayment((current) => ({ ...current, usdtLogoUrl: data.usdtLogoUrl || "" }));
      setMessage("USDT 圖片已上傳並儲存");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "上傳失敗");
    } finally {
      setUploadingLogo(false);
    }
  };

  const changePlan = async (userId: string, plan: string) => {
    setMessage(""); setError("");
    const response = await fetch("/api/admin", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, plan }) });
    const data = await response.json() as { error?: string };
    if (!response.ok) setError(data.error || "更新失敗"); else { setMessage("使用者 VIP 已更新"); await load(); }
  };

  return (
    <main className="admin-shell">
      <header className="topbar"><a className="brand" href="/"><span className="brand-mark">L</span><span>VIP 管理後台</span></a><a className="admin-account-link" href="/account">帳戶</a></header>
      <section className="admin-page">
        <div className="admin-heading"><small>ADMIN</small><h1>VIP 管理後台</h1><p>設定 USDT 收款資訊，並為註冊使用者開通或取消 VIP。</p></div>
        {error && <p className="admin-alert error">{error}</p>}{message && <p className="admin-alert">{message}</p>}
        {!error || users.length ? <>
          <section className="admin-card"><h2>USDT 收款設定</h2><div className="admin-usdt-logo">{payment.usdtLogoUrl ? <img src={payment.usdtLogoUrl} alt="目前 USDT 圖片" /> : <div className="admin-logo-placeholder">USDT</div>}<div><strong>充值圖片</strong><span>支援 JPG、PNG、WebP，最大 2MB；充值時會完整顯示。</span><label className={uploadingLogo ? "upload-logo-button disabled" : "upload-logo-button"}><input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingLogo} onChange={uploadLogo} />{uploadingLogo ? "正在上傳…" : payment.usdtLogoUrl ? "更換圖片" : "上傳圖片"}</label></div></div><div className="admin-payment"><label><span>鏈網路</span><input type="text" placeholder="例如 TRC20" value={payment.usdtNetwork} onChange={(event) => setPayment({ ...payment, usdtNetwork: event.target.value })} /></label><label><span>USDT 收款地址</span><input type="text" autoComplete="off" value={payment.usdtAddress} onChange={(event) => setPayment({ ...payment, usdtAddress: event.target.value })} /></label><button type="button" onClick={savePayment}>儲存充值資訊</button></div><p>使用者選擇套餐後只會看到充值提示和複製按鈕，不會跳轉到其他網頁。</p></section>
          <section className="admin-card"><h2>充值記錄</h2>{payments.length ? <div className="admin-table-wrap"><table><thead><tr><th>使用者</th><th>套餐 / 金額</th><th>交易雜湊</th><th>提交時間</th></tr></thead><tbody>{payments.map((item) => <tr key={item.id}><td><strong>{item.displayName}</strong><span>{item.identifier}</span></td><td><strong>{item.plan}</strong><span>{(item.amountCents / 100).toFixed(2)} USDT</span></td><td><code className="payment-hash">{item.transactionHash}</code></td><td>{new Date(item.createdAt * 1000).toLocaleString()}</td></tr>)}</tbody></table></div> : <p>暫時沒有充值記錄。</p>}</section>
          <section className="admin-card"><h2>使用者管理</h2><div className="admin-table-wrap"><table><thead><tr><th>使用者</th><th>目前權限</th><th>到期時間</th><th>開通套餐</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.displayName}</strong><span>{user.identifier}</span></td><td>{user.role === "admin" ? "管理員" : user.plan}</td><td>{user.plan === "lifetime" || user.role === "admin" ? "永久" : user.vipExpiresAt ? new Date(user.vipExpiresAt * 1000).toLocaleDateString() : "—"}</td><td>{user.role === "admin" ? "—" : <select value={user.plan} onChange={(event) => changePlan(user.id, event.target.value)}><option value="free">免費</option><option value="monthly">月度 $19.9</option><option value="annual">年度 $89</option><option value="lifetime">永久 $299</option></select>}</td></tr>)}</tbody></table></div></section>
        </> : null}
      </section>
    </main>
  );
}
