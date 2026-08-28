const ORIGINAL_FORMS = new Set([
  "chatgpt-1",
  "json5",
  "line-carousel-1",
  "psprint-592",
  "google-sheet",
  "csv",
  "facebook-post-link-1",
  "psprint-3949",
  "acnh-passport-1",
  "acnh-postcard-1",
  "chatbot-tw-1",
]);

const ORIGINAL_ROOT = "https://taichunmin.idv.tw/liff-businesscard/";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  if (!ORIGINAL_FORMS.has(slug)) return new Response("Not found", { status: 404 });

  const response = await fetch(`${ORIGINAL_ROOT}forms/${slug}.html`, {
    headers: { Accept: "text/html" },
  });
  if (!response.ok) return new Response("样板暂时无法载入", { status: 502 });

  let html = await response.text();
  html = html
    .replaceAll(`href="${ORIGINAL_ROOT}"`, 'href="/"')
    .replace(/link:"https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/[^\"]*"/g, 'link:"https://www.google.com"')
    .replace(/link:'https:\/\/taichunmin\.idv\.tw\/liff-businesscard\/[^']*'/g, "link:'https://www.google.com'");

  return new Response(html, {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
