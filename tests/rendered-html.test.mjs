import assert from "node:assert/strict";
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

test("renders the login and VIP pricing page", async () => {
  const response = await render("/account");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /账户与 VIP/);
  assert.match(html, /月度 VIP/);
  assert.match(html, /年度 VIP/);
  assert.match(html, /永久 VIP/);
  assert.match(html, /49/);
  assert.match(html, /300/);
  assert.match(html, /588/);
});
