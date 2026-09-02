import { getSessionUser } from "../../lib/auth";
import { ORIGINAL_HTML } from "../templates";

const ORIGINAL_ROOT = "https://taichunmin.idv.tw/liff-businesscard/";

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const originalHtml = ORIGINAL_HTML[slug as keyof typeof ORIGINAL_HTML];
  if (!originalHtml) return new Response("Not found", { status: 404 });

  const account = await getSessionUser(request);
  if (!account) {
    const returnTo = encodeURIComponent(`/original/${slug}`);
    return Response.redirect(new URL(`/account?returnTo=${returnTo}`, request.url), 302);
  }

  const returnTo = `/account?returnTo=${encodeURIComponent(`/original/${slug}`)}`;
  const remaining = account.freeGenerationsRemaining ?? 0;
  let html = originalHtml.replace(
    /<a([^>]*):href="shortcut"([^>]*)>([\s\S]*?)<\/a>/i,
    (_match, before: string, after: string, content: string) => {
      const attributes = `${before}${after}`.replace(/\s*target="_blank"/gi, "");
      const label = account.vip ? content : content.replace("建立名片", `免費建立名片（剩餘 ${remaining} 次）`);
      return `<a${attributes} :href="shortcut" data-generation-trigger="true">${label}</a>`;
    },
  );

  const quotaScript = `<script>
  document.addEventListener("click", async function (event) {
    var trigger = event.target && event.target.closest ? event.target.closest("[data-generation-trigger]") : null;
    if (!trigger) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (trigger.dataset.generationBusy === "true") return;
    var target = trigger.href;
    if (!target) return;
    var popup = window.open("about:blank", "_blank");
    if (popup) popup.opener = null;
    trigger.dataset.generationBusy = "true";
    trigger.classList.add("disabled");
    try {
      var response = await fetch("/api/generations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: ${JSON.stringify(slug)} })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.error || "生成失敗");
      if (popup) popup.location.replace(target); else window.location.href = target;
      if (!data.unlimited && typeof data.remaining === "number") {
        trigger.innerHTML = trigger.innerHTML.replace(/免費建立名片（剩餘 \\d+ 次）/, "免費建立名片（剩餘 " + data.remaining + " 次）");
      }
    } catch (error) {
      if (popup) popup.close();
      var result = await Swal.fire({
        icon: "warning",
        title: "無法生成卡片",
        text: error && error.message ? error.message : "請稍後重試",
        showCancelButton: true,
        confirmButtonText: "開通 VIP",
        cancelButtonText: "返回編輯"
      });
      if (result.value) window.location.href = ${JSON.stringify(returnTo)};
    } finally {
      trigger.dataset.generationBusy = "false";
      trigger.classList.remove("disabled");
    }
  }, true);
  </script>`;
  html = html
    .replace(/<script src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?[^"]*" async><\/script><script>[\s\S]*?<\/script>/i, '<script>window.gtag={event(){}}</script>')
    .replace(/https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/js\/common\.js\?cachebust=\d+/g, "/original-assets/common.js")
    .replaceAll(`href="${ORIGINAL_ROOT}"`, 'href="/"')
    .replace(/<button[^>]*navbar-toggler[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/link:"https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/[^"]*"/g, 'link:"https://www.google.com"')
    .replace(/link:'https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/[^']*'/g, "link:'https://www.google.com'")
    .replace("</head>", '<style>nav.navbar{background:#343a40!important}.catalog-return-wrap{max-width:1140px;margin:16px auto 0;padding:0 15px}.catalog-return-link{display:inline-block;border:1px solid #ced4da;border-radius:999px;padding:8px 13px;color:#68716d;text-decoration:none;font-size:13px;font-weight:700}.catalog-return-link:hover{color:#343a40;text-decoration:none}</style></head>')
    .replace("</nav>", '</nav><div class="catalog-return-wrap"><a class="catalog-return-link" href="/">← 返回樣板列表</a></div>')
    .replace("</body>", `${quotaScript}</body>`);

  return new Response(html, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
