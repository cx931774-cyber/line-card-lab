import { activationUrl, getSessionUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  return Response.json(
    {
      user,
      activationUrl: await activationUrl(),
      prices: { monthly: 49, annual: 300, lifetime: 588 },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
