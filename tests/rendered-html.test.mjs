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
  assert.match(html, /<title>LINE 卡片实验室/);
  assert.match(html, /样板列表/);
  assert.match(html, /登录 \/ 注册|>账户</);
  assert.match(html, /多頁訊息 1/);
  assert.equal((html.match(/class="template-card"/g) || []).length, 11);
});

test("hides VIP pricing before login", async () => {
  const response = await render("/account");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.doesNotMatch(html, /VIP ACCESS|账户与 VIP/);
  assert.doesNotMatch(html, /月度 VIP|年度 VIP|永久 VIP/);
  assert.doesNotMatch(html, />USD<|19\.9 USDT|89 USDT|299 USDT/);
});

test("supports username or email authentication and transaction hash submission", async () => {
  const source = await readFile(new URL("../app/account/page.tsx", import.meta.url), "utf8");
  assert.match(source, /用户名或邮箱/);
  assert.match(source, /交易哈希值/);
  assert.match(source, /我已充值/);
  assert.match(source, /USDT 充值二维码/);
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
  assert.match(html, /USDT 收款设置/);
  assert.match(html, /链网络/);
  assert.match(html, /充值记录/);
  assert.doesNotMatch(html, /跳转到这个地址/);
});
