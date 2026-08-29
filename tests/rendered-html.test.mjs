import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the public template catalog and account entry", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>LINE 卡片生成器/);
  assert.match(html, /樣板列表/);
  assert.match(html, /登入 \/ 註冊|>帳戶</);
  assert.match(html, /多頁訊息 1/);
  assert.equal((html.match(/class="template-card"/g) || []).length, 11);
});

test("hides VIP pricing before login", async () => {
  const response = await render("/account");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.doesNotMatch(html, /VIP ACCESS|帳戶與 VIP/);
  assert.doesNotMatch(html, /月度 VIP|年度 VIP|永久 VIP/);
  assert.doesNotMatch(html, />USD<|19\.9 USDT|89 USDT|299 USDT/);
});

test("supports username or email authentication and transaction hash submission", async () => {
  const source = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  assert.match(source, /使用者名稱或電子郵件/);
  assert.match(source, /交易雜湊值/);
  assert.match(source, /我已充值/);
  assert.match(source, /USDT 充值二維碼/);
});

test("uses optimized local catalog previews", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /\/templates\/custom-line-carousel\.webp/);
  assert.doesNotMatch(source, /preview: "https:\/\/i\.imgur\.com/);
  assert.match(source, /loading=\{index < 3 \? "eager" : "lazy"\}/);
});

test("bundles original templates instead of fetching them per visit", async () => {
  const source = await readFile(new URL("../app/original/[slug]/route.ts", import.meta.url), "utf8");
  assert.match(source, /ORIGINAL_HTML/);
  assert.doesNotMatch(source, /await fetch\(`\$\{ORIGINAL_ROOT\}forms/);
  assert.match(source, /\/original-assets\/common\.js/);
});

test("renders USDT payment settings in the admin shell", async () => {
  const response = await render("/admin");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /USDT 收款設定/);
  assert.match(html, /鏈網路/);
  assert.match(html, /充值記錄/);
  assert.doesNotMatch(html, /跳轉到這個地址/);
});
