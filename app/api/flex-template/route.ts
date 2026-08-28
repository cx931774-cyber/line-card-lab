const template = `<%
print(JSON.stringify(vcard.message))
%>`;

export async function GET() {
  return new Response(template, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
