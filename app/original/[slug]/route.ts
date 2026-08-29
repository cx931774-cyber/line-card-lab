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

  let html = originalHtml;
  if (!account?.vip) {
    const upgradeHref = `/account?returnTo=${encodeURIComponent(`/original/${slug}`)}`;
    html = html.replace(
      /<a([^>]*):href="shortcut"([^>]*)>([\s\S]*?)<\/a>/i,
      (_match, before: string, after: string, content: string) => {
        const attributes = `${before}${after}`.replace(/\s*target="_blank"/gi, "");
        return `<a${attributes} href="${upgradeHref}">${content.replace("建立名片", "开通 VIP 后分享")}</a>`;
      },
    );
  }
  html = html
    .replace(/<script src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?[^"]*" async><\/script><script>[\s\S]*?<\/script>/i, '<script>window.gtag={event(){}}</script>')
    .replace(/https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/js\/common\.js\?cachebust=\d+/g, "/original-assets/common.js")
    .replaceAll(`href="${ORIGINAL_ROOT}"`, 'href="/"')
    .replace(/<button[^>]*navbar-toggler[^>]*>[\s\S]*?<\/button>/gi, "")
    .replace(/link:"https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/[^"]*"/g, 'link:"https://www.google.com"')
    .replace(/link:'https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/[^']*'/g, "link:'https://www.google.com'")
    .replace("</head>", '<style>nav.navbar{background:#343a40!important}.catalog-return-wrap{max-width:1140px;margin:16px auto 0;padding:0 15px}.catalog-return-link{display:inline-block;border:1px solid #ced4da;border-radius:999px;padding:8px 13px;color:#68716d;text-decoration:none;font-size:13px;font-weight:700}.catalog-return-link:hover{color:#343a40;text-decoration:none}</style></head>')
    .replace("</nav>", '</nav><div class="catalog-return-wrap"><a class="catalog-return-link" href="/">← 返回样板列表</a></div>');

  return new Response(html, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
